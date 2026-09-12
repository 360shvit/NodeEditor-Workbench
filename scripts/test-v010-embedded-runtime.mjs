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

const commands = context.require('commands/commandRegistry');
assert.deepEqual(Array.from(commands.commandShortcutConflicts()), []);
assert.equal(commands.WORKBENCH_COMMANDS.find((item) => item.id === 'quickOpen').shortcut, 'Mod+P');

const policy = context.require('projectFiles/loadPolicy');
const iterator = new Map([
  ['Server/HytaleGenerator/Density/A.json', 1],
  ['Docs/readme.md', 1],
  ['Misc/random.json', 1],
]).keys();
const descriptors = Array.from(policy.buildProjectFileDescriptors(iterator, 'MyMod', []));
assert.equal(descriptors.length, 3, 'one-shot inventory iterators must not be consumed during marker detection');
assert.equal(descriptors.find((item) => item.path.endsWith('A.json')).loadMode, 'metadata-only', 'descriptor authority follows actually loaded semantic files on desktop');
assert.equal(descriptors.find((item) => item.path === 'Docs/readme.md').loadMode, 'metadata-only');
assert.equal(descriptors.find((item) => item.path === 'Misc/random.json').loadMode, 'metadata-only');
assert.equal(policy.loadModeForProjectPath('WorldStructures/Ruins.json', 'MyMod', []), 'semantic-json');


const core = context.require('core/index');
const inventoryTree = context.require('projectFiles/inventoryTree');
const recognizedProject = core.buildProject([
  { path: 'Server/HytaleGenerator/Density/A.json', text: JSON.stringify({ $NodeId: 'Constant.Density-test', $WorkspaceID: 'HytaleGenerator - Density', Value: 1 }) },
]);
const scopedDescriptors = Array.from(policy.buildProjectFileDescriptors([
  'Server/HytaleGenerator/Density/A.json',
  'Docs/readme.md',
], 'MyMod', recognizedProject.files));
assert.equal(scopedDescriptors.filter((item) => policy.descriptorMatchesExplorerScope(item, policy.EXPLORER_SCOPE_RECOGNIZED)).length, 1);
assert.equal(scopedDescriptors.filter((item) => policy.descriptorMatchesExplorerScope(item, policy.EXPLORER_SCOPE_INVENTORY_ONLY)).length, 1);
assert.equal(inventoryTree.buildInventoryTree(scopedDescriptors, policy.EXPLORER_SCOPE_RECOGNIZED).length > 0, true);

const graphProject = core.buildProject([
  { path: 'Server/Instances/TestWorld/instance.bson', text: JSON.stringify({ WorldGen: { Type: 'HytaleGenerator', WorldStructure: 'Basic' } }) },
  { path: 'Server/HytaleGenerator/WorldStructures/Basic.json', text: JSON.stringify({ DefaultBiome: 'Basic', Density: { Type: 'Constant', Value: 0 }, Framework: {} }) },
  { path: 'Server/HytaleGenerator/Biomes/Basic.json', text: JSON.stringify({ $NodeId: 'Biome', $WorkspaceID: 'HytaleGenerator - Biome', Terrain: { Density: { Type: 'Constant', Value: 0 } } }) },
]);
const graphRoot = core.projectGraphRoots(graphProject).find((root) => root.kind === 'instance');
assert.ok(graphRoot);
const semanticGraph = core.buildProjectGraph(graphProject, graphRoot.fileId, 4);
assert.ok(semanticGraph.edges.some((edge) => edge.kind === 'instance-worldstructure'));
assert.equal(semanticGraph.linkedBiomeCount, 1);

console.log(JSON.stringify({
  embeddedCommandConflicts: 0,
  quickOpenShortcut: 'Mod+P',
  inventoryIteratorSafe: true,
  unknownJsonDefault: 'metadata-only',
  nonJsonDefault: 'metadata-only',
  worldStructuresCandidateDefault: 'semantic-json',
  unloadedDescriptorDefault: 'metadata-only',
  recognizedScopeVerified: true,
  inventoryOnlyScopeVerified: true,
  instanceWorldStructureGraphVerified: true,
}, null, 2));
