import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
// Historical v0.11.8 feature contract. Current release metadata is validated by the current release gate.
const store = read('src/store.ts');
const workbenchSidebar = read('src/components/WorkbenchSidebar.tsx');
const layoutSidebar = read('src/features/visual/VisualLayoutSidebar.tsx');
const toolSidebar = read('src/components/ToolSidebar.tsx');
const layoutTab = read('src/features/visual/VisualLayoutTab.tsx');
const explorer = read('src/components/ProjectExplorer.tsx');
const descriptorIndex = read('src/projectFiles/descriptorIndex.ts');
const graphView = read('src/features/project-graph/ProjectGraphView.tsx');
const graphSidebar = read('src/features/project-graph/ProjectGraphSidebar.tsx');
const css = read('src/styles.css');


// Layout becomes a contextual tool sidebar while proposal review/staging stays in the main tab.
assert.match(store, /export type SidebarView = 'explorer' \| 'search'/);
assert.match(store, /export type ToolSidebarView = 'project-graph' \| 'visual-layout'/);
assert.match(store, /toolSidebarOverride/);
assert.match(store, /visualLayoutGenerateRequest/);
assert.match(store, /visualLayoutFilePickerRequest/);
assert.match(store, /requestVisualLayoutGenerate/);
assert.match(store, /requestVisualLayoutFilePicker/);
assert.match(workbenchSidebar, /activeTab\?\.kind === 'visual'/);
assert.match(workbenchSidebar, /<VisualLayoutSidebar \/>/);
assert.match(toolSidebar, /export function ToolSidebar/);
assert.match(layoutSidebar, /Choose files in Explorer…/);
assert.match(layoutSidebar, /All graph files/);
assert.match(layoutSidebar, /Layout strategy/);
assert.match(layoutSidebar, /Spacing preset/);
assert.match(layoutSidebar, /Branch direction/);
assert.match(layoutSidebar, /Floating geometry/);
assert.match(layoutSidebar, /Floater handling/);
assert.match(layoutSidebar, /Generate proposal/);
assert.match(layoutSidebar, /requestGenerate/);
assert.match(layoutTab, /Layout results/);
assert.match(layoutTab, /Geometry coverage/);
assert.match(layoutTab, /Layout proposal/);
assert.match(layoutTab, /Stage proposal/);
assert.match(layoutTab, /Replace staged layout/);
assert.match(layoutTab, /visualLayoutGenerateRequest/);
assert.match(layoutTab, /visualLayoutFilePickerRequest/);
assert.match(layoutTab, /<ExplorerSelectionDialog/);
assert.doesNotMatch(layoutTab, /layout-strategy-grid/);
assert.doesNotMatch(layoutTab, /Choose files in Explorer…/);
assert.match(css, /\.visual-layout-sidebar[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\)/);
assert.match(css, /\.visual-layout-sidebar-body[\s\S]*?overflow: auto/);

// Graph camera actions are measured independently of graph build/layout work.
for (const metric of ['graph.camera.pan', 'graph.camera.zoom', 'graph.camera.fit', 'graph.camera.restore']) {
  assert.match(graphView, new RegExp(metric.replaceAll('.', '\\.'), 'm'));
}
assert.match(graphSidebar, /graph\.camera\.reset/);
assert.match(graphView, /rootIndex: selectedRootIndex/);
assert.match(graphView, /rootKind: selectedRoot\?\.kind/);
assert.match(graphView, /rootCount: roots\.length/);
assert.match(graphView, /aggregateOnly: true/);

// Explorer is measured before optimization so the Windows report can distinguish derivation from render work.
assert.match(descriptorIndex, /explorer\.descriptor-index\.rebuild/);
assert.match(descriptorIndex, /explorer\.descriptor-index\.cache-hit/);
assert.match(explorer, /explorer\.tree\.build/);
assert.match(explorer, /explorer\.tree\.selection-index/);
assert.match(explorer, /explorer\.render\.commit/);
assert.match(explorer, /visibleTreeRowCount/);
assert.match(explorer, /expandedFolders/);
assert.match(explorer, /selectionMode: Boolean\(selectionMode\)/);
assert.match(explorer, /scopeKind: explorerScopeKind/);

// This pass does not alter the layout algorithm implementation itself.
assert.doesNotMatch(layoutSidebar, /buildLayoutProposal|stageLayoutProposal/);
assert.doesNotMatch(explorer, /virtualiz|react-window|react-virtualized/i);

console.log('v0.11.8 Layout Tool Sidebar & Interaction Diagnostics checks passed');
