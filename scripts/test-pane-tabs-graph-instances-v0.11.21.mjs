import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const storeSource = read('src/store.ts');
const tabsSource = read('src/components/FileTabs.tsx');
const inspectorSource = read('src/features/inspector/InspectorPane.tsx');
const graphSidebar = read('src/features/project-graph/ProjectGraphSidebar.tsx');
const graphView = read('src/features/project-graph/ProjectGraphView.tsx');
const app = read('src/App.tsx');
const runtime = read('src/support/runtimeDiagnostics.ts');
const embedded = read('tauri-ui/app.js');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);

// Source ownership contract: one object pool, pane-local reference lists.
assert.match(storeSource, /tabs: WorkbenchTab\[\]/);
assert.match(storeSource, /paneTabIds: WorkbenchPaneTabs/);
assert.match(storeSource, /primary: string\[\]/);
assert.match(storeSource, /secondary: string\[\]/);
assert.match(storeSource, /pruneUnreferencedTabs/);
assert.match(storeSource, /closeTab: \(tabId, requestedPane\)/);
assert.match(storeSource, /closeOtherTabs: \(tabId, requestedPane\)/);
assert.match(storeSource, /closeTabsToRight: \(tabId, requestedPane\)/);
assert.match(tabsSource, /paneTabIds\[paneId\]/);
assert.match(tabsSource, /closeTab\(tab\.id, paneId\)/);
assert.match(tabsSource, /closeOtherTabs\(menuTab\.id, paneId\)/);
assert.match(inspectorSource, /No tab open/);

// Graph instance contract.
assert.match(storeSource, /canonical: boolean/);
assert.match(storeSource, /settings: ProjectGraphViewSettings/);
assert.match(storeSource, /openProjectGraphAsNew/);
assert.match(storeSource, /tab:project-graph:\$\{serial\}/);
assert.match(graphSidebar, /Open as new graph/);
assert.match(graphSidebar, /toolbar Project Graph remains a singleton/i);
assert.match(graphView, /ProjectGraphView\(\{ tab \}/);
assert.match(graphView, /setProjectGraphSettings\(settings, tab\.id\)/);
assert.match(tabsSource, /Project Graph ·/);

// Packaged runtime execution.
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
const sourceC = { id: 'tab:source:c', kind: 'source', path: 'C.json' };

// 1 tab -> A empty, B owns active tab, B becomes active.
useWorkbenchStore.setState({
  project: {}, tabs: [sourceA], paneTabIds: { primary: [sourceA.id], secondary: [] },
  paneActiveTabIds: { primary: sourceA.id, secondary: undefined }, activePane: 'primary', activeTabId: sourceA.id,
  splitViewEnabled: false, focusedNode: undefined, selectedFileId: undefined,
});
state().setSplitViewEnabled(true);
assert.deepEqual([...state().paneTabIds.primary], []);
assert.deepEqual([...state().paneTabIds.secondary], [sourceA.id]);
assert.equal(state().paneActiveTabIds.primary, undefined);
assert.equal(state().paneActiveTabIds.secondary, sourceA.id);
assert.equal(state().activePane, 'secondary');

// 3 tabs -> all inactive tabs to A, active tab alone to B.
useWorkbenchStore.setState({
  project: {}, tabs: [sourceA, sourceB, sourceC], paneTabIds: { primary: [sourceA.id, sourceB.id, sourceC.id], secondary: [] },
  paneActiveTabIds: { primary: sourceC.id, secondary: undefined }, activePane: 'primary', activeTabId: sourceC.id,
  splitViewEnabled: false,
});
state().setSplitViewEnabled(true);
assert.deepEqual([...state().paneTabIds.primary], [sourceA.id, sourceB.id]);
assert.deepEqual([...state().paneTabIds.secondary], [sourceC.id]);
assert.equal(state().paneActiveTabIds.primary, sourceB.id);
assert.equal(state().paneActiveTabIds.secondary, sourceC.id);
assert.equal(state().activePane, 'secondary');

// New tabs are assigned only to the active pane.
state().openDiagnosticsTab();
const diagnosticsId = state().activeTabId;
assert.ok(diagnosticsId?.startsWith('tab:diagnostics:'));
assert.ok(state().paneTabIds.secondary.includes(diagnosticsId));
assert.ok(!state().paneTabIds.primary.includes(diagnosticsId));
state().setActivePane('primary');
state().openChangesTab();
assert.ok(state().paneTabIds.primary.includes('tab:changes:pending'));
assert.ok(!state().paneTabIds.secondary.includes('tab:changes:pending'));

// Opening an already existing global tab in another pane adds a reference, never a duplicate object.
state().setActivePane('secondary');
const globalCountBeforeShared = state().tabs.filter((tab) => tab.id === 'tab:changes:pending').length;
state().openChangesTab();
assert.equal(state().tabs.filter((tab) => tab.id === 'tab:changes:pending').length, globalCountBeforeShared);
assert.ok(state().paneTabIds.primary.includes('tab:changes:pending'));
assert.ok(state().paneTabIds.secondary.includes('tab:changes:pending'));

// Closing a shared tab is pane-local; the global object survives while the other pane references it.
state().closeTab('tab:changes:pending', 'secondary');
assert.ok(state().paneTabIds.primary.includes('tab:changes:pending'));
assert.ok(!state().paneTabIds.secondary.includes('tab:changes:pending'));
assert.equal(state().tabs.filter((tab) => tab.id === 'tab:changes:pending').length, 1);

// Close-to-right is pane-local and must not touch the other pane's list.
useWorkbenchStore.setState({
  tabs: [sourceA, sourceB, sourceC], paneTabIds: { primary: [sourceA.id, sourceB.id, sourceC.id], secondary: [sourceB.id, sourceC.id] },
  paneActiveTabIds: { primary: sourceC.id, secondary: sourceC.id }, activePane: 'primary', activeTabId: sourceC.id, splitViewEnabled: true,
});
state().closeTabsToRight(sourceA.id, 'primary');
assert.deepEqual([...state().paneTabIds.primary], [sourceA.id]);
assert.deepEqual([...state().paneTabIds.secondary], [sourceB.id, sourceC.id]);
assert.deepEqual(state().tabs.map((tab) => tab.id), [sourceA.id, sourceB.id, sourceC.id]);

// Collapse keeps all referenced global tabs and retains the explicitly chosen pane's active content.
state().setActivePane('secondary');
const retained = state().paneActiveTabIds.secondary;
state().setSplitViewEnabled(false, 'secondary');
assert.equal(state().activePane, 'primary');
assert.equal(state().activeTabId, retained);
assert.deepEqual([...state().paneTabIds.secondary], []);
assert.deepEqual(state().paneTabIds.primary, state().tabs.map((tab) => tab.id));

// Canonical graph is a singleton. Explicit graph is a separate stateful instance.
useWorkbenchStore.setState({
  project: {}, tabs: [sourceA], paneTabIds: { primary: [sourceA.id], secondary: [] },
  paneActiveTabIds: { primary: sourceA.id, secondary: undefined }, activePane: 'primary', activeTabId: sourceA.id,
  splitViewEnabled: false, projectGraphSerial: 0,
  projectGraphSettings: { selectedRootPath: 'RootA', densityDepth: 8, includeResources: false, viewport: undefined }, projectGraphFitRequest: 0,
  navigationCurrent: undefined, navigationPast: [], navigationFuture: [],
});
state().openProjectGraphTab();
const canonicalId = 'tab:project-graph';
assert.equal(state().tabs.filter((tab) => tab.id === canonicalId).length, 1);
state().openProjectGraphTab();
assert.equal(state().tabs.filter((tab) => tab.id === canonicalId).length, 1, 'toolbar graph must stay a singleton');
state().openProjectGraphAsNew('RootB');
const graphTabs = state().tabs.filter((tab) => tab.kind === 'project-graph');
assert.equal(graphTabs.length, 2);
const secondaryGraph = graphTabs.find((tab) => !tab.canonical);
const canonicalGraph = graphTabs.find((tab) => tab.canonical);
assert.ok(secondaryGraph && canonicalGraph);
assert.equal(secondaryGraph.settings.selectedRootPath, 'RootB');
state().setProjectGraphSettings({ densityDepth: 12, viewport: { panX: 50, panY: 25, zoom: 1.5 } }, secondaryGraph.id);
const updatedSecondary = state().tabs.find((tab) => tab.id === secondaryGraph.id);
const unchangedCanonical = state().tabs.find((tab) => tab.id === canonicalId);
assert.equal(updatedSecondary.settings.densityDepth, 12);
assert.equal(unchangedCanonical.settings.densityDepth, 8);
assert.equal(state().projectGraphSettings.densityDepth, 8, 'legacy persistence alias belongs only to canonical graph');

// Same canonical graph may be referenced in both panes but still exists globally once.
state().setSplitViewEnabled(true);
state().setActivePane('primary');
state().openProjectGraphTab();
state().setActivePane('secondary');
state().openProjectGraphTab();
assert.ok(state().paneTabIds.primary.includes(canonicalId));
assert.ok(state().paneTabIds.secondary.includes(canonicalId));
assert.equal(state().tabs.filter((tab) => tab.id === canonicalId).length, 1);

assert.match(embedded, /paneTabIds/);
assert.match(embedded, /Open as new graph/);
assert.match(embedded, /Project Graph ·/);
console.log('v0.11.21 pane-local tabs + graph instances runtime contract passed');
