import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute the shipped component, hooks and store. This drives component events,
// not a browser DOM or the installed Windows client.
const context = vm.createContext({
  console, Promise, Set, Map, WeakMap, Object, Array, String, Number, Boolean,
  Symbol, Error, TypeError, Date, Math, JSON, TextEncoder, TextDecoder, Blob,
  URL, URLSearchParams, DOMException, performance: { now: () => 0 },
  MessageChannel: class { constructor() { this.port1 = {}; this.port2 = { postMessage() {} }; } },
  setTimeout, clearTimeout,
});
context.globalThis = context;
for (const name of ['amd-loader.js', 'preact-lite.js', 'compat-modules.js', 'app.js']) {
  vm.runInContext(readFileSync(new URL(`../tauri-ui/${name}`, import.meta.url), 'utf8'), context, { filename: name });
}
const P = context.PreactLite;
const core = context.require('core');
const { NodeCard } = context.require('components/NodeCard');
const { useWorkbenchStore: store } = context.require('store');
const makeProject = (value = 1) => core.buildProject([{
  path: 'Server/HytaleGenerator/Density/SmokeSource.json',
  text: JSON.stringify({ $NodeId: 'Constant.Density-test', Type: 'Constant', Value: value }),
}]);
store.setState({ project: makeProject(), projectVersion: 1, changeVersion: 0, editing: true });
store.getState().setFilters({ valueFields: ['Value'] });

// Keep hook owners mounted between renders, and unmount only absent components.
// Inputs are located by their public element type, not by a draft implementation.
const owners = new Map();
async function inputs() {
  await Promise.resolve();
  const seen = new Set();
  const found = [];
  function visit(vnode, key) {
    if (vnode == null || typeof vnode !== 'object') return;
    if (Array.isArray(vnode)) { vnode.forEach((child, index) => visit(child, `${key}/${index}`)); return; }
    if (typeof vnode.type === 'function') {
      const identity = `${key}:${vnode.type.name}`;
      seen.add(identity);
      let owner = owners.get(identity);
      if (!owner) { owner = { context: {}, setState() {} }; owners.set(identity, owner); }
      const mounted = { ...vnode, __c: owner };
      P.options.__r(mounted);
      const rendered = vnode.type(vnode.props);
      P.options.diffed(mounted);
      visit(rendered, identity);
    } else {
      if (vnode.type === 'input') found.push(vnode);
      visit(vnode.props?.children, key);
    }
  }
  const node = store.getState().project.files[0].nodes[0];
  visit({ type: NodeCard, props: { node, onShowReferences() {} } }, 'root');
  for (const [key, owner] of owners) {
    if (!seen.has(key)) { P.options.unmount({ __c: owner }); owners.delete(key); }
  }
  await Promise.resolve();
  return found;
}
const input = async () => {
  const result = await inputs();
  assert.equal(result.length, 1, 'fixture must expose exactly one Value editor');
  return result[0];
};
const text = async () => String((await input()).props.value);
const blur = (field, value = field.props.value) => field.props.onBlur({ target: { value }, currentTarget: { value } });
async function type(value) {
  const field = await input();
  field.props.onInput({ target: { value }, currentTarget: { value } });
  return input();
}
async function stage(value) { blur(await type(value), value); await inputs(); }

assert.equal(await text(), '1');
await stage('2');
assert.equal(store.getState().changeSet.changes[0].newValue, 2);
assert.equal(await text(), '2');
store.getState().resetChanges();
assert.equal(await text(), '1', 'Discard must immediately restore the editor as well as the read-only value');
blur(await input());
assert.equal(store.getState().changeSet.changes.length, 0, 'refocusing/blurring after Discard must not resurrect the edit');

// Also reject an event captured before a store reset and delivered before rerender.
const beforeReset = await type('3');
store.getState().resetChanges();
blur(beforeReset, '3');
assert.equal(store.getState().changeSet.changes.length, 0, 'a stale blur cannot stage into a newer change revision');
assert.equal(await text(), '1');

await stage('4');
store.getState().undoChanges();
assert.equal(await text(), '1', 'Undo restores the effective value');
store.getState().redoChanges();
assert.equal(await text(), '4', 'Redo restores the staged value');
store.getState().removeChange(store.getState().changeSet.changes[0].id);
assert.equal(await text(), '1', 'removing one change invalidates its editor draft');

await type('5.');
store.setState({ sidebarVisible: false });
assert.equal(await text(), '5.', 'unrelated UI renders must preserve a live draft');
store.getState().setEditing(false);
assert.equal((await inputs()).length, 0);
store.getState().setEditing(true);
assert.equal(await text(), '1', 'Editing Off/On must not resurrect an uncommitted draft');

await type('6');
store.getState().commitProject(makeProject(7));
assert.equal(await text(), '7', 'post-Apply/project rebuild must use the rebuilt field value');
assert.equal(store.getState().changeSet.changes.length, 0);
await stage('8');
assert.equal(await text(), '8', 'ordinary editing must still work after a rebuild');
store.getState().resetChanges();
assert.equal(await text(), '7');

console.log('PASS embedded NodeCard: Discard/no-restage, stale blur, Undo/Redo, remove, draft preservation, Editing toggle, project rebuild');
