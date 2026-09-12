import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('../src/App.tsx');
const store = read('../src/store.ts');
const persistence = read('../src/projects/projectPersistence.ts');
const folder = read('../src/components/FolderOpenButton.tsx');
const start = read('../src/components/ProjectStartScreen.tsx');
const search = read('../src/components/SearchSidebar.tsx');
const rail = read('../src/components/WorkbenchRail.tsx');
const changes = read('../src/components/ChangePanel.tsx');
const loader = read('../src/io/folderLoader.ts');
const bridge = read('../src/io/desktopBridge.ts');
const lifecycle = read('../src/projects/ProjectLifecycleGuard.tsx');
const watcher = app;
const visual = read('../src/features/visual/VisualLayoutTab.tsx');
const graph = read('../src/features/project-graph/ProjectGraphView.tsx');

assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);

// Project/session flow remains UI-state-only and starts Diagnostics only when no file tab can restore.
assert.match(store, /const defaultDiagnosticsTab/);
assert.match(store, /const restoredTabs: WorkbenchTab\[\] = \[\.\.\.fileTabs, \.\.\.sourceTabs\]/);
assert.match(store, /const tabs: WorkbenchTab\[\] = restoredTabs\.length \? restoredTabs : \[defaultDiagnosticsTab\]/);
assert.match(store, /editing: false,[\s\S]*changeSet: emptyChangeSet\(\),[\s\S]*changePast: \[\],[\s\S]*changeFuture: \[\]/);
const sessionWriter = persistence.slice(persistence.indexOf('export function writeProjectSession'));
for (const forbidden of [/changeSet\s*:/i, /changePast\s*:/i, /changeFuture\s*:/i, /editing\s*:/i, /old(?:File|Source)?Text\s*:/i]) {
  assert.doesNotMatch(sessionWriter, forbidden);
}

// Opening a project still uses the native picker; recent entries remain in the same UI and securely re-authorize if needed.
assert.match(folder, /openDirectoryWorkspace/);
assert.match(start, /Open Project/);
assert.match(start, /Recent Projects/i);
assert.match(bridge, /desktopOpenProjectAt/);
assert.match(bridge, /REAUTHORIZE_RECENT/);

// Search remains sidebar -> result tab; tool tabs remain launchers, not new sidebars.
assert.match(search, /openSearchTab\(query\)/);
assert.match(rail, /sidebarButton\('explorer'/);
assert.match(rail, /sidebarButton\('search'/);
assert.match(rail, /activateSidebar\(view\)/);
assert.match(rail, /openDiagnosticsTab/);
assert.match(rail, /openChangesTab/);
assert.match(rail, /openVisualTab/);
assert.match(rail, /openProjectGraphTab/);

// Apply review UX is unchanged; v0.10.0 adds a final native conflict boundary after the existing preflight.
assert.match(changes, /Review & Export/);
assert.match(changes, /Export Changes ZIP/);
assert.match(changes, /Export Project Copy/);
assert.match(changes, /Apply to Project/);
assert.match(changes, /checkWorkspaceConflicts/);
assert.match(changes, /const commitConflicts = await .*writeWorkspaceFiles/);
assert.match(changes, /Nothing was written/);
assert.match(loader, /desktopApplyProjectFiles/);

// Source-project output selection still redirects to Apply instead of copying over the source tree.
assert.match(changes, /outputDirectoryIsSource/);
assert.match(changes, /Switched to Apply to Project/);

// Project lifecycle guard and file watcher remain present.
assert.match(lifecycle, /Review Changes/);
assert.match(lifecycle, /discardLabel/);
assert.match(lifecycle, /Discard & Switch/);
assert.match(lifecycle, /Discard & Close/);
assert.match(lifecycle, /Discard & Exit/);
assert.match(lifecycle, /Cancel/);
assert.match(watcher, /subscribeDesktopProjectChanges/);
assert.match(watcher, /reloadDirectoryWorkspace/);

// Existing major tools remain wired and unchanged in concept.
assert.match(visual, /buildLayoutProposal/);
assert.match(visual, /stageLayoutProposal/);
assert.match(graph, /buildProjectGraph/);
assert.match(graph, /openReferenceTab/);

console.log(JSON.stringify({
  version: '0.11.34',
  protectedFlows: [
    'Project open/recent/session restore',
    'Diagnostics startup fallback',
    'Explorer/Search sidebar + result tabs',
    'Diagnostics/Changes/Layout/Project Graph tool tabs',
    'Review -> preflight -> Apply',
    'Export Changes ZIP / Project Copy',
    'FileWatcher external-change reload',
    'Project lifecycle staged-change guard',
  ],
}, null, 2));
