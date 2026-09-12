import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnTypeScript } from './typescript-cli.mjs';
import { pathToFileURL } from 'node:url';

const read = (file) => fs.readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const registry = read('src/commands/commandRegistry.ts');
const settings = read('src/components/HotkeySettings.tsx');
const workbenchSettings = read('src/components/WorkbenchSettings.tsx');
const nodeCard = read('src/components/NodeCard.tsx');
const quickOpen = read('src/components/QuickOpen.tsx');
const persistence = read('src/projects/projectPersistence.ts');
const styles = read('src/styles.css');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(read('BUILD_ID.txt'), /v0\.11\.[0-9]+-r[0-9]+-[a-z0-9-]+/);
assert.match(read('src/App.tsx'), /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(read('src/support/runtimeDiagnostics.ts'), /RELEASE_DISPLAY_VERSION/);
assert.match(read('src/support/runtimeDiagnostics.ts'), /profile: RELEASE_VALIDATION_PROFILE/);

// Hotkey architecture: defaults remain centrally declared and overrides are global preferences.
assert.match(registry, /HOTKEY_PREFERENCES_KEY = 'hytale-workbench\.hotkeys\.v1'/);
assert.match(registry, /loadHotkeyPreferences/);
assert.match(registry, /effectiveShortcut/);
assert.match(registry, /commandShortcutConflicts\(preferences/);
assert.match(registry, /hotkeyAssignmentConflict/);
assert.match(registry, /shortcutFromKeyboardEvent/);
assert.match(registry, /commandForKeyboardEvent\(event: KeyboardEvent, preferences = loadHotkeyPreferences\(\)\)/);
assert.match(settings, /Reset all/);
assert.match(settings, /Unassign/);
assert.match(settings, /already used by/);
assert.match(settings, /setHotkeyOverride\(capturing, null/);
assert.match(settings, /setHotkeyOverride\(id, undefined/);
assert.match(workbenchSettings, /<HotkeySettings \/>/);
assert.match(quickOpen, /effectiveShortcut\(command\.id\) \?\? 'Unassigned'/);

// Node collapse is local/transient and focus navigation reopens the target.
assert.match(nodeCard, /const \[collapsed, setCollapsed\] = useState\(false\)/);
assert.match(nodeCard, /focusedNode\?\.fileId === node\.fileId && focusedNode\.nodeId === node\.id/);
assert.match(nodeCard, /setCollapsed\(false\)/);
assert.match(nodeCard, /aria-expanded=\{!collapsed\}/);
assert.match(nodeCard, /!collapsed && <div className="field-list">/);
assert.match(nodeCard, /!collapsed && <details className="technical-details">/);
assert.match(styles, /\.node-collapse-button/);
assert.doesNotMatch(persistence, /collapsedNode|nodeCollapse|collapsedNodes/i, 'node collapse must not enter ProjectSession persistence');


// Execute the registry logic in isolation to prove overrides/conflicts/reset semantics.
const tmp = path.resolve('.ux-polish-test-build');
fs.rmSync(tmp, { recursive: true, force: true });
const compile = spawnTypeScript([
  'src/commands/commandRegistry.ts', '--target', 'ES2022', '--module', 'ES2022', '--lib', 'ES2022,DOM',
  '--skipLibCheck', '--outDir', tmp,
], { encoding: 'utf8' });
assert.equal(compile.status, 0, compile.stdout + compile.stderr);

const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  },
  dispatchEvent: () => true,
};
globalThis.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };
globalThis.HTMLElement = class HTMLElement {};
const built = await import(pathToFileURL(path.join(tmp, 'commandRegistry.js')).href + `?v=${Date.now()}`);
assert.equal(built.effectiveShortcut('quickOpen'), 'Mod+P');
let preferences = built.setHotkeyOverride('quickOpen', 'Mod+K');
assert.equal(built.effectiveShortcut('quickOpen', preferences), 'Mod+K');
assert.equal(built.hotkeyAssignmentConflict('showExplorer', 'Mod+K', preferences)?.id, 'quickOpen');
preferences = built.setHotkeyOverride('quickOpen', null, preferences);
assert.equal(built.effectiveShortcut('quickOpen', preferences), undefined);
preferences = built.setHotkeyOverride('quickOpen', undefined, preferences);
assert.equal(built.effectiveShortcut('quickOpen', preferences), 'Mod+P');
preferences = built.setHotkeyOverride('showExplorer', 'Mod+K', preferences);
preferences = built.resetHotkeyPreferences();
assert.deepEqual(preferences.overrides, {});
assert.equal(built.effectiveShortcut('showExplorer', preferences), 'Mod+Shift+E');
fs.rmSync(tmp, { recursive: true, force: true });

console.log('v0.11.17 Workbench UX Polish source/runtime contract passed');
