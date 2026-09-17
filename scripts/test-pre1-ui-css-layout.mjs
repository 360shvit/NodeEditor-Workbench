import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');

const styles = read('src/styles.css');
const embeddedStyles = read('tauri-ui/styles.css');
const splitter = read('src/components/WorkbenchSplitter.tsx');
const prefs = read('src/workbench/workbenchLayoutPreferences.ts');
const modalFocus = read('src/workbench/modalFocus.ts');
const fileTabs = read('src/components/FileTabs.tsx');
const quickOpen = read('src/components/QuickOpen.tsx');
const settings = read('src/components/WorkbenchSettings.tsx');
const changes = read('src/components/ChangePanel.tsx');
const rename = read('src/components/RenameSymbolDialog.tsx');
const selection = read('src/components/ExplorerSelectionDialog.tsx');
const lifecycle = read('src/projects/ProjectLifecycleGuard.tsx');
const roadmap = read('docs/PRE_1_0_AUDIT_ROADMAP.md');
const audit = read('docs/audits/PRE_1_0_01_UI_CSS_LAYOUT.md');

// The installed desktop package must receive the exact stylesheet reviewed here.
assert.equal(styles, embeddedStyles, 'packaged desktop CSS must match source CSS byte-for-byte');

// A historical desktop minimum width is allowed only because the later hardening
// block explicitly neutralizes it for DPI/UI-scale reflow.
const legacyBodyMin = styles.indexOf('body { margin: 0; min-width: 1080px;');
const responsiveReset = styles.lastIndexOf('body { min-width: 0; }');
assert.ok(legacyBodyMin >= 0, 'expected historical desktop minimum-width baseline');
assert.ok(responsiveReset > legacyBodyMin, 'responsive body min-width reset must win later in the cascade');
assert.match(styles, /html, body, #root \{ min-width: 0; \}/);

// The Workbench shell must keep its work area shrinkable and clamp the sidebar
// rather than allowing child minimum-content width to force horizontal clipping.
assert.match(styles, /grid-template-columns: 50px min\(var\(--workbench-sidebar-width, 292px\), 38vw\) 6px minmax\(0, 1fr\)/);
assert.match(styles, /\.workbench-body\.sidebar-collapsed[\s\S]*?50px minmax\(0, 1fr\)/);
assert.match(prefs, /WORKBENCH_SIDEBAR_MIN_WIDTH = 220/);
assert.match(prefs, /WORKBENCH_SIDEBAR_MAX_WIDTH = 520/);
assert.match(prefs, /WORKBENCH_SPLIT_MIN_RATIO = 0\.25/);
assert.match(prefs, /WORKBENCH_SPLIT_MAX_RATIO = 0\.75/);

// Split-view content must respond to pane width, not only outer viewport width.
assert.match(styles, /container-type: inline-size; container-name: workbench-pane/);
assert.match(styles, /@container workbench-pane \(max-width: 620px\)/);
assert.match(styles, /@container workbench-pane \(max-width: 390px\)/);
assert.match(styles, /@container workbench-pane \(max-width: 760px\)[\s\S]*\.worldgen-performance-metrics/);
assert.match(styles, /@container workbench-pane \(max-width: 480px\)[\s\S]*\.worldgen-performance-report-bar \{ grid-template-columns: 1fr; \}/);

// Critical dense layouts must have a single-column narrow-state escape hatch.
assert.match(styles, /\.field-row \{ grid-template-columns: 1fr; padding: 9px; \}/);
assert.match(styles, /\.rename-values \{ grid-template-columns: 1fr; \}/);
assert.match(styles, /\.visual-grid,[\s\S]*\.visual-setup-grid \{ grid-template-columns: 1fr; \}/);
assert.match(styles, /\.settings-modal-v2[\s\S]*width: calc\(100vw - 20px\)/);

// Keyboard/focus semantics are part of layout integrity because splitters,
// overlays and tab strips are structural navigation controls.
for (const marker of [
  /role="separator"/,
  /aria-orientation=\{orientation\}/,
  /aria-valuemin=\{min\}/,
  /aria-valuemax=\{max\}/,
  /aria-valuenow=\{value\}/,
  /tabIndex=\{0\}/,
  /ArrowLeft/,
  /ArrowRight/,
  /Home/,
  /End/,
]) {
  assert.match(splitter, marker);
}
assert.match(fileTabs, /role="tablist"/);
assert.match(fileTabs, /aria-selected=\{activeTabId === tab\.id\}/);
assert.match(quickOpen, /role="combobox"/);
assert.match(quickOpen, /aria-activedescendant/);
assert.match(styles, /button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, summary:focus-visible/);
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);

assert.match(modalFocus, /FOCUSABLE_SELECTOR/);
assert.match(modalFocus, /previousFocus/);
for (const source of [settings, changes, rename, selection, lifecycle, quickOpen]) {
  assert.match(source, /useModalFocusTrap/);
  assert.match(source, /aria-modal="true"/);
}

// The roadmap and audit result are themselves part of the durable pre-1.0 gate.
assert.match(roadmap, /\| 01 \| UI, CSS & Workbench layout integrity/);
assert.match(roadmap, /\*\*PASS\*\*/);
assert.match(roadmap, /Track 03 is next/);
assert.match(audit, /Result:\*\* \*\*PASS/);
assert.match(audit, /computed\/visual/);
assert.match(audit, /Generator layout algorithm is intentionally out of this track/);

console.log('Pre-1.0 Audit 01 — UI/CSS/Layout: PASS');
