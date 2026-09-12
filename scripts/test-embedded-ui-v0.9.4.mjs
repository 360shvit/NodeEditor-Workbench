import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({
  console,
  globalThis: undefined,
  Promise,
  Set,
  Map,
  WeakMap,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Symbol,
  Error,
  TypeError,
  Date,
  Math,
  JSON,
  TextEncoder,
  TextDecoder,
  Blob,
  URL,
  URLSearchParams,
  DOMException,
  performance: { now: () => 0 },
  MessageChannel: class {
    constructor() {
      this.port1 = { onmessage: null };
      this.port2 = { postMessage: () => {} };
    }
  },
  setTimeout,
  clearTimeout,
});
context.globalThis = context;

for (const name of ['amd-loader.js', 'preact-lite.js', 'compat-modules.js', 'app.js']) {
  vm.runInContext(readFileSync(new URL(`../tauri-ui/${name}`, import.meta.url), 'utf8'), context, { filename: name });
}

const appModule = context.require('App');
const storeModule = context.require('store');
const bridgeModule = context.require('io/desktopBridge');
const lifecycleModule = context.require('projects/ProjectLifecycleGuard');
const reactModule = context.require('react');
assert.equal(typeof appModule.default, 'function');
assert.equal(typeof storeModule.useWorkbenchStore, 'function');
assert.equal(typeof bridgeModule.hasDesktopBridge, 'function');
assert.equal(typeof lifecycleModule.ProjectLifecycleProvider, 'function');
for (const hook of ['useState', 'useMemo', 'useCallback', 'useContext', 'useRef', 'useEffect']) {
  assert.equal(typeof reactModule[hook], 'function', `embedded React compatibility layer must export ${hook}`);
}
assert.equal(storeModule.useWorkbenchStore.getState().visualSettings.strategy, 'author-normalize');
assert.throws(() => context.require('components/SearchBar'));
assert.throws(() => context.require('features/node-layout/adapter'));

console.log(JSON.stringify({
  embeddedAmdBundleLoads: true,
  reactCompatHooksComplete: true,
  retiredModulesAbsent: true,
  defaultLayoutStrategy: storeModule.useWorkbenchStore.getState().visualSettings.strategy,
}, null, 2));
