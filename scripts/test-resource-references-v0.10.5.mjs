import assert from 'node:assert/strict';
import { execTypeScript } from './typescript-cli.mjs';
execTypeScript(['-p','tsconfig.core.json','--pretty','false'], {stdio:'inherit'});
const core = await import('../.core-build/index.js');
const inputs = [
 {path:'Server/Instances/Test/instance.bson', text:JSON.stringify({WorldGen:{Type:'HytaleGenerator',WorldStructure:'World'}})},
 {path:'Server/HytaleGenerator/WorldStructures/World.json', text:JSON.stringify({DefaultBiome:'Plains',Density:{},Framework:[]})},
 {path:'Server/HytaleGenerator/Biomes/Plains.json', text:JSON.stringify({$NodeId:'Biome',$WorkspaceID:'HytaleGenerator - Biome',EnvironmentProvider:{Environment:'Zone1_Plains'}})},
 {path:'Server/HytaleGenerator/Assignments/Trees.json', text:JSON.stringify({$NodeId:'Assignment',$WorkspaceID:'HytaleGenerator - Assignments',Prop:{WeightedPrefabPaths:[{Path:'Trees/Oak/Stage_4'}]}})},
];
const inventory = [
 ...inputs.map(x=>x.path),
 'Server/Environments/Zone1/Env_Zone1_Plains.json',
 'Server/Prefabs/Trees/Oak/Stage_4/Oak_001.prefab.json',
 'Server/Prefabs/Trees/Oak/Stage_4/Oak_002.prefab.json',
];
const p=core.buildProject(inputs, inventory);
const env=p.semanticReferences.find(r=>r.relation==='biome-environment');
const prefab=p.semanticReferences.find(r=>r.relation==='assignment-prefab');
assert.equal(env?.status,'resolved');
assert.equal(env?.target.resourcePath,'Server/Environments/Zone1/Env_Zone1_Plains.json');
assert.equal(prefab?.status,'resolved');
assert.equal(prefab?.target.resourcePath,'Server/Prefabs/Trees/Oak/Stage_4');
assert.equal(prefab?.candidates.length,1);
const root=core.projectGraphRoots(p).find(r=>r.kind==='instance');
const graph=core.buildProjectGraph(p, root?.fileId, 4, true);
assert.ok(graph.nodes.some(n=>n.kind==='environment-resource' && n.resourcePath==='Server/Environments/Zone1/Env_Zone1_Plains.json'));
assert.ok(graph.edges.some(e=>e.kind==='biome-environment'));
console.log(JSON.stringify({env,prefab, graphResourceNodes:graph.nodes.filter(n=>n.kind==='environment-resource').length},null,2));
