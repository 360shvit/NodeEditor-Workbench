import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const tsx = walk('src').filter((path) => path.endsWith('.tsx'));
for (const path of tsx) {
  const source = readFileSync(path, 'utf8');
  assert.doesNotMatch(source, /<[a-z][^>]*\btitle=/, `${path} must not reintroduce native title tooltips`);
}

const tooltip = readFileSync('src/components/UniversalTooltip.tsx', 'utf8');
assert.match(tooltip, /\[data-tooltip\]/);
assert.match(tooltip, /pointerover/);
assert.match(tooltip, /focusin/);
assert.match(tooltip, /HOVER_DELAY_MS/);

const app = readFileSync('src/App.tsx', 'utf8');
assert.match(app, /<UniversalTooltip \/>/);

const rail = readFileSync('src/components/WorkbenchRail.tsx', 'utf8');
assert.match(rail, /data-tooltip-side="right"/);

const store = readFileSync('src/store.ts', 'utf8');
assert.doesNotMatch(store, /if \(!openFiles\.length && project\.files\[0\]\) openFiles\.push\(project\.files\[0\]\)/);
assert.match(store, /const defaultDiagnosticsTab: DiagnosticsQueryTab/);
assert.match(store, /const restoredTabs: WorkbenchTab\[\] = \[\.\.\.fileTabs, \.\.\.sourceTabs\]/);
assert.match(store, /const tabs: WorkbenchTab\[\] = restoredTabs\.length \? restoredTabs : \[defaultDiagnosticsTab\]/);
assert.match(store, /const restoredActiveTabId = activeSourcePath \? sourceTabId\(activeSourcePath\) : activeFile \? fileTabId\(activeFile\.id\) : tabs\[0\]\?\.id \?\? defaultDiagnosticsTab\.id/);
assert.match(store, /activeTabId: restoredActiveTabId/);
assert.match(store, /paneActiveTabIds: \{ primary: restoredActiveTabId, secondary: undefined \}/);
assert.match(store, /const hasRestoredFileTabs = openFiles\.length > 0/);
assert.match(store, /if \(activeSourcePath && !sourcePaths\.includes\(activeSourcePath\)\) sourcePaths\.push\(activeSourcePath\)/);

console.log('v0.9.2-r4 universal hover + Diagnostics startup checks passed.');
