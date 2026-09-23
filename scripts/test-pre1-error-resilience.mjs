import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { setImmediate as tick } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';
const read = path => fs.readFileSync(path, 'utf8');
let invoke;
const calls = [];
const window = { __TAURI__: { core: { invoke: async (...args) => { calls.push(args); return invoke(...args); } } },
  fetch: async () => { throw Error('unexpected network'); }, location: { href: 'http://tauri.localhost/', reload() {} },
  localStorage: { getItem() { return null; }, setItem() {} }, addEventListener() {}, removeEventListener() {},
};
class FixtureURL extends URL { static createObjectURL() { return 'blob:fixture'; } static revokeObjectURL() {} }
class Anchor { click() {} }
vm.runInNewContext(read('tauri-ui/tauri-runtime.js'), { window, URL: FixtureURL, Request, Response, Blob, ArrayBuffer, Uint8Array,
  HTMLAnchorElement: Anchor, console: { info() {}, error() {} }, setTimeout, Error });
// Only null native picker results mean cancellation. Path names and OS errors do not.
for (const route of ['/api/project/open', '/api/project/open-recent', '/api/project/apply', '/api/output/export', '/api/worldgen/performance', '/api/app/update/check']) {
  invoke = async () => { throw Error('Cannot read C:/Projects/cancelled/World.json'); };
  const response = await window.fetch(route, { body: '{}' });
  assert.equal(response.status, 500, `${route}: real error containing cancel must remain visible`);
}
for (const route of ['/api/project/open', '/api/project/probe/select', '/api/worldgen/log/select', '/api/worldgen/log/folder/select', '/api/output/select']) {
  invoke = async () => null;
  assert.equal((await window.fetch(route)).status, 204);
}
invoke = async () => { throw { toString() { throw Error('do not coerce'); } }; };
assert.equal((await window.fetch('/api/project/open')).status, 500, 'unexpected rejection objects still become visible errors');

const context = vm.createContext({ window, localStorage: window.localStorage, console, Promise, Set, Map, WeakMap, WeakSet, Object, Array, String, Number, Boolean, Symbol, Error, TypeError, Date, Math, JSON,
  TextEncoder, TextDecoder, Blob, URL: FixtureURL, URLSearchParams, DOMException, performance, setTimeout, clearTimeout,
  MessageChannel: class { constructor() { this.port1 = {}; this.port2 = { postMessage() {} }; } },
});
context.globalThis = context;
for (const file of ['amd-loader.js', 'preact-lite.js', 'compat-modules.js', 'app.js']) vm.runInContext(read(`tauri-ui/${file}`), context);
const runtime = context.require('support/runtimeDiagnostics');
const options = { includeProjectPaths: false, includeLogs: true, includePerformance: true };
invoke = async command => { assert.equal(command, 'select_support_report_target'); return null; };
assert.equal(await runtime.downloadDiagnosticReport(options), 'cancelled');
assert.ok(!runtime.runtimeEvents().some(event => event.event === 'support.report.exported'));
let finishWrite;
invoke = async (command, bytes, opts) => {
  if (command === 'select_support_report_target') return { token: 'save-fixture' };
  assert.equal(command, 'write_registered_binary'); assert.equal(opts.headers['X-Hytale-Save-Token'], 'save-fixture');
  assert.equal(JSON.parse(new TextDecoder().decode(bytes)).privacy.projectContentsIncluded, false);
  await new Promise(resolve => { finishWrite = resolve; });
};
let resolved = false;
const saving = runtime.downloadDiagnosticReport(options).then(outcome => { resolved = true; return outcome; });
await tick(); assert.equal(resolved, false); finishWrite(); assert.equal(await saving, 'saved');
const exportsBefore = runtime.runtimeEvents().filter(event => event.event === 'support.report.exported').length;
invoke = async command => { if (command === 'select_support_report_target') return { token: 'save-fixture' }; throw Error('disk full'); };
await assert.rejects(runtime.downloadDiagnosticReport(options), /disk full/);
assert.equal(runtime.runtimeEvents().filter(event => event.event === 'support.report.exported').length, exportsBefore);
const saveBridge = window.__HYTALE_SAVE_DIAGNOSTIC_REPORT__;
delete window.__HYTALE_SAVE_DIAGNOSTIC_REPORT__;
await assert.rejects(runtime.downloadDiagnosticReport(options), /unavailable/);
window.__HYTALE_SAVE_DIAGNOSTIC_REPORT__ = saveBridge;

function text(node) { if (node == null || typeof node === 'boolean') return ''; if (Array.isArray(node)) return node.map(text).join(' '); if (typeof node !== 'object') return String(node); return text(node.props?.children); }
function nodes(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }
function button(tree, label) { const found = nodes(tree).find(node => node.type === 'button' && text(node).trim() === label); assert.ok(found, `button ${label}`); return found; }
const { AppErrorBoundary } = context.require('components/AppErrorBoundary');
const boundary = new AppErrorBoundary({ children: 'children' });
boundary.setState = patch => Object.assign(boundary.state, typeof patch === 'function' ? patch(boundary.state) : patch);
const brokenError = new Error();
Object.defineProperty(brokenError, 'message', { get() { throw Error('message unavailable'); } });
for (const failure of [null, undefined, false, '', brokenError]) {
  Object.assign(boundary.state, AppErrorBoundary.getDerivedStateFromError(failure));
  assert.match(text(boundary.render()), /The interface could not be rendered/, 'falsey/malformed exceptions still render the fatal fallback');
}
Object.assign(boundary.state, AppErrorBoundary.getDerivedStateFromError({ toString() { throw Error('fallback must survive'); } }));
let reloaded = 0; window.location.reload = () => reloaded++;
assert.doesNotThrow(() => boundary.render());
assert.ok(!text(boundary.render()).includes('project files have not been modified'));
button(boundary.render(), 'Reload').props.onClick(); assert.equal(reloaded, 0);
assert.match(text(boundary.render()), /staged changes|Undo\/Redo/);
button(boundary.render(), 'Cancel reload').props.onClick(); assert.equal(reloaded, 0);
button(boundary.render(), 'Reload').props.onClick();
button(boundary.render(), 'Discard session & reload').props.onClick(); assert.equal(reloaded, 1);
button(boundary.render(), 'Save diagnostic report').props.onClick(); await tick();
assert.match(text(boundary.render()), /disk full/);
invoke = async () => null;
button(boundary.render(), 'Save diagnostic report').props.onClick(); await tick();
assert.match(text(boundary.render()), /cancelled/);

const preferences = context.require('release/updatePreferences');
context.localStorage = { getItem: () => 'stable', setItem() { throw Error('read-only storage'); } };
assert.equal(preferences.readUpdateChannel('preview'), 'stable', 'explicit stable preference must survive a preview-default build');
assert.doesNotThrow(() => preferences.persistUpdateChannel('preview'));
Object.defineProperty(context, 'localStorage', { configurable: true, get() { throw Error('storage denied'); } });
assert.equal(preferences.readUpdateChannel('preview'), 'preview');
assert.doesNotThrow(() => preferences.persistUpdateChannel('stable'));
Object.defineProperty(context, 'localStorage', { configurable: true, value: window.localStorage, writable: true });

// Run real component handlers with deterministic hook state and controlled I/O.
// This verifies state/outcomes, not installed WebView rendering or focus behavior.
const react = context.require('react');
context.require('workbench/modalFocus').useModalFocusTrap = () => {};
const store = context.require('store');
const defaults = store.useWorkbenchStore.getState();
let state = { ...defaults };
store.useWorkbenchStore = selector => selector(state);
store.useWorkbenchStore.getState = () => state;
const bridge = context.require('io/desktopBridge');
const nativeClose = { callback: undefined };
bridge.subscribeDesktopAppCloseRequested = callback => { nativeClose.callback = callback; return () => {}; };
bridge.desktopSetPendingChangeCount = async () => {};
function component(Component, props = {}) {
  const slots = []; let index = 0, effects = [];
  return { render() {
    index = 0; effects = [];
    react.useState = initial => { const id = index++; if (!(id in slots)) slots[id] = typeof initial === 'function' ? initial() : initial;
      return [slots[id], next => { slots[id] = typeof next === 'function' ? next(slots[id]) : next; }]; };
    react.useRef = initial => { const id = index++; return slots[id] ??= { current: initial }; };
    react.useMemo = callback => callback(); react.useCallback = callback => callback;
    react.useEffect = (callback, dependencies) => { const id = index++; const previous = slots[id];
      if (!previous || !dependencies || dependencies.some((value, i) => !Object.is(value, previous[i]))) { slots[id] = dependencies; effects.push(callback); } };
    const tree = Component(props); for (const effect of effects) effect(); return tree;
  } };
}
const { WorkbenchSettings } = context.require('components/WorkbenchSettings');
const settings = component(WorkbenchSettings, { onClose() {}, sidebarWidth: 300, splitRatio: 0.5, uiScale: 1, onResetLayout() {}, onUiScaleChange() {}, onResetUiScale() {} });
button(settings.render(), 'Diagnostics Logs and support').props.onClick();
invoke = async () => null;
button(settings.render(), 'Save diagnostic JSON').props.onClick(); await tick();
assert.match(text(settings.render()), /Save cancelled/);
invoke = async () => { throw Error('native save failure'); };
button(settings.render(), 'Save diagnostic JSON').props.onClick(); await tick();
assert.match(text(settings.render()), /native save failure/);
assert.equal(button(settings.render(), 'Save diagnostic JSON').props.disabled, false);
button(settings.render(), 'About Runtime and version').props.onClick();
bridge.desktopCheckForUpdate = async () => ({ configured: true, available: true, version: '9.9.9' });
button(settings.render(), 'Check').props.onClick(); await tick();
button(settings.render(), 'Install & restart');
bridge.desktopCheckForUpdate = async () => { throw Error('offline fixture'); };
button(settings.render(), 'Check').props.onClick(); await tick();
const failedCheck = settings.render();
assert.match(text(failedCheck), /offline fixture/);
assert.ok(!nodes(failedCheck).some(node => node.type === 'button' && text(node) === 'Install & restart'));
assert.equal(button(failedCheck, 'Check').props.disabled, false);

const { ProjectLifecycleProvider } = context.require('projects/ProjectLifecycleGuard');
let closed = 0;
state = { ...defaults, project: {}, changeSet: { changes: [], rules: [] }, closeProject: () => { closed++; } };
const lifecycle = component(ProjectLifecycleProvider, { children: 'project stays open' });
bridge.desktopCloseProject = async () => { throw Error('close failed'); };
assert.equal(await lifecycle.render().props.value.requestCloseProject(), false);
assert.equal(closed, 0); assert.match(text(lifecycle.render()), /close failed/);
bridge.desktopExitApplication = async () => { throw Error('exit failed'); };
nativeClose.callback(); await tick(); assert.match(text(lifecycle.render()), /exit failed/);
const retainedChanges = { changes: [{ id: 'keep' }], rules: [] }; state.changeSet = retainedChanges;
const closing = lifecycle.render().props.value.requestCloseProject();
button(lifecycle.render(), 'Discard & Close').props.onClick();
assert.equal(await closing, false); assert.equal(state.changeSet, retainedChanges); assert.equal(closed, 0);
state.changeSet = { changes: [], rules: [] };
bridge.desktopCloseProject = async () => {};
assert.equal(await lifecycle.render().props.value.requestCloseProject(), true); assert.equal(closed, 1);

const core = context.require('core/index');
const malformed = core.buildProject([{ path: 'Density/Broken.json', text: '{"Type":' }]);
assert.ok(malformed.files[0].parseError);
assert.equal(malformed.files[0].sourceText, '{"Type":');
assert.equal(malformed.files[0].nodes.length, 0);
const corrected = core.buildProject([{ path: 'Density/Broken.json', text: '{"Type":"Constant","Value":1}' }]);
assert.ok(!corrected.files[0].parseError, 'correcting malformed input permits a new parse without stale failure');
const project = core.buildProject([{ path: 'Density/Fixture.json', text: JSON.stringify({ $NodeId: 'Constant.Density-fixture', Type: 'Constant', Value: 1, $NodeEditorMetadata: { $Nodes: { 'Constant.Density-fixture': { $Position: { $x: 1000, $y: 1000 } } } } }) }]);
let changeWrites = 0;
state = { ...defaults, project, editing: true, visualSelectedFileIds: [project.files[0].id], visualLayoutGenerateRequest: 0, changeSet: retainedChanges, setChangeSet() { changeWrites++; } };
const layout = component(context.require('features/visual/VisualLayoutTab').VisualLayoutTab);
layout.render();
const normalize = context.require('core/layout/normalize'); const originalBuild = normalize.buildLayoutProposal;
normalize.buildLayoutProposal = () => { throw Error('layout generation failed'); };
state.visualLayoutGenerateRequest++;
assert.doesNotThrow(() => layout.render());
assert.match(text(layout.render()), /layout generation failed/); assert.equal(changeWrites, 0);
normalize.buildLayoutProposal = originalBuild;
state.visualLayoutGenerateRequest++; layout.render();
const stage = context.require('core/layout/stage'); const originalStage = stage.stageLayoutProposal;
stage.stageLayoutProposal = () => { throw Error('layout staging failed'); };
assert.equal(button(layout.render(), 'Stage proposal').props.disabled, false);
assert.doesNotThrow(() => button(layout.render(), 'Stage proposal').props.onClick());
assert.match(text(layout.render()), /layout staging failed/); assert.equal(changeWrites, 0);
stage.stageLayoutProposal = originalStage;
state.visualLayoutGenerateRequest++; layout.render();
assert.ok(!text(layout.render()).includes('layout staging failed'), 'generation retries recover the local error state');

assert.doesNotMatch(read('tauri-ui/tauri-runtime.js'), /includes\('cancel'\)/);
console.log('Pre-1.0 Audit 13 — error handling/resilience: PASS (native cancellation, report outcomes, fatal recovery, storage/update failure, lifecycle and layout retries)');
