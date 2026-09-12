import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execTypeScript } from './typescript-cli.mjs';

const rust = fs.readFileSync('src-tauri/src/main.rs', 'utf8');
const policy = fs.readFileSync('src/projectFiles/loadPolicy.ts', 'utf8');
const explorer = fs.readFileSync('src/components/ProjectExplorer.tsx', 'utf8');
const loader = fs.readFileSync('src/io/folderLoader.ts', 'utf8');
const bridge = fs.readFileSync('src/io/desktopBridge.ts', 'utf8');
const runtime = fs.readFileSync('tauri-ui/tauri-runtime.js', 'utf8');

// Native detector registry / high-confidence schemas.
assert.match(rust, /workspace_id_from_value/);
assert.match(rust, /node-editor-workspace-v1/);
assert.match(rust, /world-structure-v1/);
assert.match(rust, /DefaultBiome.*Density.*Framework/s);
assert.match(rust, /hytale-generator-instance-v1/);
assert.match(rust, /WorldGen/);
assert.match(rust, /WorldStructure/);
assert.match(rust, /instance_descriptor_path/);
assert.match(rust, /Worldgen Biome|worldgenbiome/i);
assert.match(rust, /Worldgen GraphProvider|worldgengraphprovider/i);
assert.match(rust, /settings-path-v1/);

// User-directed discovery stays native, bounded, relative to the active project and persistent.
assert.match(rust, /MAX_DISCOVERY_PROBE_FILES/);
assert.match(rust, /MAX_DISCOVERY_PROBE_FILE_BYTES/);
assert.match(rust, /MAX_DISCOVERY_PROBE_TOTAL_BYTES/);
assert.match(rust, /semantic-discovery-profiles\.json/);
assert.match(rust, /probe_project_path/);
assert.match(rust, /safe_relative\(&payload\.path\)/);
assert.match(rust, /canonical\.starts_with\(&project\.canonical_root\)/);
assert.match(rust, /scan_tree\(&project\.root, &discovery_roots\)/);
assert.match(runtime, /\/api\/project\/probe/);
assert.match(bridge, /desktopProbeProjectPath/);
assert.match(loader, /probeWorkspaceFolder/);
assert.match(explorer, /Probe this folder for recognized generator formats/);
assert.match(explorer, /PROBED/);

// Roles no longer overload the old SUPPORT concept.
assert.match(policy, /'graph-document'/);
assert.match(policy, /'flow-orchestrator'/);
assert.match(policy, /'flow-entrypoint'/);
assert.match(policy, /'runtime-config'/);
assert.doesNotMatch(policy, /'graph-support'/);
assert.doesNotMatch(explorer, />SUPPORT</);

// Structured semantic documents are allowed to use non-.json extensions.
execTypeScript(['-p', 'tsconfig.core.json', '--pretty', 'false'], { stdio: 'inherit' });
const { buildProject } = await import('../.core-build/project.js');
const { workspaceFromMetadata } = await import('../.core-build/workspace.js');

const legacy = workspaceFromMetadata({ $WorkspaceID: 'HytaleGenerator - Density', $Groups: [], $Position: { x: 0, y: 0 } });
assert.equal(legacy?.id, 'density');
const modern = workspaceFromMetadata({ $NodeEditorMetadata: { $WorkspaceID: 'Worldgen Biome' } });
assert.equal(modern?.id, 'biome');

const instance = buildProject([{ path: 'Server/Instances/Test/instance.bson', text: JSON.stringify({ WorldGen: { Type: 'HytaleGenerator', WorldStructure: 'Basic' } }) }]);
assert.equal(instance.files.length, 1, 'semantic structured-text inputs must not be discarded only because the extension is .bson');
assert.equal(instance.files[0].raw?.WorldGen?.WorldStructure, 'Basic');

console.log('v0.10.1 semantic discovery checks passed.');
