import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const hashFile = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const hashTree = (dir) => {
  const hash = crypto.createHash('sha256');
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else {
        const relative = path.relative(dir, absolute).replaceAll('\\', '/');
        hash.update(relative); hash.update('\0'); hash.update(fs.readFileSync(absolute)); hash.update('\0');
      }
    }
  };
  visit(dir);
  return hash.digest('hex');
};

const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const cargo = read('src-tauri/Cargo.toml');
const app = read('src/App.tsx');
const runtime = read('src/support/runtimeDiagnostics.ts');
const buildId = read('BUILD_ID.txt');
const store = read('src/store.ts');
const sidebar = read('src/components/WorkbenchSidebar.tsx');
const rail = read('src/components/WorkbenchRail.tsx');
const toolSidebar = read('src/components/ToolSidebar.tsx');
const graphSidebar = read('src/features/project-graph/ProjectGraphSidebar.tsx');
const graphView = read('src/features/project-graph/ProjectGraphView.tsx');
const layoutSidebar = read('src/features/visual/VisualLayoutSidebar.tsx');
const explorer = read('src/components/ProjectExplorer.tsx');
const selectionDialog = read('src/components/ExplorerSelectionDialog.tsx');
const layoutTab = read('src/features/visual/VisualLayoutTab.tsx');
const drawer = read('src/components/WorkbenchDrawer.tsx');
const referenceDrawer = read('src/components/ReferenceDrawer.tsx');
const matchesDrawer = read('src/components/FieldMatchesDrawer.tsx');
const rulesDrawer = read('src/components/RenameRulesPanel.tsx');
const renameDialog = read('src/components/RenameSymbolDialog.tsx');
const inspector = read('src/features/inspector/InspectorPane.tsx');
const css = read('src/styles.css');
const compat = read('tauri-ui/compat-modules.js');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(cargo, new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.')}"`, 'm'));
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.equal(buildId.trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);

// Persistent Explorer/Search preference is separate from transient contextual tool sidebars.
assert.match(store, /export type SidebarView = 'explorer' \| 'search'/);
assert.match(store, /export type ToolSidebarView = 'project-graph' \| 'visual-layout'/);
assert.match(store, /toolSidebarOverride\?: SidebarView/);
assert.match(store, /function toolSidebarForTab/);
assert.match(store, /tab\?\.kind === 'project-graph'/);
assert.match(store, /tab\?\.kind === 'visual'/);
assert.match(store, /const toolSidebar = activeToolSidebar\(state\)/);
assert.match(store, /Keep the persisted global preference untouched/);
assert.match(store, /toolSidebarOverride: view/);
assert.match(store, /sidebarView: view,[\s\S]*?toolSidebarOverride: undefined/);
assert.match(store, /writeProjectSession\([\s\S]*?sidebarView: state\.sidebarView/);
assert.doesNotMatch(store, /sidebarView: 'project-graph'/);
assert.doesNotMatch(store, /sidebarView: 'visual-layout'/);

assert.match(sidebar, /toolSidebarOverride/);
assert.match(sidebar, /activeTab\?\.kind === 'project-graph'/);
assert.match(sidebar, /activeTab\?\.kind === 'visual'/);
assert.match(sidebar, /toolSidebarOverride \?\? sidebarView/);
assert.match(rail, /effectiveGlobalSidebarView = toolSidebarOverride \?\? sidebarView/);
assert.match(rail, /globalSidebarActive = !toolSidebarActive \|\| Boolean\(toolSidebarOverride\)/);

// Layout and Project Graph share only the structural ToolSidebar shell.
assert.match(toolSidebar, /export function ToolSidebar/);
assert.match(toolSidebar, /className={`tool-sidebar/);
assert.match(layoutSidebar, /<ToolSidebar/);
assert.match(graphSidebar, /<ToolSidebar/);
assert.match(layoutSidebar, /Generate proposal/);
assert.match(graphSidebar, /Fit graph/);

// Selection surface is generic and the reusable dialog owns the draft transaction.
assert.match(explorer, /eligibleLabel\?: string/);
assert.match(explorer, /purpose\?: string/);
assert.match(explorer, /sectionLabel\?: string/);
assert.doesNotMatch(explorer, /Select .* for Layout/);
assert.doesNotMatch(explorer, /select layout files/i);
assert.match(selectionDialog, /const \[draftSelectedFileIds, setDraftSelectedFileIds\]/);
assert.match(selectionDialog, /committedFileIds\.filter\(\(id\) => eligibleSet\.has\(id\)\)/);
assert.match(selectionDialog, /onCommit\(draftSelectedFileIds\.filter/);
assert.match(selectionDialog, /<ProjectExplorer/);
assert.match(selectionDialog, /<button onClick={onCancel}>Cancel<\/button>/);
assert.match(layoutTab, /<ExplorerSelectionDialog/);
assert.match(layoutTab, /eligibleLabel="layout-ready"/);
assert.match(layoutTab, /purpose="Layout"/);
assert.match(layoutTab, /confirmLabel="Use selected files"/);
assert.doesNotMatch(layoutTab, /<ProjectExplorer/);

// Drawers share a common Inspector-scoped host instead of hard-coded shell offsets.
assert.match(drawer, /createPortal/);
assert.match(drawer, /data-workbench-drawer-host/);
for (const source of [referenceDrawer, matchesDrawer, rulesDrawer]) assert.match(source, /<WorkbenchDrawer/);
assert.match(inspector, /data-workbench-drawer-host/);
assert.match(css, /\.workbench-drawer-host[\s\S]*?position: absolute;[\s\S]*?inset: 0;/);
assert.match(css, /\.workbench-drawer\.reference-drawer[\s\S]*?position: absolute;/);
assert.doesNotMatch(css, /\.reference-drawer\s*\{[^}]*position:\s*fixed[^}]*top:\s*108px[^}]*bottom:\s*52px/);
assert.match(referenceDrawer, /Open all as tab/);
assert.match(matchesDrawer, /source: 'suggestion'/);

// Rename remains an explicit modal/staging operation; no automatic propagation is introduced.
assert.match(renameDialog, /className="rename-modal"/);
assert.match(renameDialog, /Stage rename/);
assert.match(renameDialog, /Seeds and unrelated literals are never propagated/);
assert.doesNotMatch(renameDialog, /WorkbenchDrawer/);

// Embedded compatibility layer now exposes the portal primitive used by WorkbenchDrawer.
assert.match(compat, /define\('react-dom'/);
assert.match(compat, /createPortal/);
assert.match(compat, /PortalBridge/);

// Graph view rendering may evolve after v0.11.10. v0.11.22 intentionally hardens Author Rebuild inside the layout core; semantic graph construction and layout authority stay separate.
assert.match(graphView, /buildProjectGraph/);
assert.doesNotMatch(graphView, /buildLayoutProposal|stageLayoutProposal|commitProject/);
assert.equal(hashFile('src/projectFiles/descriptorIndex.ts'), '9ff8bde6fa38a194ebcabf7452ca1ac09ad2d4d42a0de2848edac2aa04a27f19');
assert.equal(hashTree('src/core/layout'), '0dd6dfb1a2099ec65036448a73ec027e080a8c532bdbd87f12d085919bdcbb00');

console.log('v0.11.10 Workbench UX Consolidation regression checks passed');
