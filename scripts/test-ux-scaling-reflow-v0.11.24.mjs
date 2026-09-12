import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(name, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const capability = JSON.parse(read('src-tauri/capabilities/default.json'));
const styles = read('src/styles.css');
const embeddedStyles = read('tauri-ui/styles.css');
const app = read('src/App.tsx');
const embedded = read('tauri-ui/app.js');
const appearance = read('src/workbench/appearancePreferences.ts');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(embedded, /exports\.RELEASE_MILESTONE = 'v[^']+'/);
assert.match(embedded, /exports\.RELEASE_MILESTONE_NAME = '[^']+'/);
assert.match(appearance, /\[0\.8, 0\.9, 1, 1\.1, 1\.25\]/, 'bounded UI scale set remains unchanged');
assert.deepEqual(capability.permissions, ['core:event:default', 'core:webview:allow-set-webview-zoom']);

const milestone = styles.lastIndexOf('/* v0.11.24 · UX Scaling & Reflow Hardening');
assert.ok(milestone >= 0, 'v0.11.24 reflow block must exist');
assert.ok(styles.lastIndexOf('body { min-width: 0; }') > milestone, 'late CSS override must remove legacy body min-width clipping');
assert.match(styles, /grid-template-columns: 50px min\(var\(--workbench-sidebar-width, 292px\), 38vw\) 6px minmax\(0, 1fr\)/);
assert.match(styles, /container-type: inline-size; container-name: workbench-pane/);
assert.match(styles, /@container workbench-pane \(max-width: 620px\)/);
assert.match(styles, /@container workbench-pane \(max-width: 390px\)/);
assert.match(styles, /@media \(max-width: 980px\)/);
assert.match(styles, /\.settings-modal-v2[\s\S]*width: calc\(100vw - 20px\)/);
assert.match(styles, /\.review-change \{ grid-template-columns: minmax\(160px, \.8fr\) minmax\(0, 1\.2fr\); \}/);
assert.match(styles, /\.visual-grid,[\s\S]*\.visual-setup-grid \{ grid-template-columns: 1fr; \}/);
assert.match(styles, /\.field-actions \{ grid-column: 1 \/ -1; justify-content: flex-start; flex-wrap: wrap; \}/);
assert.match(styles, /\.field-row \{ grid-template-columns: 1fr; padding: 9px; \}/);
assert.match(styles, /\.rename-values \{ grid-template-columns: 1fr; \}/);
assert.match(styles, /min-width: 28px;\s*min-height: 28px;/);
assert.match(styles, /\.explorer-section-label \{ color: #8192a7; \}/);
assert.match(styles, /\.node-id \{ color: #8292a6; \}/);
assert.match(styles, /\.project-graph-hint,[\s\S]*\.quick-open-results em \{\s*font-size: 10px;/);
assert.equal(styles, embeddedStyles, 'packaged desktop CSS must match source CSS byte-for-byte');

// Regression contract: the milestone must not widen native authority.
const serializedCapability = JSON.stringify(capability);
assert.doesNotMatch(serializedCapability, /fs:|shell:|process:|http:/);

console.log('v0.11.24 UX scaling & reflow contract: PASS');
