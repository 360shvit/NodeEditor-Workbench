import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(file, 'utf8');
const hashFile = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const cargo = read('src-tauri/Cargo.toml');
const app = read('src/App.tsx');
const store = read('src/store.ts');
const tabs = read('src/components/FileTabs.tsx');
const inspector = read('src/features/inspector/InspectorPane.tsx');
const drawer = read('src/components/WorkbenchDrawer.tsx');
const splitter = read('src/components/WorkbenchSplitter.tsx');
const prefs = read('src/workbench/workbenchLayoutPreferences.ts');
const settings = read('src/components/WorkbenchSettings.tsx');
const runtime = read('src/support/runtimeDiagnostics.ts');
const persistence = read('src/projects/projectPersistence.ts');
const embedded = read('tauri-ui/app.js');
const embeddedStyles = read('tauri-ui/styles.css');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(cargo, new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.')}"`, 'm'));
assert.match(read('BUILD_ID.txt'), /v0\.11\.[0-9]+-r[0-9]+-[a-z0-9-]+/);
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.match(runtime, /REPORT_SCHEMA_VERSION = 8/);
assert.match(pkg.scripts['test:split-workview'], /test-split-workview-v0\.11\.15\.mjs/);

// Explicit two-pane ownership with the legacy activeTabId retained as the active-pane alias.
for (const marker of ['activePane', 'paneActiveTabIds', 'splitViewEnabled', 'setActivePane', 'setSplitViewEnabled', 'activateTabInPane']) {
  assert.match(store, new RegExp(marker));
}
assert.match(store, /selectTab: \(tabId, paneId\)/);
assert.match(tabs, /paneActiveTabIds\[paneId\]/);
assert.match(tabs, /selectTab\(tab\.id, paneId\)/);
assert.match(inspector, /InspectorPane\(\{ paneId \}/);
assert.match(inspector, /data-workbench-drawer-host=\{paneId\}/);
assert.match(inspector, /activePane !== paneId \|\| !focusedNode/);
assert.match(drawer, /data-workbench-drawer-host="\$\{paneId\}"/);

// One global tab object pool plus pane-local reference arrays; ProjectSession schema remains untouched.
assert.match(store, /paneTabIds: WorkbenchPaneTabs/);
assert.doesNotMatch(store, /primaryTabs: WorkbenchTab|secondaryTabs: WorkbenchTab|tabsByPane/);
assert.doesNotMatch(persistence, /activePane|paneActiveTabIds|splitViewEnabled|splitRatio/);
assert.match(persistence, /version: 1/);
assert.equal(hashFile('src/projects/projectPersistence.ts'), '497c6791bfc3eadc6b664db607f6664235aecf8b25bf5b4985063c46f1b2ed0b');

// Split mode is transient, ratio is a global migrated Workbench preference.
assert.match(prefs, /hytale-workbench\.layout\.v2/);
assert.match(prefs, /hytale-workbench\.layout\.v1/);
assert.match(prefs, /WORKBENCH_LAYOUT_VERSION = 2/);
assert.match(prefs, /WORKBENCH_SPLIT_DEFAULT_RATIO = 0\.5/);
assert.match(prefs, /WORKBENCH_SPLIT_MIN_RATIO = 0\.25/);
assert.match(prefs, /WORKBENCH_SPLIT_MAX_RATIO = 0\.75/);
assert.match(prefs, /v0\.11\.14 migration/);
assert.match(app, /Resize split Workview/);
assert.match(app, /lastInteractedPaneRef/);
assert.match(app, /setSplitViewEnabled\(next, next \? undefined : collapseFromPane\)/);
assert.match(store, /collapseFromPane \?\? state\.activePane/);
assert.match(app, /pointerValue=/);
assert.match(app, /workbench\.layout\.split-ratio\.persist/);
assert.match(app, /workbench\.split\.enabled/);
assert.doesNotMatch(splitter, /localStorage|persistWorkbenchLayoutPreferences/);
assert.match(splitter, /setPointerCapture/);
assert.match(splitter, /releasePointerCapture/);
assert.match(splitter, /ArrowLeft/);
assert.match(splitter, /ArrowRight/);
assert.match(splitter, /Home/);
assert.match(splitter, /End/);
assert.match(settings, />Reset<\/button>/);
assert.doesNotMatch(settings, /Reset to 292 px/);

// Layout/diagnostic contract.
assert.match(app, /workview-host/);
assert.match(app, /data-workbench-pane="primary"/);
assert.match(app, /data-workbench-pane="secondary"/);
assert.match(embeddedStyles, /workview-host\.split/);
assert.match(embeddedStyles, /workbench-pane\.active/);
assert.match(runtime, /splitRatio: number/);
assert.match(runtime, /splitViewEnabled: boolean/);
assert.match(runtime, /workbenchLayout: workbenchLayoutSupport/);

// Frozen architecture/security systems stay outside this build.
assert.match(read('src/commands/commandRegistry.ts'), /WORKBENCH_COMMANDS/);
assert.match(read('src/commands/commandRegistry.ts'), /commandForKeyboardEvent/);
assert.match(read('src/features/project-graph/ProjectGraphView.tsx'), /project-graph-svg/);
assert.match(read('src/features/project-graph/ProjectGraphView.tsx'), /ProjectGraphWorkbenchTab/);
const nativeMain = read('src-tauri/src/main.rs');
assert.match(nativeMain, /metadata_is_reparse_point/);
assert.match(nativeMain, /pending_change_count/);
assert.equal(hashFile('src-tauri/capabilities/default.json'), '5042c8d799a75be8248b9877ea2c59aabca2c6fccaed0082c2cdd438c6e345a4');


// Packaged runtime state behavior: v0.11.15's max-two-pane shell remains, with v0.11.21 pane-local tab references.
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
const { useWorkbenchStore } = context.require('store');
const state = () => useWorkbenchStore.getState();
const sourceA = { id: 'tab:source:a', kind: 'source', path: 'A.json' };
const sourceB = { id: 'tab:source:b', kind: 'source', path: 'B.json' };
useWorkbenchStore.setState({
  project: {}, tabs: [sourceA, sourceB], paneTabIds: { primary: [sourceA.id, sourceB.id], secondary: [] },
  activePane: 'primary', paneActiveTabIds: { primary: sourceB.id, secondary: undefined }, activeTabId: sourceB.id, splitViewEnabled: false,
});
state().setSplitViewEnabled(true);
assert.deepEqual([...state().paneTabIds.primary], [sourceA.id]);
assert.deepEqual([...state().paneTabIds.secondary], [sourceB.id]);
assert.equal(state().activePane, 'secondary');
state().setActivePane('primary');
state().openDiagnosticsTab();
assert.ok(state().paneTabIds.primary.includes(state().activeTabId));
assert.ok(!state().paneTabIds.secondary.includes(state().activeTabId));
state().setActivePane('secondary');
const retained = state().paneActiveTabIds.secondary;
state().setSplitViewEnabled(false, 'secondary');
assert.equal(state().activeTabId, retained);
assert.deepEqual([...state().paneTabIds.secondary], []);
assert.deepEqual(state().paneTabIds.primary, state().tabs.map((tab) => tab.id));

assert.match(embedded, /exports\.RELEASE_MILESTONE = 'v[^']+'/);
assert.match(embedded, /exports\.RELEASE_MILESTONE_NAME = '[^']+'/);
assert.match(embedded, /workbench\.layout\.split-ratio\.persist/);
assert.match(embedded, /paneTabIds/);
assert.match(embedded, /data-workbench-pane/);

console.log('v0.11.15 Split Workview source/runtime checks passed');
