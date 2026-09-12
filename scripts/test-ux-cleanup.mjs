import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const visual = readFileSync(new URL('../src/features/visual/VisualLayoutTab.tsx', import.meta.url), 'utf8');
const visualSidebar = readFileSync(new URL('../src/features/visual/VisualLayoutSidebar.tsx', import.meta.url), 'utf8');
const visualUi = readFileSync(new URL('../src/features/visual/visualLayoutUi.ts', import.meta.url), 'utf8');
const store = readFileSync(new URL('../src/store.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const explorer = readFileSync(new URL('../src/components/ProjectExplorer.tsx', import.meta.url), 'utf8');
const inspector = readFileSync(new URL('../src/features/inspector/InspectorPane.tsx', import.meta.url), 'utf8');
const changes = readFileSync(new URL('../src/components/ChangePanel.tsx', import.meta.url), 'utf8');
const filters = readFileSync(new URL('../src/components/FilterBar.tsx', import.meta.url), 'utf8');
const graphView = readFileSync(new URL('../src/features/project-graph/ProjectGraphView.tsx', import.meta.url), 'utf8');
const graphSidebar = readFileSync(new URL('../src/features/project-graph/ProjectGraphSidebar.tsx', import.meta.url), 'utf8');
const folderLoader = readFileSync(new URL('../src/io/folderLoader.ts', import.meta.url), 'utf8');
const workspace = readFileSync(new URL('../src/core/workspace.ts', import.meta.url), 'utf8');
const desktopBridge = readFileSync(new URL('../src/io/desktopBridge.ts', import.meta.url), 'utf8');
const rail = readFileSync(new URL('../src/components/WorkbenchRail.tsx', import.meta.url), 'utf8');
const search = readFileSync(new URL('../src/components/SearchSidebar.tsx', import.meta.url), 'utf8');

assert.match(visualUi, /compact: \{ horizontalGap: 10, verticalGap: 10, alignmentTolerance: 100 \}/);
assert.match(visualUi, /normal: \{ horizontalGap: 50, verticalGap: 50, alignmentTolerance: 100 \}/);
assert.match(visualUi, /spacious: \{ horizontalGap: 100, verticalGap: 100, alignmentTolerance: 100 \}/);
assert.match(store, /strategy: 'author-normalize',[\s\S]*spacingPreset: 'compact',[\s\S]*horizontalGap: 10,[\s\S]*verticalGap: 10,[\s\S]*alignmentTolerance: 100/);
assert.match(visualSidebar, /setSettings\(\{ \[key\]: next, spacingPreset: 'custom' \}/);

assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.doesNotMatch(app, /<SearchBar/);
assert.doesNotMatch(app, /editing-control/);
assert.doesNotMatch(app, /workspace-bar/);
assert.doesNotMatch(app, /<FilterBar/);

// Explorer/Search are sidebar modes; tools keep their established tabs.
assert.match(rail, /activateSidebar/);
assert.match(rail, /openDiagnosticsTab/);
assert.match(rail, /openChangesTab/);
assert.match(rail, /openVisualTab/);
assert.match(rail, /openProjectGraphTab/);
assert.match(search, /openSearchTab/);
assert.doesNotMatch(explorer, /Workbench views/);

assert.match(inspector, /const showFilters = activeTab\?\.kind === 'file'/);
assert.match(inspector, /\['search', 'references', 'changes'\]\.includes\(activeTab\.queryKind\)/);
assert.match(inspector, /<FilterBar/);
assert.match(filters, /true, 2, 1/);

assert.match(visualSidebar, /Scope & proposal setup/);
assert.match(visualSidebar, /Layout strategy/);
assert.match(visualSidebar, /Choose files in Explorer/);
assert.match(visualSidebar, /Connection plane tolerance/);
assert.match(visualSidebar, /Generate proposal/);
assert.match(visual, /ExplorerSelectionDialog/);
assert.doesNotMatch(visual, /className=\"visual-file-picker\"/);
assert.match(visual, /visual-card geometry-card visual-aux-card/);
assert.match(visual, /layout-proposal-overview/);
assert.match(visual, /layout-advanced-diagnostics/);
assert.match(visualSidebar, /\['type', 'Type'\]/);

assert.match(graphSidebar, /Flow root/);
assert.match(graphSidebar, /Summary/);
assert.match(graphView, /buildProjectGraph/);
assert.match(graphView, /openReferenceTab\('Density'/);
assert.match(graphSidebar, /Density depth/);
assert.match(inspector, /activeTab\?\.kind === 'project-graph'/);

assert.match(workspace, /\$NodeEditorMetadata/);
assert.match(workspace, /\$WorkspaceID/);
assert.match(folderLoader, /_workspace\.json/);
assert.match(folderLoader, /WorkspaceName/);
assert.match(folderLoader, /looksLikeNodeEditorAsset/);

assert.match(folderLoader, /hasDesktopBridge\(\)/);
assert.match(folderLoader, /workspaceFromDesktopScan/);
assert.match(desktopBridge, /\/api\/project\/open/);
assert.doesNotMatch(desktopBridge, /X-Hytale-Workbench-Token|__HYTALE_DESKTOP_TOKEN__/);
assert.match(changes, /writeOutputDirectory/);

assert.match(app, /developerMode/);
assert.match(app, /TCP server/);
assert.match(store, /hytale-workbench\.developer-mode/);

assert.match(changes, /<RenameRulesPanel \/>/);
assert.match(changes, /No staged changes/);
assert.match(changes, /Review & Export/);
assert.match(changes, /Export Changes ZIP/);
assert.match(changes, /Export Project Copy/);
assert.match(changes, /Apply to Project/);
assert.match(changes, /setMode\('changes-zip'\)/);

console.log(JSON.stringify({
  version: '0.11.34',
  themeChanged: false,
  layoutBehaviorChanged: false,
  sidebarModes: ['Explorer', 'Search', 'Project Graph', 'Layout'],
  tabLaunchers: ['Diagnostics', 'Changes', 'Layout', 'Project Graph'],
  projectStartScreen: true,
  visualEditingRailState: true,
  contextualFilters: true,
  projectGraphPrototype: true,
  metadataWorkspaceDiscovery: true,
  tauriDesktopHost: true,
  exportFirstDesktopUx: true,
  developerMode: true,
}, null, 2));
