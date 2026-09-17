import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const styles = read('src/styles.css');
const embeddedStyles = read('tauri-ui/styles.css');
const rail = read('src/components/WorkbenchRail.tsx');
const tabs = read('src/components/FileTabs.tsx');
const inspector = read('src/features/inspector/InspectorPane.tsx');
const modalFocus = read('src/workbench/modalFocus.ts');
const quick = read('src/components/QuickOpen.tsx');
const splitter = read('src/components/WorkbenchSplitter.tsx');
const roadmap = read('docs/PRE_1_0_AUDIT_ROADMAP.md');
const audit = read('docs/audits/PRE_1_0_03_ACCESSIBILITY_KEYBOARD.md');

assert.equal(styles, embeddedStyles, 'packaged CSS must match reviewed source CSS');
assert.match(styles, /@media \(forced-colors: active\)/);
assert.match(styles, /outline: 2px solid Highlight/);
assert.match(styles, /\[aria-current=\"page\"\]/);
assert.match(styles, /\[aria-pressed=\"true\"\]/);
assert.match(styles, /\[role=\"tab\"\]\[aria-selected=\"true\"\]/);
assert.match(styles, /\[role=\"option\"\]\[aria-selected=\"true\"\]/);
assert.match(styles, /background: CanvasText/);
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(styles, /button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, summary:focus-visible/);

assert.doesNotMatch(rail, /pressed \?\? active/);
assert.match(rail, /aria-pressed=\{pressed\}/);
assert.match(rail, /aria-current=\{current \? 'page' : undefined\}/);
assert.match(rail, /pressed=\{sidebarVisible && globalSidebarActive && effectiveGlobalSidebarView === view\}/);
assert.match(rail, /pressed=\{editing\}/);
assert.match(rail, /current=\{!!activeTabId\?\.startsWith\('tab:diagnostics:'\)\}/);
assert.match(rail, /label=\"Settings\" icon=\"settings\" onClick=\{onOpenSettings\}/);

assert.match(tabs, /role=\"tablist\"/);
assert.match(tabs, /role=\"tab\"/);
assert.match(tabs, /aria-selected=\{activeTabId === tab\.id\}/);
assert.match(tabs, /tabIndex=\{activeTabId === tab\.id \? 0 : -1\}/);
assert.match(tabs, /\['ArrowLeft', 'ArrowRight', 'Home', 'End'\]/);
assert.match(tabs, /role=\"menu\"/);
assert.match(tabs, /role=\"menuitem\"/);
assert.match(tabs, /\['ArrowDown', 'ArrowUp', 'Home', 'End'\]/);
assert.match(tabs, /event\.key === 'Escape'/);
assert.match(tabs, /returnFocusId/);
assert.match(inspector, /role=\{activeTab \? 'tabpanel' : undefined\}/);
assert.match(inspector, /aria-labelledby=\{activeTab \? workbenchTabDomId/);

assert.match(modalFocus, /event\.key !== 'Tab'/);
assert.match(modalFocus, /event\.key === 'Escape'/);
assert.match(modalFocus, /previousFocus\?\.isConnected/);
assert.match(quick, /role=\"combobox\"/);
assert.match(quick, /aria-activedescendant/);
assert.match(quick, /role=\"listbox\"/);
assert.match(quick, /role=\"option\"/);
assert.match(quick, /event\.key === 'ArrowDown'/);
assert.match(quick, /event\.key === 'ArrowUp'/);
assert.match(quick, /event\.key === 'Enter'/);

for (const marker of [/role=\"separator\"/, /aria-orientation=\{orientation\}/, /aria-valuemin=\{min\}/, /aria-valuemax=\{max\}/, /aria-valuenow=\{value\}/, /tabIndex=\{0\}/, /ArrowLeft/, /ArrowRight/, /ArrowUp/, /ArrowDown/, /Home/, /End/]) assert.match(splitter, marker);

assert.match(roadmap, /\| 03 \| Accessibility & keyboard interaction[\s\S]*?\| \*\*PASS\*\* \|/);
assert.match(roadmap, /Track 04 is next/);
assert.match(audit, /\*\*Status:\*\* PASS/);
assert.match(audit, /Finding 03-A/);
assert.match(audit, /Finding 03-B/);

console.log('Pre-1.0 Audit 03 — Accessibility/Keyboard: PASS');
