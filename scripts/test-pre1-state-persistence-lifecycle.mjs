import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const read = (file) => fs.readFileSync(file, 'utf8');
const persistenceSource = read('src/projects/projectPersistence.ts');
const store = read('src/store.ts');
const lifecycle = read('src/projects/ProjectLifecycleGuard.tsx');
const folderOpen = read('src/components/FolderOpenButton.tsx');
const app = read('src/App.tsx');
const roadmap = read('docs/PRE_1_0_AUDIT_ROADMAP.md');
const audit = read('docs/audits/PRE_1_0_05_STATE_PERSISTENCE_LIFECYCLE.md');

// Persistence intentionally stores navigation/UI context only. Session-only edit authority must never cross restart/project boundaries.
const writerSource = persistenceSource.slice(persistenceSource.indexOf('export function writeProjectSession'));
for (const forbidden of [/changeSet\s*:/i, /changePast\s*:/i, /changeFuture\s*:/i, /editing\s*:/i, /old(?:File|Source)?Text\s*:/i]) {
  assert.doesNotMatch(writerSource, forbidden);
}

const setWorkspaceStart = store.indexOf('setWorkspace: (workspace, traceId) => {');
const setWorkspaceEnd = store.indexOf('closeProject: () =>', setWorkspaceStart);
assert.ok(setWorkspaceStart >= 0 && setWorkspaceEnd > setWorkspaceStart);
const setWorkspace = store.slice(setWorkspaceStart, setWorkspaceEnd);
assert.match(setWorkspace, /changeVersion:\s*0/);
assert.match(setWorkspace, /editing:\s*false/);
assert.match(setWorkspace, /activePane:\s*'primary'/);
assert.match(setWorkspace, /paneActiveTabIds:\s*\{ primary: restoredActiveTabId, secondary: undefined \}/);
assert.match(setWorkspace, /paneTabIds:\s*\{ primary: tabs\.map\(\(tab\) => tab\.id\), secondary: \[\] \}/);
assert.match(setWorkspace, /splitViewEnabled:\s*false/);
assert.match(setWorkspace, /changeSet:\s*emptyChangeSet\(\)/);
assert.match(setWorkspace, /changePast:\s*\[\]/);
assert.match(setWorkspace, /changeFuture:\s*\[\]/);

const closeStart = store.indexOf('closeProject: () => set((state) => {');
const closeEnd = store.indexOf('setEditing:', closeStart);
assert.ok(closeStart >= 0 && closeEnd > closeStart);
const closeProject = store.slice(closeStart, closeEnd);
for (const marker of [
  /workspace:\s*undefined/,
  /project:\s*undefined/,
  /editing:\s*false/,
  /tabs:\s*\[\]/,
  /navigationPast:\s*\[\]/,
  /navigationFuture:\s*\[\]/,
  /recentlyClosedFileIds:\s*\[\]/,
  /changeSet:\s*emptyChangeSet\(\)/,
  /changePast:\s*\[\]/,
  /changeFuture:\s*\[\]/,
  /externalChangeNotice:\s*undefined/,
]) assert.match(closeProject, marker);

// Pane/split ownership is deliberately session-only across process/project boundaries.
assert.doesNotMatch(writerSource, /activePane\s*:/);
assert.doesNotMatch(writerSource, /paneActiveTabIds\s*:/);
assert.doesNotMatch(writerSource, /paneTabIds\s*:/);
assert.doesNotMatch(writerSource, /splitViewEnabled\s*:/);

// Pending changes guard every destructive project boundary and are not discarded before the replacement action succeeds.
assert.match(folderOpen, /guardProjectAction\('switch-project'/);
assert.match(lifecycle, /guardProjectAction\('close-project'/);
assert.match(lifecycle, /guardProjectAction\('exit-app'/);
assert.doesNotMatch(lifecycle, /resetChanges\(\)/);
assert.match(lifecycle, /await action\.execute\(\);[\s\S]*?action\.resolve\(true\)/);
assert.match(lifecycle, /catch \(error\)[\s\S]*?action\.reject\(error\)/);

// Watcher debounce/error/notice state must not survive a desktop project-root transition.
assert.match(app, /const projectRoot = workspace\?\.projectRoot/);
assert.match(app, /\[clearExternalChangeNotice, projectRoot\]/);
const projectBoundaryEffect = app.slice(app.indexOf('if (watcherTimer.current) {'), app.indexOf('useEffect(() => {\n    if (!desktop) return;', app.indexOf('if (watcherTimer.current) {')));
assert.match(projectBoundaryEffect, /window\.clearTimeout\(watcherTimer\.current\)/);
assert.match(projectBoundaryEffect, /watcherTimer\.current = undefined/);
assert.match(projectBoundaryEffect, /watcherPaths\.current\.clear\(\)/);
assert.match(projectBoundaryEffect, /watcherReloadGeneration\.current \+= 1/);
assert.match(projectBoundaryEffect, /clearExternalChangeNotice\(\)/);
assert.match(projectBoundaryEffect, /setWatcherError\(undefined\)/);

// Run the real persistence module in Node after erasing its type-only imports.
const transpiled = ts.transpileModule(persistenceSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  fileName: 'projectPersistence.ts',
  reportDiagnostics: true,
});
assert.deepEqual(transpiled.diagnostics ?? [], [], 'projectPersistence transpilation diagnostics');
const persistence = await import(`data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString('base64')}`);

const storage = new Map();
const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
};
Object.defineProperty(globalThis, 'window', { value: { localStorage }, configurable: true, writable: true });

const root = 'C:\\Projects\\LifecycleAudit';
const sessionKey = (rootPath) => `hytale-workbench.project-session.v1:${encodeURIComponent(rootPath.replace(/[\\/]+$/, '').trim())}`;
const key = sessionKey(root);

storage.set(key, '{broken-json');
assert.equal(persistence.readProjectSession(root), undefined, 'malformed JSON must fail closed');
storage.set(key, JSON.stringify({ version: 99, openFilePaths: [] }));
assert.equal(persistence.readProjectSession(root), undefined, 'unknown persistence versions must fail closed');
storage.set(key, JSON.stringify({ version: 1, openFilePaths: 'not-an-array' }));
assert.equal(persistence.readProjectSession(root), undefined, 'invalid required session shape must fail closed');

const paths = Array.from({ length: 700 }, (_, index) => `Server/HytaleGenerator/File-${index}.json`);
const sourcePaths = Array.from({ length: 80 }, (_, index) => `Server/Support/Source-${index}.json`);
const nav = Array.from({ length: 150 }, (_, index) => ({ filePath: `Server/HytaleGenerator/Nav-${index}.json`, nodeId: `node-${index}`, location: index % 2 ? 'live' : 'floating' }));
const visual = Array.from({ length: 650 }, (_, index) => `Server/HytaleGenerator/Visual-${index}.json`);
const huge = 'x'.repeat(5000);
storage.set(key, JSON.stringify({
  version: 1,
  openFilePaths: [...paths, paths[0], huge, 42],
  activeFilePath: huge,
  openSourcePaths: [...sourcePaths, sourcePaths[0], huge],
  activeSourcePath: huge,
  focusedNode: { filePath: huge, nodeId: huge, location: 'live' },
  explorerWorkspace: huge,
  explorerFolderState: Object.fromEntries(Array.from({ length: 5100 }, (_, index) => [`folder-${index}`, true])),
  sidebarView: 'tool-owned-stale-value',
  sidebarVisible: 'not-a-boolean',
  searchSidebarQuery: huge,
  recentSearches: Array.from({ length: 20 }, (_, index) => `query-${index}`),
  filters: { imports: false, exports: false, seeds: true, valueFields: [huge, 'Type'], allValues: false, live: false, floating: true, hideEmpty: false, workspace: huge },
  recentlyClosedFilePaths: Array.from({ length: 40 }, (_, index) => `Server/HytaleGenerator/Closed-${index}.json`),
  navigationCurrent: { filePath: huge, nodeId: 'node' },
  navigationPast: nav,
  navigationFuture: nav,
  visualSelectedFilePaths: visual,
  visualSettings: { strategy: 'invalid', spacingPreset: 'invalid', horizontalGap: -1, verticalGap: Number.NaN, alignmentTolerance: 999999, dagBranchDirection: 'invalid', includeLive: 'yes', includeFloating: true, respectAuthorSections: false, floaterMode: 'invalid' },
  projectGraphSettings: { selectedRootPath: huge, densityDepth: 999, includeResources: true, viewport: { panX: 10, panY: -20, zoom: 99 } },
  editing: true,
  changeSet: { changes: [{ id: 'must-not-resurrect' }] },
  changePast: [{ changes: [] }],
  changeFuture: [{ changes: [] }],
  oldFileText: 'secret stale content',
}));

const cleaned = persistence.readProjectSession(root);
assert.ok(cleaned);
assert.equal(cleaned.openFilePaths.length, 500);
assert.equal(new Set(cleaned.openFilePaths).size, cleaned.openFilePaths.length);
assert.equal(cleaned.openSourcePaths.length, 50);
assert.equal(cleaned.activeFilePath, undefined);
assert.equal(cleaned.activeSourcePath, undefined);
assert.equal(cleaned.focusedNode, undefined);
assert.equal(cleaned.explorerWorkspace, 'all');
assert.equal(Object.keys(cleaned.explorerFolderState).length, 5000);
assert.equal(cleaned.sidebarView, 'explorer');
assert.equal(cleaned.sidebarVisible, true);
assert.equal(cleaned.searchSidebarQuery, '');
assert.equal(cleaned.recentSearches.length, 12);
assert.equal(cleaned.filters.workspace, 'all');
assert.deepEqual(cleaned.filters.valueFields, ['Type']);
assert.equal(cleaned.recentlyClosedFilePaths.length, 20);
assert.equal(cleaned.navigationCurrent, undefined);
assert.equal(cleaned.navigationPast.length, 100);
assert.equal(cleaned.navigationFuture.length, 100);
assert.equal(cleaned.visualSelectedFilePaths.length, 500);
assert.equal(cleaned.visualSettings.strategy, 'author-normalize');
assert.equal(cleaned.visualSettings.horizontalGap, 10);
assert.equal(cleaned.visualSettings.alignmentTolerance, 100000);
assert.equal(cleaned.projectGraphSettings.selectedRootPath, undefined);
assert.equal(cleaned.projectGraphSettings.densityDepth, 8);
assert.equal(cleaned.projectGraphSettings.viewport.zoom, 2.5);
for (const forbidden of ['editing', 'changeSet', 'changePast', 'changeFuture', 'oldFileText']) assert.equal(forbidden in cleaned, false);

const safeSession = {
  version: 1,
  openFilePaths: [...paths, huge],
  activeFilePath: paths[0],
  openSourcePaths: sourcePaths,
  activeSourcePath: sourcePaths[0],
  explorerWorkspace: 'all',
  explorerFolderState: {},
  sidebarView: 'search',
  sidebarVisible: true,
  searchSidebarQuery: 'Biome',
  recentSearches: ['Biome', 'Noise'],
  filters: { imports: true, exports: true, seeds: false, valueFields: [], allValues: false, live: true, floating: false, hideEmpty: true, workspace: 'all' },
  recentlyClosedFilePaths: [],
  navigationPast: [],
  navigationFuture: [],
  visualSelectedFilePaths: [],
  visualSettings: { strategy: 'author-normalize', spacingPreset: 'compact', horizontalGap: 10, verticalGap: 10, alignmentTolerance: 100, dagBranchDirection: 'auto', includeLive: true, includeFloating: false, respectAuthorSections: true, floaterMode: 'ignore' },
  projectGraphSettings: { densityDepth: 8, includeResources: false },
  editing: true,
  changeSet: { changes: [{ id: 'must-not-write' }] },
  changePast: [{ changes: [] }],
  changeFuture: [{ changes: [] }],
  oldSourceText: 'must-not-write',
};
persistence.writeProjectSession(root, safeSession);
const written = JSON.parse(storage.get(key));
assert.equal(written.openFilePaths.length, 500);
assert.equal(written.openSourcePaths.length, 50);
for (const forbidden of ['editing', 'changeSet', 'changePast', 'changeFuture', 'oldSourceText']) assert.equal(forbidden in written, false);

const recentKey = 'hytale-workbench.projects.v1';
storage.set(recentKey, JSON.stringify([
  { rootPath: 'C:\\Projects\\Alpha', label: 'Alpha old', pinned: false, lastOpenedAt: 1 },
  { rootPath: 'c:\\projects\\alpha', label: 'Alpha new', pinned: true, lastOpenedAt: 2 },
  ...Array.from({ length: 250 }, (_, index) => ({ rootPath: `C:\\Projects\\P-${index}`, label: `Project ${index}`, pinned: false, lastOpenedAt: index + 3 })),
  { rootPath: huge, label: huge, pinned: true, lastOpenedAt: 999999 },
]));
const recent = persistence.readRecentProjects();
assert.equal(recent.length, 20);
assert.equal(recent.filter((entry) => entry.rootPath.toLocaleLowerCase() === 'c:\\projects\\alpha').length, 1);
assert.equal(recent.some((entry) => entry.rootPath.length > 4096 || entry.label.length > 512), false);

assert.match(roadmap, /\| 05 \| Application state, persistence & lifecycle[\s\S]*?\| \*\*PASS\*\* \|/);
assert.match(roadmap, /Track 06 is next/);
assert.match(audit, /\*\*Status:\*\* PASS/);
assert.match(audit, /Finding 05-A/);
assert.match(audit, /Finding 05-B/);

console.log(JSON.stringify({
  openFileCap: cleaned.openFilePaths.length,
  openSourceCap: cleaned.openSourcePaths.length,
  navigationPastCap: cleaned.navigationPast.length,
  visualSelectionCap: cleaned.visualSelectedFilePaths.length,
  recentProjectCap: recent.length,
  stagedStatePersisted: false,
  watcherBoundaryReset: true,
}, null, 2));
console.log('Pre-1.0 Audit 05 — State/Persistence/Lifecycle: PASS');
