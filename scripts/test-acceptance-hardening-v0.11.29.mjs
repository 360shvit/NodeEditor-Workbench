import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const native = read('src-tauri/src/main.rs');
const appSource = read('src/App.tsx');
const persistenceSource = read('src/projects/projectPersistence.ts');
const bridge = read('src/io/desktopBridge.ts');
const runtime = read('tauri-ui/tauri-runtime.js');
const embedded = read('tauri-ui/app.js');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(read('BUILD_ID.txt').trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);
assert.match(appSource, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(embedded, /exports\.RELEASE_MILESTONE = 'v[^']+'/);
assert.match(embedded, /exports\.RELEASE_MILESTONE_NAME = '[^']+'/);

// JSON-path identity: no dot-joined identity remains in the known identity/deduplication surfaces.
const pathIdentityFiles = [
  'src/core/changeSet.ts', 'src/core/parser.ts', 'src/core/refactor.ts', 'src/core/search.ts',
  'src/core/matches.ts', 'src/core/semanticReferences.ts', 'src/features/inspector/queryTabs.ts',
  'src/features/inspector/visibility.ts', 'src/components/NodeCard.tsx', 'src/components/FieldMatchesDrawer.tsx', 'src/store.ts',
];
for (const file of pathIdentityFiles) {
  assert.doesNotMatch(read(file), /jsonPath\.join\(['"]\.['"]\)/, `${file} must not use dot-joined JSON paths as identity`);
}
assert.match(read('src/core/jsonPath.ts'), /return JSON\.stringify\(path\)/);

// Transaction hardening: rollback errors are surfaced, recovery metadata is retained on rollback failure,
// and metadata cleanup preserves committed state by deleting journal before commit marker.
const rollbackStart = native.indexOf('fn rollback_prepared(');
const rollbackEnd = native.indexOf('\n#[tauri::command]\nfn apply_project_files', rollbackStart);
const rollbackBlock = native.slice(rollbackStart, rollbackEnd);
assert.match(rollbackBlock, /-> Result<\(\), String>/);
assert.doesNotMatch(rollbackBlock, /let _ = fs::(?:remove_file|rename)/);
assert.match(rollbackBlock, /Automatic rollback was incomplete/);
assert.match(rollbackBlock, /Recovery journal and backups were retained/);
assert.doesNotMatch(native, /rollback_apply_failure\(&app, &prepared\[\.\.=index\]/, 'commit failure must roll back all staged temps, including not-yet-committed files');
const clearStart = native.indexOf('fn clear_recovery_journal(');
const clearEnd = native.indexOf('\nfn recovery_target', clearStart);
const clearBlock = native.slice(clearStart, clearEnd);
assert.ok(clearBlock.indexOf('recovery_journal_path') < clearBlock.indexOf('recovery_commit_path'), 'journal cleanup must precede commit-marker cleanup');
assert.match(native, /Cannot clear stale Apply commit marker/);
assert.match(native, /serde_json::from_str::<serde_json::Value>\(&file\.text\)/);

// Watcher generation guard prevents an older async rescan from applying after a newer one.
assert.match(appSource, /watcherReloadGeneration/);
assert.match(appSource, /watcherReloadGeneration\.current !== reloadGeneration/);
assert.match(appSource, /watcherReloadGeneration\.current \+= 1/);

// Persisted state is sanitized before restoration.
assert.match(persistenceSource, /function cleanInspectorFilters/);
assert.match(persistenceSource, /function cleanVisualLayoutSettings/);
assert.match(persistenceSource, /filters: cleanInspectorFilters\(value\.filters\)/);
assert.match(persistenceSource, /visualSettings: cleanVisualLayoutSettings\(value\.visualSettings\)/);
assert.match(persistenceSource, /cleanNavigationLocation/);

// WorldGen folder selection no longer stops after a fixed entry count and native authority is revocable.
assert.doesNotMatch(native, /MAX_FOLDER_ENTRIES/);
assert.match(native, /fn revoke_worldgen_log/);
assert.match(native, /worldgen_logs[\s\S]*?\.clear\(\)/);
assert.match(bridge, /desktopRevokeWorldgenLog/);
assert.match(runtime, /\/api\/worldgen\/log\/revoke/);
assert.match(runtime, /invoke\('revoke_worldgen_log'/);
assert.match(appSource, /desktopRevokeWorldgenLog\(previous\)/);

// Current diagnostics/acceptance metadata.
const diagnostics = read('src/support/runtimeDiagnostics.ts');
assert.match(diagnostics, /milestone: RELEASE_MILESTONE/);
assert.match(diagnostics, /profile: RELEASE_VALIDATION_PROFILE/);

// Packaged-runtime behavioral checks: structural path identity and corrupt persistence recovery.
const context = vm.createContext({
  console,
  globalThis: undefined,
  Promise, Set, Map, WeakMap, Object, Array, String, Number, Boolean, Symbol, Error, TypeError, Date, Math, JSON,
  TextEncoder, TextDecoder, Blob, URL, URLSearchParams, DOMException,
  performance: { now: () => 0 },
  MessageChannel: class { constructor() { this.port1 = { onmessage: null }; this.port2 = { postMessage: () => {} }; } },
  setTimeout, clearTimeout,
});
context.globalThis = context;
for (const name of ['amd-loader.js', 'preact-lite.js', 'compat-modules.js', 'app.js']) {
  vm.runInContext(read(`tauri-ui/${name}`), context, { filename: name });
}
const storage = new Map();
context.window = context;
context.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

const core = context.require('core/index');
assert.notEqual(core.jsonPathKey(['a.b', 'Value']), core.jsonPathKey(['a', 'b', 'Value']));
assert.notEqual(core.jsonPathKey(['items', '0']), core.jsonPathKey(['items', 0]));
let changes = core.emptyChangeSet();
changes = core.stageFieldChange(changes, {
  fileId: 'file:path', filePath: 'Path.json', nodeId: 'node:path', field: 'Value', jsonPath: ['a.b', 'Value'],
  oldValue: 1, newValue: 2, location: 'live',
});
changes = core.stageFieldChange(changes, {
  fileId: 'file:path', filePath: 'Path.json', nodeId: 'node:path', field: 'Value', jsonPath: ['a', 'b', 'Value'],
  oldValue: 3, newValue: 4, location: 'live',
});
assert.equal(changes.changes.length, 2);
assert.equal(new Set(changes.changes.map((change) => change.id)).size, 2);
const project = core.buildProject([{
  path: 'PathIdentity.json',
  text: JSON.stringify({ 'a.b': { Type: 'Constant', Inputs: [], Value: 1 }, a: { b: { Type: 'Constant', Inputs: [], Value: 2 } } }),
}]);
assert.equal(project.files[0].nodes.length, 2);
assert.equal(new Set(project.files[0].nodes.map((node) => node.id)).size, 2);

const persistence = context.require('projects/projectPersistence');
const root = 'C:/AcceptanceProject';
const key = `hytale-workbench.project-session.v1:${encodeURIComponent(root)}`;
storage.set(key, JSON.stringify({
  version: 1,
  openFilePaths: ['A.json', 9],
  explorerWorkspace: 'all',
  explorerFolderState: { good: true, bad: 'yes' },
  filters: { imports: 'bad', exports: false, seeds: 1, valueFields: 'bad', allValues: true, live: null, floating: true, hideEmpty: false, workspace: 42 },
  recentlyClosedFilePaths: [],
  navigationPast: [{ filePath: 'A.json', nodeId: 42, location: 'wrong' }, { nope: true }],
  navigationFuture: [],
  visualSelectedFilePaths: [],
  visualSettings: { strategy: 'danger', spacingPreset: 'huge', horizontalGap: -5, verticalGap: 'NaN', alignmentTolerance: Infinity, dagBranchDirection: 'sideways', includeLive: 'yes', includeFloating: true, respectAuthorSections: false, floaterMode: 'explode' },
}));
const session = persistence.readProjectSession(root);
assert.ok(session);
assert.deepEqual([...session.openFilePaths], ['A.json']);
assert.equal(session.explorerFolderState.good, true);
assert.equal('bad' in session.explorerFolderState, false);
assert.equal(session.filters.imports, true);
assert.equal(session.filters.exports, false);
assert.deepEqual([...session.filters.valueFields], []);
assert.equal(session.filters.workspace, 'all');
assert.equal(session.visualSettings.strategy, 'author-normalize');
assert.equal(session.visualSettings.horizontalGap, 10);
assert.equal(session.visualSettings.verticalGap, 10);
assert.equal(session.visualSettings.dagBranchDirection, 'auto');
assert.equal(session.visualSettings.includeFloating, true);
assert.equal(session.visualSettings.respectAuthorSections, false);
assert.equal(session.navigationPast.length, 1);
assert.equal(session.navigationPast[0].nodeId, undefined);
assert.equal(session.navigationPast[0].location, undefined);

console.log('v0.11.29 acceptance-hardening contract: PASS');
