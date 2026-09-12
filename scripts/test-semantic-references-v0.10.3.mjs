import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execTypeScript } from './typescript-cli.mjs';

const refsSource = fs.readFileSync('src/core/semanticReferences.ts', 'utf8');
const graphSource = fs.readFileSync('src/core/projectGraph.ts', 'utf8');
const diagnosticsSource = fs.readFileSync('src/core/diagnostics.ts', 'utf8');
const queryTabsSource = fs.readFileSync('src/features/inspector/queryTabs.ts', 'utf8');

for (const extractor of [
  'instance-worldstructure-v1',
  'worldstructure-biome-v1',
  'worldstructure-density-v1',
  'biome-density-v1',
  'symbol-import-v1',
  'blockmask-import-v1',
]) assert.match(refsSource, new RegExp(extractor));
assert.match(refsSource, /SemanticReferenceExtractorRegistry/);
assert.match(refsSource, /resolved.*unresolved.*ambiguous/s);
assert.match(graphSource, /project\.semanticReferences/);
assert.match(graphSource, /semanticReferencesFromFile/);
assert.match(graphSource, /semanticSymbolDependencies/);
assert.doesNotMatch(graphSource, /collectBiomeReferenceValues/);
assert.doesNotMatch(graphSource, /densityImportsForDefinition/);
assert.match(diagnosticsSource, /unresolved-semantic-reference/);
assert.match(diagnosticsSource, /ambiguous-semantic-reference/);
assert.match(queryTabsSource, /Unresolved Semantic References/);
assert.match(queryTabsSource, /Ambiguous Semantic References/);

execTypeScript(['-p', 'tsconfig.core.json', '--pretty', 'false'], { stdio: 'inherit' });
const core = await import('../.core-build/index.js');

const project = core.buildProject([
  { path: 'Server/Instances/Test/instance.bson', text: JSON.stringify({ WorldGen: { Type: 'HytaleGenerator', WorldStructure: 'Basic' } }) },
  { path: 'Server/HytaleGenerator/WorldStructures/Basic.json', text: JSON.stringify({ DefaultBiome: 'Plains', Density: { Type: 'Imported', Name: 'D0' }, Framework: [] }) },
  { path: 'Server/HytaleGenerator/Biomes/Plains.json', text: JSON.stringify({ $NodeId: 'Biome', $WorkspaceID: 'HytaleGenerator - Biome', Terrain: { Density: { Type: 'Imported', Name: 'D1' } } }) },
  { path: 'Server/HytaleGenerator/Density/D0.json', text: JSON.stringify({ $NodeId: 'Exported.Density', Type: 'Exported', ExportAs: 'D0', $WorkspaceID: 'HytaleGenerator - Density' }) },
  { path: 'Server/HytaleGenerator/Density/D1.json', text: JSON.stringify({ $NodeId: 'Exported.Density', Type: 'Exported', ExportAs: 'D1', $WorkspaceID: 'HytaleGenerator - Density', Inputs: [{ $NodeId: 'Imported.Density', Type: 'Imported', Name: 'D0' }] }) },
  { path: 'Server/HytaleGenerator/Assignments/Trees.json', text: JSON.stringify({ $NodeId: 'Assignment', $WorkspaceID: 'HytaleGenerator - Assignments', Prop: { BlockMask: { Import: 'MaskA' } } }) },
  { path: 'Server/HytaleGenerator/BlockMasks/MaskA.json', text: JSON.stringify({ $Title: '[ROOT] BlockMask', $Position: { $x: 0, $y: 0 }, ExportAs: 'MaskA', $WorkspaceID: 'HytaleGenerator - BlockMask', $Groups: [] }) },
]);

const byRelation = (relation) => project.semanticReferences.filter((reference) => reference.relation === relation);
assert.equal(byRelation('instance-worldstructure').length, 1);
assert.equal(byRelation('instance-worldstructure')[0].status, 'resolved');
assert.equal(byRelation('worldstructure-biome').length, 1);
assert.equal(byRelation('worldstructure-biome')[0].status, 'resolved');
assert.equal(byRelation('worldstructure-density')[0].status, 'resolved');
assert.equal(byRelation('biome-density')[0].status, 'resolved');
assert.equal(byRelation('blockmask-import')[0].status, 'resolved');
const densityDependency = byRelation('symbol-import').find((reference) => reference.source.ownerSymbol?.name === 'D1' && reference.target.name === 'D0');
assert.ok(densityDependency, 'nested Density import should carry the owning exported Density symbol');
assert.equal(densityDependency.source.ownerSymbol.symbolType, 'Density');
assert.equal(densityDependency.status, 'resolved');

const root = core.projectGraphRoots(project).find((item) => item.kind === 'instance');
assert.ok(root);
const graph = core.buildProjectGraph(project, root.fileId, 4);
assert.ok(graph.edges.some((edge) => edge.kind === 'instance-worldstructure'));
assert.ok(graph.edges.some((edge) => edge.kind === 'uses-biome'));
assert.ok(graph.edges.some((edge) => edge.kind === 'density-dependency' && edge.label === 'D0'));
assert.equal(graph.unresolvedDensityCount, 0);

const broken = core.buildProject([
  { path: 'Server/Instances/A/instance.bson', text: JSON.stringify({ WorldGen: { Type: 'HytaleGenerator', WorldStructure: 'Missing' } }) },
  { path: 'Server/Instances/B/instance.bson', text: JSON.stringify({ WorldGen: { Type: 'HytaleGenerator', WorldStructure: 'Duplicate' } }) },
  { path: 'Server/HytaleGenerator/WorldStructures/A/Duplicate.json', text: JSON.stringify({ DefaultBiome: 'Nowhere', Density: {}, Framework: [] }) },
  { path: 'Server/HytaleGenerator/WorldStructures/B/Duplicate.json', text: JSON.stringify({ DefaultBiome: 'Nowhere', Density: {}, Framework: [] }) },
]);
const missing = broken.semanticReferences.find((reference) => reference.target.name === 'Missing');
const ambiguous = broken.semanticReferences.find((reference) => reference.relation === 'instance-worldstructure' && reference.target.name === 'Duplicate');
assert.equal(missing?.status, 'unresolved');
assert.equal(ambiguous?.status, 'ambiguous');
assert.equal(ambiguous?.candidates.length, 2);
assert.ok(broken.diagnostics.some((diagnostic) => diagnostic.code === 'unresolved-semantic-reference'));
assert.ok(broken.diagnostics.some((diagnostic) => diagnostic.code === 'ambiguous-semantic-reference'));

console.log(JSON.stringify({
  extractorRegistry: true,
  typedStatuses: ['resolved', 'unresolved', 'ambiguous'],
  graphConsumesSemanticReferences: true,
  semanticDiagnostics: true,
  blockMaskImportResolved: true,
  densityOwnerSymbolResolved: true,
}, null, 2));
