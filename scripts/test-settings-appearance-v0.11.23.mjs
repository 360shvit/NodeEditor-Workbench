import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execTypeScript } from './typescript-cli.mjs';

const read = (name) => fs.readFileSync(name, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const capability = JSON.parse(read('src-tauri/capabilities/default.json'));
const app = read('src/App.tsx');
const settings = read('src/components/WorkbenchSettings.tsx');
const appearance = read('src/workbench/appearancePreferences.ts');
const runtime = read('tauri-ui/tauri-runtime.js');
const embedded = read('tauri-ui/app.js');
const styles = read('src/styles.css');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(settings, /Appearance/);
assert.match(settings, /Workbench/);
assert.match(settings, /Keyboard/);
assert.match(settings, /Diagnostics/);
assert.match(settings, /About/);
assert.match(settings, /80%|formatWorkbenchUiScale/);
assert.match(settings, /Current scale/);
assert.match(settings, /Ctrl\/Cmd \+ Plus/);
assert.match(appearance, /hytale-workbench\.appearance\.v1/);
assert.match(appearance, /\[0\.8, 0\.9, 1, 1\.1, 1\.25\]/);
assert.match(app, /stepWorkbenchUiScale/);
assert.match(app, /event\.key === '\+'/);
assert.match(app, /event\.key === '-'/);
assert.match(app, /event\.key === '0'/);
assert.match(runtime, /__HYTALE_UI_SCALE__/);
assert.match(runtime, /getCurrentWebview/);
assert.match(runtime, /setZoom/);
assert.match(embedded, /hytale-workbench\.appearance\.v1/);
assert.match(embedded, /WorldGen Performance/);
assert.match(embedded, /settings-navigation/);
assert.match(embedded, /Automatic updates/);
assert.deepEqual(capability.permissions, ['core:event:default', 'core:webview:allow-set-webview-zoom']);
assert.doesNotMatch(JSON.stringify(capability), /fs:|shell:|process:|http:/);
assert.match(styles, /settings-modal-v2/);
assert.match(styles, /settings-navigation/);
assert.match(styles, /ui-scale-picker/);
assert.match(styles, /@media \(max-width: 860px\)/);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hgw-appearance-'));
try {
  execTypeScript([
    'src/workbench/appearancePreferences.ts',
    '--target', 'ES2022',
    '--module', 'ES2022',
    '--lib', 'ES2022,DOM',
    '--strict',
    '--skipLibCheck',
    '--outDir', temp,
  ], { stdio: 'pipe' });
  const moduleUrl = pathToFileURL(path.join(temp, 'appearancePreferences.js')).href + `?t=${Date.now()}`;
  const mod = await import(moduleUrl);

  const storage = new Map();
  const style = {
    zoom: '',
    removeProperty(name) { if (name === 'zoom') this.zoom = ''; },
  };
  globalThis.document = { documentElement: { dataset: {}, style } };
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  };

  assert.equal(mod.readWorkbenchAppearancePreferences().uiScale, 1);
  assert.equal(mod.stepWorkbenchUiScale(1, 1), 1.1);
  assert.equal(mod.stepWorkbenchUiScale(1, -1), 0.9);
  assert.equal(mod.stepWorkbenchUiScale(1.25, 1), 1.25);
  assert.equal(mod.stepWorkbenchUiScale(0.8, -1), 0.8);
  assert.equal(mod.persistWorkbenchAppearancePreferences(1.1), true);
  assert.equal(JSON.parse(storage.get(mod.WORKBENCH_APPEARANCE_STORAGE_KEY)).uiScale, 1.1);
  storage.set(mod.WORKBENCH_APPEARANCE_STORAGE_KEY, JSON.stringify({ version: 1, uiScale: 9 }));
  assert.equal(mod.readWorkbenchAppearancePreferences().uiScale, 1, 'invalid stored scale must fail back to 100%');

  let nativeZoom;
  globalThis.window.__HYTALE_UI_SCALE__ = { setZoom: async (scale) => { nativeZoom = scale; } };
  style.zoom = '0.9';
  assert.equal(await mod.applyWorkbenchUiScale(1.25), 'native');
  assert.equal(nativeZoom, 1.25);
  assert.equal(style.zoom, '');
  assert.equal(globalThis.document.documentElement.dataset.uiScale, '125');

  delete globalThis.window.__HYTALE_UI_SCALE__;
  assert.equal(await mod.applyWorkbenchUiScale(0.9), 'css');
  assert.equal(style.zoom, '0.9');

  mod.resetWorkbenchAppearancePreferences();
  assert.equal(storage.has(mod.WORKBENCH_APPEARANCE_STORAGE_KEY), false);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
  delete globalThis.window;
  delete globalThis.document;
}

console.log('v0.11.23 Settings & Appearance regression passed.');
