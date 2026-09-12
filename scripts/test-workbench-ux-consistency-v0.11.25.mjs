import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const explorer = read('src/components/ProjectExplorer.tsx');
const rail = read('src/components/WorkbenchRail.tsx');
const inspector = read('src/features/inspector/InspectorPane.tsx');
const store = read('src/store.ts');
const runtime = read('src/support/runtimeDiagnostics.ts');
const app = read('src/App.tsx');
const styles = read('src/styles.css');
const embedded = read('tauri-ui/app.js');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.match(runtime, /milestone: RELEASE_MILESTONE/);
assert.match(runtime, /profile: RELEASE_VALIDATION_PROFILE/);
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);

// Global object pool + pane-local references remain the ownership contract.
assert.match(store, /tabs: WorkbenchTab\[\]/);
assert.match(store, /paneTabIds: WorkbenchPaneTabs/);
assert.match(store, /closeTab: \(tabId, requestedPane\)/);
assert.match(store, /const fullyClosed = !refs\.has\(tabId\)/);

// Explorer Open Editors follows active pane, never global tabs.filter(...).
assert.match(explorer, /const activePane = useWorkbenchStore\(\(state\) => state\.activePane\)/);
assert.match(explorer, /const activePaneTabIds = paneTabIds\[activePane\]/);
assert.match(explorer, /activePaneTabIds\s*\.map\(\(tabId\) => tabs\.find/);
assert.doesNotMatch(explorer, /const openEditorTabs = tabs\.filter/);
assert.match(explorer, /Open editors\{splitViewEnabled && <small className="open-editors-pane-label">\{activePaneLabel\}<\/small>\}/);
assert.match(explorer, /selectTab\(tab\.id, activePane\)/);
assert.match(explorer, /closeTab\(tab\.id, activePane\)/);
assert.match(explorer, /sharedWithOtherPane = splitViewEnabled && otherPaneTabIds\.includes\(tab\.id\)/);
assert.match(explorer, /Same global editor is also referenced by/);
assert.match(explorer, /Reopen closed editor\$\{splitViewEnabled \? ` in \$\{activePaneLabel\}` : ''\}/);

// Explicit graph instances use the same rail affordance as the canonical graph.
assert.match(rail, /active=\{activeTab\?\.kind === 'project-graph'\}/);
assert.doesNotMatch(rail, /active=\{activeTabId === 'tab:project-graph'\}/);

// Empty-pane messaging matches the ownership model.
assert.match(inspector, /No tab open\{splitViewEnabled \? ` in \$\{paneId === 'primary' \? 'Pane A' : 'Pane B'\}` : ''\}/);
assert.match(inspector, /Existing global editors can be shown here without creating a duplicate document/);
assert.match(styles, /v0\.11\.31 · UX Consistency Pass/);
assert.match(styles, /\.open-editor-shared/);

// Packaged runtime must contain the same contract.
assert.match(embedded, /open-editors-pane-label/);
assert.match(embedded, /Same global editor is also referenced by/);
assert.match(embedded, /activeTab\?\.kind === 'project-graph'/);

console.log('v0.11.25 Workbench UX consistency contract: PASS');
