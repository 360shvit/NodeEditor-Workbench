import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const icons = read('src/components/LucideIcon.tsx');
const rail = read('src/components/WorkbenchRail.tsx');
const app = read('src/App.tsx');
const tabs = read('src/components/FileTabs.tsx');
const start = read('src/components/ProjectStartScreen.tsx');
const explorer = read('src/components/ProjectExplorer.tsx');
const fileState = read('src/components/FileStateIndicators.tsx');
const filterBar = read('src/components/FilterBar.tsx');
const changes = read('src/components/ChangePanel.tsx');
const notices = read('THIRD_PARTY_NOTICES.txt');
const sourceStyles = read('src/styles.css');
const embeddedStyles = read('tauri-ui/styles.css');
const embeddedApp = read('tauri-ui/app.js');

for (const name of [
  'folder-tree', 'search', 'triangle-alert', 'git-compare-arrows', 'layout-grid',
  'network', 'pencil', 'settings', 'arrow-left', 'arrow-right', 'x', 'pin',
  'pin-off', 'circle-check', 'circle-x', 'star', 'link-2', 'chevron-down',
  'chevron-right', 'corner-down-left', 'rotate-ccw', 'check', 'circle',
  'circle-dot', 'file-text', 'dot',
]) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(icons, new RegExp(`^  (?:['\"]${escaped}['\"]|${escaped}): \\[`, 'm'), `missing local Lucide icon: ${name}`);
}

for (const name of ['folder-tree', 'search', 'triangle-alert', 'git-compare-arrows', 'layout-grid', 'network', 'pencil', 'settings']) {
  assert.match(rail, new RegExp(`[\"']${name}[\"']`), `rail missing Lucide icon ${name}`);
}
assert.doesNotMatch(rail, /[▤⌕Δ◫◇✎⚙]/);

assert.match(app, /name="arrow-left"/);
assert.match(app, /name="arrow-right"/);
assert.match(app, /name="settings"/);
assert.doesNotMatch(app, />\s*[←→⚙]\s*</);

for (const name of ['search', 'link-2', 'triangle-alert', 'git-compare-arrows', 'layout-grid', 'network', 'x']) {
  assert.match(tabs, new RegExp(`[\"']${name}[\"']`), `tabs missing Lucide icon ${name}`);
}
assert.doesNotMatch(tabs, /[⌕↗Δ◫◇×]/);

assert.match(start, /name="pin"/);
assert.match(start, /pin-off/);
assert.match(start, /name="x"/);
assert.doesNotMatch(start, /[◆◇×]/);

for (const name of ['chevron-down', 'chevron-right', 'rotate-ccw', 'circle-dot', 'circle', 'x']) {
  assert.match(explorer, new RegExp(`[\"']${name}[\"']`), `explorer missing Lucide icon ${name}`);
}
for (const name of ['triangle-alert', 'circle-x', 'rotate-ccw', 'dot']) {
  assert.match(fileState, new RegExp(`[\"']${name}[\"']`), `file-state indicators missing Lucide icon ${name}`);
}
assert.doesNotMatch(explorer, /[▾▸↶●○×]/);

assert.match(filterBar, /name="x"/);
assert.match(filterBar, /name="check"/);
assert.match(filterBar, /name="star"/);

assert.match(changes, /name="git-compare-arrows"/);
assert.match(changes, /circle-check/);
assert.match(changes, /circle-x/);
assert.match(changes, /name="x"/);
assert.doesNotMatch(changes, /[Δ✓✕×]/);

assert.match(notices, /Lucide[\s\S]*ISC License/);
assert.match(notices, /does not[\s\S]*require a CDN, an icon font, or npm/);
assert.equal(sourceStyles, embeddedStyles, 'embedded Tauri CSS must match source CSS');
assert.match(embeddedApp, /define\("components\/LucideIcon"/);
assert.match(embeddedApp, /git-compare-arrows/);
assert.match(embeddedApp, /folder-tree/);

console.log('v0.9.2-r3 local Lucide SVG icon boundary OK');
