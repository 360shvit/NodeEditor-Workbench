import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execTypeScript } from './typescript-cli.mjs';
import { performance } from 'node:perf_hooks';

const read = (path) => fs.readFileSync(path, 'utf8');
execTypeScript(['-p', 'tsconfig.core.json', '--pretty', 'false'], { stdio: 'inherit' });
const core = await import('../.core-build/index.js');

const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const cargo = read('src-tauri/Cargo.toml');
const app = read('src/App.tsx');
const runtime = read('src/support/runtimeDiagnostics.ts');
const descriptorIndex = read('src/projectFiles/descriptorIndex.ts');
const loadPolicy = read('src/projectFiles/loadPolicy.ts');
const semanticReferences = read('src/core/semanticReferences.ts');
const explorer = read('src/components/ProjectExplorer.tsx');
const buildId = read('BUILD_ID.txt');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(cargo, new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.')}"`, 'm'));
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.match(buildId, /v0\.11\.[0-9]+-r[0-9]+-[a-z0-9-]+/);

// Bulk resource-reference counts must preserve the legacy per-resource semantics, including
// overlapping prefab folder candidates that must count one semantic reference only once.
const resources = [
  { kind: 'environment', name: 'Forest', path: 'Server/Environments/Env_Forest.json' },
  { kind: 'environment', name: 'Desert', path: 'Server/Environments/Env_Desert.json' },
  { kind: 'prefab', name: 'Trees/Oak/A', path: 'Server/Prefabs/Trees/Oak/A.prefab.json' },
  { kind: 'prefab', name: 'Trees/Oak/Sub/B', path: 'Server/Prefabs/Trees/Oak/Sub/B.prefab.json' },
  { kind: 'prefab', name: 'Ruins/C', path: 'Server/Prefabs/Ruins/C.prefab.json' },
];
const resourceRef = (id, kind, paths) => ({
  id,
  extractorId: 'test',
  relation: kind === 'environment' ? 'biome-environment' : 'assignment-prefab',
  status: 'resolved',
  source: { fileId: 'source', filePath: 'Source.json' },
  target: { kind: 'resource', type: kind, name: id, resourceKind: kind, resourcePath: paths[0] },
  candidates: paths.slice(1).map((path, index) => ({ filePath: path, resourcePath: path, label: `${id}-${index}`, resourceKind: kind })),
});
const references = [
  resourceRef('env-1', 'environment', ['Server/Environments/Env_Forest.json']),
  resourceRef('prefab-tree', 'prefab', ['Server/Prefabs/Trees', 'Server/Prefabs/Trees/Oak']),
  resourceRef('prefab-specific', 'prefab', ['Server/Prefabs/Trees/Oak/Sub/B.prefab.json']),
  { id: 'symbol', extractorId: 'test', relation: 'symbol-import', status: 'unresolved', source: { fileId: 'source', filePath: 'Source.json' }, target: { kind: 'symbol', type: 'x', name: 'x' }, candidates: [] },
];
const bulk = core.inventoryResourceReferenceCountIndex(resources, references);
for (const resource of resources) {
  const expected = core.inventoryResourceReferenceCount(resource, references);
  const actual = bulk.get(resource.path.toLowerCase()) ?? 0;
  assert.equal(actual, expected, `bulk count differs for ${resource.path}`);
}
assert.equal(bulk.get('server/prefabs/trees/oak/a.prefab.json'), 1, 'overlapping folder candidates count the same reference once');
assert.equal(bulk.get('server/prefabs/trees/oak/sub/b.prefab.json'), 2);
assert.equal(bulk.get('server/prefabs/ruins/c.prefab.json') ?? 0, 0);

// The large-project hotspot is removed structurally: resource references are indexed once,
// then the descriptor materializer does O(1) count lookups rather than rescanning references.
assert.match(semanticReferences, /inventoryResourceReferenceCountIndex/);
assert.match(semanticReferences, /prefabDifference/);
assert.match(loadPolicy, /inventoryResourceReferenceCountIndex\(resourcesByPath\.values\(\), semanticReferences\)/);
assert.match(loadPolicy, /resourceReferenceCounts\.get/);
assert.doesNotMatch(loadPolicy, /inventoryResourceReferenceCount\(resource, semanticReferences\)/);
assert.match(loadPolicy, /phase\('resource-reference-index'/);

// Stable cache is keyed by ProjectModel identity and defensively validates workspace authority.
assert.match(descriptorIndex, /new WeakMap<ProjectModel, CachedDescriptorIndex>/);
assert.match(descriptorIndex, /cached\.sourceEntries === workspace\.sourceEntries/);
assert.match(descriptorIndex, /cached\.semanticInfo === workspace\.semanticInfo/);
assert.match(descriptorIndex, /cached\.label === workspace\.label/);
assert.match(descriptorIndex, /explorer\.descriptor-index\.cache-hit/);
assert.match(descriptorIndex, /explorer\.descriptor-index\.cache-miss/);
assert.match(descriptorIndex, /explorer\.descriptor-index\.rebuild/);
assert.match(descriptorIndex, /operation\.phase\('path-index'/);
assert.match(descriptorIndex, /operation\.phase\('summary'/);

// Every normal/selection Explorer mount now asks for the shared project index instead of rebuilding
// 33k descriptors inside component-local useMemo. Selection state remains a separate thin layer.
assert.match(explorer, /getProjectFileDescriptorIndex\(project, workspace\)/);
assert.doesNotMatch(explorer, /buildProjectFileDescriptors\(/);
assert.match(explorer, /explorer\.tree\.selection-index/);
assert.match(explorer, /explorer\.tree\.build/);
assert.match(explorer, /explorer\.render\.commit/);

// Non-gating synthetic benchmark: the new bulk count path should be materially smaller on a
// Server-shaped workload. We print this for release diagnostics without making timing a CI oracle.
const syntheticResources = [];
for (let index = 0; index < 122; index += 1) syntheticResources.push({ kind: 'environment', name: `Env_${index}`, path: `Server/Environments/Env_${index}.json` });
for (let index = 0; index < 7757; index += 1) syntheticResources.push({ kind: 'prefab', name: `Prefab_${index}`, path: `Server/Prefabs/group${index % 50}/Prefab_${index}.prefab.json` });
const syntheticReferences = [];
for (let index = 0; index < 71; index += 1) syntheticReferences.push(resourceRef(`env-${index}`, 'environment', [`Server/Environments/Env_${index}.json`]));
for (let index = 0; index < 186; index += 1) syntheticReferences.push(resourceRef(`prefab-${index}`, 'prefab', [`Server/Prefabs/group${index % 50}`]));
for (let index = 0; index < 912; index += 1) syntheticReferences.push({ id: `symbol-${index}`, extractorId: 'test', relation: 'symbol-import', status: 'unresolved', source: { fileId: 'source', filePath: 'Source.json' }, target: { kind: 'symbol', type: 'x', name: 'x' }, candidates: [] });
const bulkStarted = performance.now();
core.inventoryResourceReferenceCountIndex(syntheticResources, syntheticReferences);
const bulkMs = performance.now() - bulkStarted;
console.log(`v0.11.9 synthetic bulk resource-reference index: ${bulkMs.toFixed(2)}ms for ${syntheticResources.length} resources / ${syntheticReferences.length} references`);

console.log('v0.11.9 Explorer Descriptor Index checks passed');
