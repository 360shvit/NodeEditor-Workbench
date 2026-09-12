import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(name, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const tabs = read('src/components/FileTabs.tsx');
const inspector = read('src/features/inspector/InspectorPane.tsx');
const modalFocus = read('src/workbench/modalFocus.ts');
const rename = read('src/components/RenameSymbolDialog.tsx');
const quick = read('src/components/QuickOpen.tsx');
const changes = read('src/components/ChangePanel.tsx');
const settings = read('src/components/WorkbenchSettings.tsx');
const selection = read('src/components/ExplorerSelectionDialog.tsx');
const lifecycle = read('src/projects/ProjectLifecycleGuard.tsx');
const runtime = read('src/support/runtimeDiagnostics.ts');
const app = read('src/App.tsx');
const embedded = read('tauri-ui/app.js');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.match(runtime, /profile: RELEASE_VALIDATION_PROFILE/);
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);

assert.match(tabs, /role="tablist"/);
assert.match(tabs, /role="tab"/);
assert.match(tabs, /aria-selected=\{activeTabId === tab\.id\}/);
assert.match(tabs, /tabIndex=\{activeTabId === tab\.id \? 0 : -1\}/);
assert.match(tabs, /ArrowLeft/);
assert.match(tabs, /ArrowRight/);
assert.match(tabs, /event\.key === 'Home'/);
assert.match(tabs, /event\.key === 'End'/);
assert.match(inspector, /role=\{activeTab \? 'tabpanel' : undefined\}/);
assert.match(inspector, /aria-labelledby=\{activeTab \? workbenchTabDomId/);

assert.match(tabs, /role="menu"/);
assert.match(tabs, /role="menuitem"/);
assert.match(tabs, /\['ArrowDown', 'ArrowUp', 'Home', 'End'\]/);
assert.match(tabs, /returnFocusId/);

assert.match(modalFocus, /FOCUSABLE_SELECTOR/);
assert.match(modalFocus, /event\.key !== 'Tab'/);
assert.match(modalFocus, /event\.key === 'Escape'/);
assert.match(modalFocus, /previousFocus/);
assert.match(modalFocus, /previousFocus\?\.isConnected/);

for (const source of [rename, quick, changes, settings, selection, lifecycle]) {
  assert.match(source, /useModalFocusTrap/);
  assert.match(source, /aria-modal="true"/);
}
assert.match(rename, /aria-labelledby="rename-symbol-title"/);
assert.match(changes, /aria-labelledby="change-review-title"/);
assert.match(lifecycle, /role="alertdialog"/);
assert.match(quick, /role="combobox"/);
assert.match(quick, /role="listbox"/);
assert.match(quick, /role="option"/);
assert.match(quick, /aria-activedescendant/);

assert.match(embedded, /exports\.RELEASE_VALIDATION_PROFILE = '[^']+'/);
assert.match(embedded, /role: "tablist"|"role": "tablist"/);
assert.match(embedded, /FOCUSABLE_SELECTOR/);
assert.match(embedded, /quick-open-results/);

console.log('v0.11.26 Accessibility & interaction consistency contract: PASS');
