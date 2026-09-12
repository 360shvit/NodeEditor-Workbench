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
for (const name of ['amd-loader.js', 'preact-lite.js', 'compat-modules.js']) {
  vm.runInContext(readFileSync(new URL(`../tauri-ui/${name}`, import.meta.url), 'utf8'), context, { filename: name });
}

const jsxRuntime = context.require('react/jsx-runtime');
const React = context.require('react').default;

function assertLiveValueControl(type, props = {}) {
  const calls = [];
  const vnode = jsxRuntime.jsx(type, { ...props, onChange: (event) => calls.push(event.target.value) });
  assert.equal(typeof vnode.props.onInput, 'function', `${type}/${props.type ?? ''} should map React onChange to native input`);
  assert.equal(vnode.props.onChange, undefined, `${type}/${props.type ?? ''} must not also retain blur-time native change`);
  vnode.props.onInput({ target: { value: 'live' } });
  assert.deepEqual(calls, ['live']);
}

assertLiveValueControl('input', { type: 'text' });
assertLiveValueControl('input', { type: 'search' });
assertLiveValueControl('input', { type: 'number' });
assertLiveValueControl('textarea');

for (const type of ['checkbox', 'radio', 'file']) {
  const handler = () => {};
  const vnode = jsxRuntime.jsx('input', { type, onChange: handler });
  assert.equal(vnode.props.onChange, handler, `${type} should retain native change semantics`);
  assert.equal(vnode.props.onInput, undefined);
}

{
  const handler = () => {};
  const vnode = jsxRuntime.jsx('select', { onChange: handler });
  assert.equal(vnode.props.onChange, handler, 'select should retain native change semantics');
}

{
  const calls = [];
  const vnode = jsxRuntime.jsx('input', {
    type: 'search',
    onInput: () => calls.push('input'),
    onChange: () => calls.push('change'),
  });
  vnode.props.onInput({ target: { value: 'x' } });
  assert.deepEqual(calls, ['input', 'change'], 'existing onInput must be preserved before React onChange');
}

{
  const vnode = React.createElement('input', { type: 'search', onChange: () => {} });
  assert.equal(typeof vnode.props.onInput, 'function', 'React.createElement must use the same live-input compatibility path');
  assert.equal(vnode.props.onChange, undefined);
}

const quickOpen = readFileSync(new URL('../src/components/QuickOpen.tsx', import.meta.url), 'utf8');
const search = readFileSync(new URL('../src/components/SearchSidebar.tsx', import.meta.url), 'utf8');
assert.match(quickOpen, /onChange=\{\(event\) => setQuery\(event\.target\.value\)\}/, 'Quick Open should continue using normal React onChange semantics');
assert.match(search, /onChange=\{\(event\) => setQuery\(event\.target\.value\)\}/, 'Search should continue using normal React onChange semantics');

console.log(JSON.stringify({
  textInputs: 'native input event',
  searchInputs: 'native input event',
  numberInputs: 'native input event',
  textarea: 'native input event',
  checkboxRadioFile: 'native change event',
  select: 'native change event',
}, null, 2));
