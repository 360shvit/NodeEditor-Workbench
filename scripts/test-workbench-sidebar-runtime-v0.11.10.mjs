import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({
  console,
  globalThis: undefined,
  Promise, Set, Map, WeakMap, Object, Array, String, Number, Boolean, Symbol, Error, TypeError, Date, Math, JSON,
  TextEncoder, TextDecoder, Blob, URL, URLSearchParams, DOMException,
  performance: { now: () => 0 },
  MessageChannel: class { constructor() { this.port1 = { onmessage: null }; this.port2 = { postMessage: () => {} }; } },
  setTimeout, clearTimeout,
});
context.globalThis = context;
for (const name of ['amd-loader.js', 'preact-lite.js', 'compat-modules.js', 'app.js']) {
  vm.runInContext(readFileSync(new URL(`../tauri-ui/${name}`, import.meta.url), 'utf8'), context, { filename: name });
}

const reactDom = context.require('react-dom');
assert.equal(typeof reactDom.createPortal, 'function', 'embedded compatibility must provide createPortal');

const { useWorkbenchStore } = context.require('store');
const normal = { id: 'tab:test', kind: 'source', path: 'Test.json' };
const visual = { id: 'tab:visual', kind: 'visual' };
const graph = { id: 'tab:project-graph', kind: 'project-graph' };
useWorkbenchStore.setState({
  tabs: [normal, visual, graph],
  activeTabId: normal.id,
  sidebarView: 'search',
  toolSidebarOverride: undefined,
  sidebarVisible: true,
});

const state = () => useWorkbenchStore.getState();
state().selectTab(visual.id);
assert.equal(state().sidebarView, 'search', 'tool tab must not overwrite persistent Search preference');
assert.equal(state().toolSidebarOverride, undefined);
assert.equal(state().sidebarVisible, true);

state().activateSidebar('explorer');
assert.equal(state().sidebarView, 'search', 'Explorer override on tool tab must remain transient');
assert.equal(state().toolSidebarOverride, 'explorer');
assert.equal(state().sidebarVisible, true);

state().selectTab(visual.id);
assert.equal(state().toolSidebarOverride, undefined, 'focusing tool tab again restores contextual sidebar');
assert.equal(state().sidebarView, 'search');

state().selectTab(normal.id);
assert.equal(state().toolSidebarOverride, undefined);
assert.equal(state().sidebarView, 'search', 'leaving a tool restores the previous persistent preference');

state().selectTab(graph.id);
assert.equal(state().sidebarView, 'search');
assert.equal(state().toolSidebarOverride, undefined);
state().activateSidebar('search');
assert.equal(state().toolSidebarOverride, 'search');
assert.equal(state().sidebarView, 'search');
state().selectTab(normal.id);
assert.equal(state().toolSidebarOverride, undefined);
assert.equal(state().sidebarView, 'search');

state().activateSidebar('explorer');
assert.equal(state().sidebarView, 'explorer', 'normal tabs may change the persistent global preference');
assert.equal(state().toolSidebarOverride, undefined);

console.log('v0.11.10 contextual sidebar runtime sequence passed');
