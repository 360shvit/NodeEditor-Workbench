import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildProject } from '../.core-build/index.js';

const read = (path) => fs.readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const runtime = read('src/support/runtimeDiagnostics.ts');
const bridge = read('src/io/desktopBridge.ts');
const loader = read('src/io/folderLoader.ts');
const store = read('src/store.ts');
const semanticReferences = read('src/core/semanticReferences.ts');
const folderOpen = read('src/components/FolderOpenButton.tsx');
const startScreen = read('src/components/ProjectStartScreen.tsx');
const rust = read('src-tauri/src/main.rs');
const tauriRuntime = read('tauri-ui/tauri-runtime.js');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(read('src-tauri/Cargo.toml'), new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.') }"`, 'm'));
assert.equal(read('BUILD_ID.txt').trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);

assert.match(runtime, /REPORT_SCHEMA_VERSION = 8/);
assert.match(runtime, /traceId\?: string/);
assert.match(runtime, /createRuntimeTraceId/);
assert.match(runtime, /runtimeTraceSummaries/);
assert.match(runtime, /workbenchRuntime: summary/);
assert.match(runtime, /projectDiagnostics/);
assert.match(runtime, /pathLikeField\(key\) && typeof item === 'string'/);
assert.match(runtime, /typeof value === 'boolean'/, 'booleans must remain supported as scalars');
assert.doesNotMatch(runtime, /fetch\(/, 'support module must not upload reports');

assert.match(folderOpen, /createRuntimeTraceId\('project-open'\)/);
assert.match(startScreen, /createRuntimeTraceId\('project-open'\)/);
assert.match(loader, /project\.workspace\.prepare/);
assert.match(store, /project\.workspace-state\.restore/);
assert.match(store, /project\.model\.\$\{phase\}/);
assert.match(bridge, /desktop\.project\.bridge-overhead/);
assert.match(bridge, /nativeTrace\.traceId \?\? fallbackTraceId/);
assert.match(bridge, /detailed: !traceId/);
assert.match(semanticReferences, /function buildSemanticResourceIndex\(inventoryPaths: string\[\]\)/);
assert.match(semanticReferences, /environmentsByAlias: Map<string, SemanticReferenceCandidate\[\]>/);
assert.match(semanticReferences, /prefabFoldersByPath: Map<string, SemanticReferenceCandidate>/);
assert.match(semanticReferences, /environmentCandidates\(context\.resourceIndex, item\.value\)/);
assert.match(semanticReferences, /prefabCandidates\(context\.resourceIndex, item\.value\)/);

for (const phase of [
  'desktop.project.inventory.walk',
  'desktop.project.inventory.finalize',
  'desktop.project.semantic.classify',
  'desktop.project.semantic.read',
  'desktop.project.semantic.detect',
  'desktop.project.watcher.setup',
  'desktop.project.native-open.total',
]) assert.match(rust, new RegExp(phase.replaceAll('.', '\\.')));
assert.match(rust, /trace_id: Option<String>/);
assert.match(tauriRuntime, /invoke\('select_project', \{ payload: requestBody\(init\) \}\)/);

const phases = [];
const synthetic = buildProject([
  {
    path: 'Density/Test.json',
    text: JSON.stringify({
      $NodeId: 'root',
      $NodeEditorMetadata: { $FloatingNodes: {} },
      Type: 'Exported.Density',
      ExportAs: 'Test-Density',
    }),
  },
], ['Density/Test.json', 'Server/Environments/Test.json'], {
  phase: (name, durationMs) => phases.push({ name, durationMs }),
});
assert.equal(synthetic.files.length, 1);
for (const name of [
  'parse',
  'file-map',
  'symbol-index',
  'inventory-materialize',
  'semantic-references',
  'diagnostics',
  'field-match-index',
  'field-index',
  'workspace-index',
]) {
  const phase = phases.find((item) => item.name === name);
  assert.ok(phase, `missing ProjectModel phase ${name}`);
  assert.ok(Number.isFinite(phase.durationMs) && phase.durationMs >= 0, `invalid duration for ${name}`);
}


console.log('v0.11.1 Performance Tracing & Large Project Hardening checks passed');
