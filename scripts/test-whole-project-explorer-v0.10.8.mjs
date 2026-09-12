import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execTypeScript } from './typescript-cli.mjs';

execTypeScript(['-p', 'tsconfig.core.json', '--pretty', 'false'], { stdio: 'inherit' });
const core = await import('../.core-build/index.js');

const inputs = [
  { path: 'Server/HytaleGenerator/Biomes/Plains.json', text: JSON.stringify({ $NodeId: 'Biome', $WorkspaceID: 'HytaleGenerator - Biome', EnvironmentProvider: { Environment: 'Zone1_Plains' } }) },
  { path: 'Server/HytaleGenerator/Assignments/Trees.json', text: JSON.stringify({ $NodeId: 'Assignment', $WorkspaceID: 'HytaleGenerator - Assignments', Prop: { WeightedPrefabPaths: [{ Path: 'Trees/Oak/Stage_4' }] } }) },
];
const inventory = [
  ...inputs.map((item) => item.path),
  'Server/Environments/Zone1/Env_Zone1_Plains.json',
  'Server/Environments/Zone2/Env_Zone2_Unused.json',
  'Server/Prefabs/Trees/Oak/Stage_4/Oak_001.prefab.json',
  'Server/Prefabs/Trees/Oak/Stage_4/Oak_002.prefab.json',
  'Server/Prefabs/Ruins/Unused.prefab.json',
  'Server/Item/Items/Test.json',
  'Server/Audio/AmbienceFX/Ambience/Zone1/Environments/Forest/AmbFX_Forest.json',
  'Server/Audio/AmbienceFX/ReverbZones/Prefabs/Rev_Zone_Dungeon.json',
];
const project = core.buildProject(inputs, inventory);

const env = core.inventoryResourceDescriptor('Server/Environments/Zone1/Env_Zone1_Plains.json');
const prefab = core.inventoryResourceDescriptor('Server/Prefabs/Trees/Oak/Stage_4/Oak_001.prefab.json');
const ordinary = core.inventoryResourceDescriptor('Server/Item/Items/Test.json');
const nestedAudioEnvironment = core.inventoryResourceDescriptor('Server/Audio/AmbienceFX/Ambience/Zone1/Environments/Forest/AmbFX_Forest.json');
const nestedAudioPrefab = core.inventoryResourceDescriptor('Server/Audio/AmbienceFX/ReverbZones/Prefabs/Rev_Zone_Dungeon.json');
const serverRootEnvironment = core.inventoryResourceDescriptor('Environments/Zone1/Env_Zone1_Plains.json');
const serverRootPrefab = core.inventoryResourceDescriptor('Prefabs/Trees/Oak/Stage_4/Oak_001.prefab.json');
assert.deepEqual(env, { kind: 'environment', name: 'Zone1_Plains', path: 'Server/Environments/Zone1/Env_Zone1_Plains.json' });
assert.equal(prefab?.kind, 'prefab');
assert.equal(prefab?.name, 'Trees/Oak/Stage_4/Oak_001');
assert.equal(ordinary, undefined);
assert.equal(nestedAudioEnvironment, undefined, 'nested non-worldgen Environments folders are not resources');
assert.equal(nestedAudioPrefab, undefined, 'nested non-worldgen Prefabs folders are not resources');
assert.equal(serverRootEnvironment?.kind, 'environment', 'opening Server itself keeps root-relative resources discoverable');
assert.equal(serverRootPrefab?.kind, 'prefab', 'opening Server itself keeps root-relative resources discoverable');
assert.equal(core.inventoryResourceReferenceCount(env, project.semanticReferences), 1);
assert.equal(core.inventoryResourceReferenceCount(prefab, project.semanticReferences), 1, 'prefab folder references count for descendant prefab files');

const unusedResourceSearch = core.searchProject(project, 'Zone2_Unused');
assert.ok(unusedResourceSearch.some((result) => result.kind === 'resource' && result.resourceKind === 'environment'));

const loadPolicy = fs.readFileSync('src/projectFiles/loadPolicy.ts', 'utf8');
const tree = fs.readFileSync('src/projectFiles/inventoryTree.ts', 'utf8');
const descriptorIndex = fs.readFileSync('src/projectFiles/descriptorIndex.ts', 'utf8');
const explorer = fs.readFileSync('src/components/ProjectExplorer.tsx', 'utf8');
const quickOpen = fs.readFileSync('src/components/QuickOpen.tsx', 'utf8');
const store = fs.readFileSync('src/store.ts', 'utf8');
const layout = fs.readFileSync('src/features/visual/VisualLayoutTab.tsx', 'utf8');
const inspector = fs.readFileSync('src/features/inspector/InspectorPane.tsx', 'utf8');
const styles = fs.readFileSync('src/styles.css', 'utf8');

assert.match(loadPolicy, /EXPLORER_SCOPE_WORKBENCH_KNOWN/);
assert.match(loadPolicy, /EXPLORER_SCOPE_RESOURCES/);
assert.match(loadPolicy, /resourceRole\?: 'environment' \| 'prefab'/);
assert.match(loadPolicy, /inventoryOnly: boolean/);
assert.match(loadPolicy, /workbenchKnown: boolean/);
assert.match(loadPolicy, /inventoryResourceReferenceCount/);
assert.match(tree, /resourceFiles/);
assert.match(tree, /manualProbeFiles/);
assert.match(explorer, />Scope<\/span>/);
assert.match(explorer, /Workbench known/);
assert.match(explorer, /Known resources/);
assert.match(explorer, /Inventory only · load state/);
assert.match(explorer, /resource-ref-count/);
assert.match(explorer, /entry\.discoverySource === 'manual-probe'/);
assert.match(explorer, /const canProbe = !selectionMode && !node\.workbenchKnown/);
assert.match(descriptorIndex, /project\.semanticReferences/);
assert.match(explorer, /getProjectFileDescriptorIndex/);
assert.match(quickOpen, /Known resources/);
assert.match(store, /EXPLORER_SCOPE_RESOURCES/);
assert.match(layout, /const eligibleRows = fileRows\.filter\(\(row\) => row\.eligible\)/);
assert.match(layout, /eligibleFileIds=\{eligibleIds\}/);
assert.match(explorer, /Not \${eligibleLabel} for \${selectionPurpose}/);
assert.match(inspector, /Reveal in Explorer/);
assert.match(styles, /v0\.10\.8 Whole Project Explorer/);

console.log('v0.10.8 Whole Project Explorer checks passed');
