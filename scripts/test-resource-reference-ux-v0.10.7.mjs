import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execTypeScript } from './typescript-cli.mjs';

execTypeScript(['-p', 'tsconfig.core.json', '--pretty', 'false'], { stdio: 'inherit' });
const core = await import('../.core-build/index.js');

const inputs = [
  { path: 'Server/HytaleGenerator/Biomes/Plains.json', text: JSON.stringify({ $NodeId: 'Biome', $WorkspaceID: 'HytaleGenerator - Biome', EnvironmentProvider: { Environment: 'Zone1_Plains' } }) },
  { path: 'Server/HytaleGenerator/Assignments/Trees.json', text: JSON.stringify({ $NodeId: 'Assignment', $WorkspaceID: 'HytaleGenerator - Assignments', Prop: { WeightedPrefabPaths: [{ Path: 'Trees/Oak/Stage_4' }] } }) },
  { path: 'Server/HytaleGenerator/Biomes/Missing.json', text: JSON.stringify({ $NodeId: 'Biome', $WorkspaceID: 'HytaleGenerator - Biome', EnvironmentProvider: { Environment: 'Zone9_Missing' } }) },
];
const inventory = [
  ...inputs.map((item) => item.path),
  'Server/Environments/Zone1/Env_Zone1_Plains.json',
  'Server/Environments/Zone2/Env_Zone2_Unused.json',
  'Server/Prefabs/Trees/Oak/Stage_4/Oak_001.prefab.json',
  'Server/Prefabs/Trees/Oak/Stage_4/Oak_002.prefab.json',
  'Server/Prefabs/Ruins/Unused.prefab.json',
];

const project = core.buildProject(inputs, inventory);
const env = project.semanticReferences.find((reference) => reference.relation === 'biome-environment' && reference.target.name === 'Zone1_Plains');
const prefab = project.semanticReferences.find((reference) => reference.relation === 'assignment-prefab');
const missing = project.semanticReferences.find((reference) => reference.target.name === 'Zone9_Missing');
assert.equal(env?.status, 'resolved');
assert.equal(prefab?.status, 'resolved');
assert.equal(missing?.status, 'unresolved');

const rebuilt = core.applyChangeSet(project, { changes: [], rules: [] }).project;
assert.ok(rebuilt.inventoryPaths.includes('Server/Environments/Zone1/Env_Zone1_Plains.json'), 'effective project rebuild preserves inventory-only paths');
assert.equal(rebuilt.semanticReferences.find((reference) => reference.target.name === 'Zone1_Plains')?.status, 'resolved');

const missingDiagnostic = project.diagnostics.find((diagnostic) => diagnostic.semanticReferenceId === missing?.id);
assert.ok(missingDiagnostic, 'resource diagnostics keep the originating semantic reference id');
assert.equal(missingDiagnostic?.severity, 'warning');

const envSearch = core.searchProject(project, 'Zone1_Plains');
assert.ok(envSearch.some((result) => result.kind === 'resource' && result.resourceKind === 'environment' && result.resourcePath === 'Server/Environments/Zone1/Env_Zone1_Plains.json'));
const unusedSearch = core.searchProject(project, 'Zone2_Unused');
assert.ok(unusedSearch.some((result) => result.kind === 'resource' && result.resourceKind === 'environment'), 'unused inventory-only environment remains directly searchable');
const unusedPrefabSearch = core.searchProject(project, 'Ruins/Unused');
assert.ok(unusedPrefabSearch.some((result) => result.kind === 'resource' && result.resourceKind === 'prefab'), 'unused inventory-only prefab remains directly searchable');

const store = fs.readFileSync('src/store.ts', 'utf8');
const inspector = fs.readFileSync('src/features/inspector/InspectorPane.tsx', 'utf8');
const quickOpen = fs.readFileSync('src/components/QuickOpen.tsx', 'utf8');
const searchSidebar = fs.readFileSync('src/components/SearchSidebar.tsx', 'utf8');
const tabs = fs.readFileSync('src/components/FileTabs.tsx', 'utf8');
const styles = fs.readFileSync('src/styles.css', 'utf8');

assert.match(store, /queryKind: 'resource-references'/);
assert.match(store, /openResourceReferenceTab/);
assert.match(store, /resourceReferenceSnapshot/);
assert.match(inspector, /ResourceReferencesInspectorContent/);
assert.match(inspector, /Environment references|target\.type\} references/);
assert.match(inspector, /Resource refs/);
assert.match(quickOpen, /result\.kind === 'resource'/);
assert.match(searchSidebar, /result\.kind === 'resource'/);
assert.match(tabs, /resource-reference-query-tab/);
assert.match(styles, /v0\.10\.7 focused resource-reference UX/);

console.log('v0.10.7 resource-reference UX checks passed');
