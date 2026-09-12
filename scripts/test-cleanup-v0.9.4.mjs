import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const url = (path) => new URL(`../${path}`, import.meta.url);
const bridge = readFileSync(url('src/io/desktopBridge.ts'), 'utf8');
const styles = readFileSync(url('src/styles.css'), 'utf8');
const lifecycle = readFileSync(url('src/projects/ProjectLifecycleGuard.tsx'), 'utf8');
const settings = readFileSync(url('src/components/WorkbenchSettings.tsx'), 'utf8');

for (const retired of [
  'src/components/SearchBar.tsx',
  'src/components/DiagnosticsSummary.tsx',
  'src/components/VisualTabButton.tsx',
  'src/features/node-layout/adapter.ts',
  'scripts/test-portable-bridge.mjs',
  'tsconfig.app.tsbuildinfo',
]) assert.equal(existsSync(url(retired)), false, `${retired} should not ship in v0.9.4`);

assert.doesNotMatch(bridge, /__HYTALE_DESKTOP_TOKEN__|X-Hytale-Workbench-Token|bridgeHeaders/);
assert.doesNotMatch(styles, /\.global-search|\.diagnostics-summary|\.visual-open-button|\.editing-switch|\.editing-hint|\.editing-control|\.editing-segment/);
assert.match(lifecycle, /cancelButtonRef/);
assert.match(lifecycle, /useModalFocusTrap/);
assert.match(settings, /role="dialog"/);
assert.match(settings, /closeButtonRef/);
assert.match(settings, /useModalFocusTrap/);

console.log('v0.9.4 cleanup and interaction-polish checks passed.');
