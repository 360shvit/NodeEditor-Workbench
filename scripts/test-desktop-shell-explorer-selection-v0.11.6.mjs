import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const explorer = read('src/components/ProjectExplorer.tsx');
const layout = read('src/features/visual/VisualLayoutTab.tsx');
const selectionDialog = read('src/components/ExplorerSelectionDialog.tsx');
const layoutSidebar = read('src/features/visual/VisualLayoutSidebar.tsx');
const inspector = read('src/features/inspector/InspectorPane.tsx');
const css = read('src/styles.css');

// Historical v0.11.6 feature contract. Current release metadata is validated by the current release gate.
assert.match(css, /html,\s*\nbody,\s*\n#root\s*\{[\s\S]*?height: 100%;[\s\S]*?overflow: hidden;/);
assert.match(css, /\.app-shell\s*\{[\s\S]*?height: 100dvh;[\s\S]*?overflow: hidden;/);
assert.match(css, /\.workbench-body\s*\{[\s\S]*?min-height: 0;[\s\S]*?overflow: hidden;/);
assert.match(inspector, /inspector-content-scroll/);
assert.match(css, /\.inspector-content-scroll\s*\{[\s\S]*?overflow: auto;/);
assert.match(css, /\.explorer,\s*\n\.search-sidebar\s*\{\s*overflow: auto;/);
assert.match(css, /\.topbar,\s*\n\.developer-runtime-bar,\s*\n\.change-panel\s*\{ flex: 0 0 auto; \}/);

// The v0.11.6 compact graph-summary contract remains valid even if later releases add a camera viewport.
const uxMarker = css.indexOf('/* v0.11.6 — Desktop shell & Explorer selection UX');
assert.ok(uxMarker >= 0);
const nextMarker = css.indexOf('/* v0.11.7', uxMarker);
const uxCss = css.slice(uxMarker, nextMarker >= 0 ? nextMarker : undefined);
assert.match(uxCss, /\.project-graph-summary\s*\{[\s\S]*?align-items: flex-start;/);
assert.match(uxCss, /\.project-graph-summary span\s*\{[\s\S]*?flex: 0 0 auto;/);

// Explorer is reused as a selection tree rather than duplicated as a flat picker.
assert.match(explorer, /export interface ProjectExplorerSelectionMode/);
assert.match(explorer, /eligibleFileIds: string\[\]/);
assert.match(explorer, /onSelectionChange: \(fileIds: string\[\]\) => void/);
assert.match(explorer, /element\.indeterminate = partiallySelected/);
assert.match(explorer, /const \[selectionWorkspace, setSelectionWorkspace\]/);
assert.match(explorer, /const \[selectionFolderState, setSelectionFolderState\]/);
assert.match(explorer, /selection-disabled/);
assert.match(explorer, /Select scope/);
assert.match(explorer, /Clear scope/);

// Layout selection remains a draft transaction with explicit Confirm/Cancel, now owned by the shared dialog.
assert.match(layout, /const \[filePickerOpen, setFilePickerOpen\]/);
assert.match(layoutSidebar, /Choose files in Explorer…/);
assert.match(layout, /<ExplorerSelectionDialog/);
assert.match(layout, /confirmLabel="Use selected files"/);
assert.match(layout, /onCommit=\{\(fileIds\) =>/);
assert.match(layout, /setVisualSelectedFileIds\(fileIds\)/);
assert.match(selectionDialog, /const \[draftSelectedFileIds, setDraftSelectedFileIds\]/);
assert.match(selectionDialog, /<ProjectExplorer[\s\S]*?selectionMode=/);
assert.match(selectionDialog, /<button onClick=\{onCancel\}>Cancel<\/button>/);
assert.match(selectionDialog, /onCommit\(draftSelectedFileIds\.filter/);
assert.doesNotMatch(layout, /Choose files individually/);

console.log('v0.11.6 Desktop Shell & Explorer Selection UX compatibility checks passed');
