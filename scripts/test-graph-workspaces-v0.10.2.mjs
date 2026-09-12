import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const graphCore = read('src/core/projectGraph.ts');
const semanticRefs = read('src/core/semanticReferences.ts');
const graphView = read('src/features/project-graph/ProjectGraphView.tsx');
const graphSidebar = read('src/features/project-graph/ProjectGraphSidebar.tsx');
const policy = read('src/projectFiles/loadPolicy.ts');
const tree = read('src/projectFiles/inventoryTree.ts');
const explorer = read('src/components/ProjectExplorer.tsx');
const store = read('src/store.ts');
const persistence = read('src/projects/projectPersistence.ts');
const quickOpen = read('src/components/QuickOpen.tsx');

assert.match(graphCore, /isHytaleGeneratorInstanceFile/);
assert.match(graphCore, /project\.semanticReferences/);
assert.match(graphCore, /semanticReferencesFromFile/);
assert.match(semanticRefs, /instance-worldstructure-v1/);
assert.match(semanticRefs, /WorldGen/);
assert.match(semanticRefs, /worldstructure-biome-v1/);
assert.match(semanticRefs, /worldstructure-density-v1/);
assert.match(graphView, /buildProjectGraph/);
assert.match(graphSidebar, /linked Instances/);
assert.match(graphSidebar, /Flow root/);

assert.match(policy, /EXPLORER_SCOPE_RECOGNIZED/);
assert.match(policy, /EXPLORER_SCOPE_INVENTORY_ONLY/);
assert.match(policy, /descriptorMatchesExplorerScope/);
assert.match(tree, /descriptorMatchesExplorerScope/);
assert.match(explorer, /Recognized files/);
assert.match(explorer, /Inventory only/);
assert.match(quickOpen, /Recognized files/);
assert.match(quickOpen, /Inventory only/);
assert.match(store, /EXPLORER_SCOPE_RECOGNIZED/);
assert.match(store, /EXPLORER_SCOPE_INVENTORY_ONLY/);
assert.match(store, /validExplorerWorkspaceId/);
assert.match(store, /validProjectWorkspaceId/);
assert.match(store, /workspace: validProjectWorkspaceId\(project, session\.filters\.workspace\)/, 'virtual Explorer scopes must not leak into Inspector workspace filters');

assert.match(explorer, /const open = folderState\[node\.path\] \?\? false;/, 'Explorer folders should start collapsed unless the active folder-state source explicitly opened them');
assert.match(store, /setExplorerFolderOpen/);
assert.match(persistence, /explorerFolderState/);
assert.match(persistence, /writeProjectSession/);

console.log('v0.10.3 graph/workspace/collapse checks passed.');
