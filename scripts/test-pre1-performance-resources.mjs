import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { buildProject, searchProjectNodes, searchProject, buildProjectGraph, buildLayoutProposal } from '../.core-build/index.js';

const measurements = [];
function measure(name, work) {
  const start = performance.now();
  const value = work();
  measurements.push({ name, ms: +(performance.now() - start).toFixed(2) });
  return value;
}
const inputs = Array.from({ length: 100 }, (_, file) => ({
  path: `Density/Batch-${file}.json`,
  text: JSON.stringify({ Type: 'Sum', Inputs: Array.from({ length: 40 }, (_, node) => ({ $NodeId: `Constant.Density-${file}-${node}`, Type: 'Constant', Value: node })) }),
}));
const inventory = [...inputs.map(x => x.path), ...Array.from({ length: 10000 }, (_, i) => `Assets/${i}.bin`)];
const project = measure('project-build:4100-nodes/10100-inventory', () => buildProject(inputs, inventory));
const changes = project.files.flatMap(file => file.nodes.flatMap(node => node.fields.filter(field => field.key === 'Value').map(field => ({
  id: `${file.id}-${node.id}`, fileId: file.id, filePath: file.path, nodeId: node.id, field: field.key, jsonPath: field.jsonPath,
  oldValue: field.value, newValue: 'needle', location: node.location, source: 'manual',
}))));
assert.equal(changes.length, 4000);
const changeSet = { changes, rules: [] };
assert.equal(measure('staged-search:effective-unresolved', () => searchProjectNodes(project, 'is:unresolved', changeSet)).total, 0);
for (let trial = 0; trial < 3; trial++) {
  const found = measure(`staged-search:${trial}`, () => searchProjectNodes(project, 'value:needle', changeSet, 250));
  assert.equal(found.total, 4000);
  assert.equal(found.matches.length, 250);
  assert.equal(found.truncated, true);
}
// Operation-count budgets are deterministic across machines and catch the old
// per-field linear search through the entire staged-change array.
let changeVisits = 0;
const counted = changes.slice(0, 256).map(change => ({ ...change, get fileId() { changeVisits++; return change.fileId; } }));
assert.equal(searchProjectNodes(project, 'value:needle', { changes: counted, rules: [] }).total, 256);
assert.ok(changeVisits <= counted.length * 2, `staged-change visits: ${changeVisits}`);
const first = changes[7];
for (const value of [null, false, 0, '']) {
  const changed = { changes: [{ ...first, newValue: value }], rules: [] };
  const result = searchProjectNodes(project, 'is:changed value:needle', changed);
  assert.equal(result.total, 0, 'staged values must not reuse another query index');
  if (value === null) assert.equal(searchProjectNodes(project, `is:changed value:${first.oldValue}`, changed).total, 0, 'null must replace the original value');
  if (value === false || value === 0) assert.equal(searchProjectNodes(project, `is:changed field:Value value:${value}`, changed).total, 1);
}
assert.equal(searchProjectNodes(project, 'is:changed value:needle', { changes: [first, { ...first, newValue: 'later' }], rules: [] }).total, 1, 'first matching staged change retains precedence');
const originalNode = project.files[0].nodes.find(node => node.id === first.nodeId);
const collisionFiles = [
  { ...project.files[0], id: 'a|live|b', nodes: [{ ...originalNode, fileId: 'a|live|b', id: 'c' }] },
  { ...project.files[0], id: 'a', nodes: [{ ...originalNode, fileId: 'a', id: 'b|live|c' }] },
];
const collisionProject = { ...project, files: collisionFiles, fileMap: new Map(collisionFiles.map(file => [file.id, file])), diagnostics: [] };
const collisionResult = searchProjectNodes(collisionProject, 'is:changed value:needle', { changes: [{ ...first, fileId: 'a|live|b', nodeId: 'c' }], rules: [] });
assert.equal(collisionResult.total, 1);
assert.equal(collisionResult.matches[0].fileId, 'a|live|b');
const noResourceReads = { ...project, get semanticReferences() { throw new Error('results are already full'); }, get inventoryPaths() { throw new Error('results are already full'); } };
assert.equal(searchProject(noResourceReads, 'batch', 3).length, 3);

// A broad density graph expands every symbol once, with one dependency per
// symbol and a cycle. Reference-source reads must grow with edges, not nodes*edges.
const densityCount = 1000;
const graphProject = buildProject([{ path: 'Server/HytaleGenerator/WorldStructures/Main.json', text: '{"DefaultBiome":"Unused","Density":{},"Framework":[]}' }]);
const rootFile = graphProject.files[0];
const references = [];
for (let i = 0; i < densityCount; i++) {
  const name = `D${i}`;
  const target = { kind: 'symbol', type: 'Density', symbolType: 'Density', name, fileId: rootFile.id, filePath: rootFile.path };
  references.push({ id: `root-${i}`, relation: 'worldstructure-density', status: 'resolved', source: { fileId: rootFile.id, filePath: rootFile.path }, target, candidates: [] });
  references.push({ id: `edge-${i}`, relation: 'symbol-import', status: 'resolved', source: { fileId: `density-${i}`, filePath: `Density/${name}.json`, ownerSymbol: { symbolType: 'Density', name } }, target: { ...target, name: `D${(i + 1) % densityCount}` }, candidates: [] });
}
graphProject.semanticReferences = references;
const expectedGraph = measure('graph:1000-densities/2000-relations', () => buildProjectGraph(graphProject, rootFile.id, 8));
assert.equal(expectedGraph.nodes.length, densityCount + 2);
assert.equal(expectedGraph.edges.length, densityCount * 2 + 1);
let referenceVisits = 0;
graphProject.semanticReferences = references.map(ref => ({ ...ref, get source() { referenceVisits++; return ref.source; } }));
assert.deepEqual(buildProjectGraph(graphProject, rootFile.id, 8), expectedGraph);
assert.ok(referenceVisits <= references.length * 6, `graph source visits: ${referenceVisits}`);
graphProject.semanticReferences = [];
assert.equal(buildProjectGraph(graphProject, rootFile.id, 8).nodes.length, 1, 'new reference authority invalidates the per-build index');

// Representative layout work retains exact geometry/safety validation. Timing
// is evidence, not a UI-frame guarantee or a reason to skip a safety pass.
const nodeIds = Array.from({ length: 80 }, (_, i) => `Constant.Density-perf-${i}`);
const layoutInput = { $NodeId: 'Sum.Density-perf-root', Type: 'Sum', Inputs: nodeIds.map(($NodeId, Value) => ({ $NodeId, Type: 'Constant', Value })),
  $NodeEditorMetadata: { $Nodes: Object.fromEntries(['Sum.Density-perf-root', ...nodeIds].map((id, i) => [id, { $Position: { $x: i ? 800 : 0, $y: i * 150 } }])), $Groups: [], $Comments: [] } };
const layoutProject = buildProject([{ path: 'Density/Layout.json', text: JSON.stringify(layoutInput) }]);
for (const strategy of ['normalize', 'author-normalize', 'dag-rebuild']) {
  const settings = { strategy, horizontalGap: 50, verticalGap: 50, alignmentTolerance: 100, includeLive: true, floaterMode: 'ignore', dagBranchDirection: 'auto' };
  const first = measure(`layout:${strategy}/81-nodes`, () => buildLayoutProposal(layoutProject.files, settings));
  const second = buildLayoutProposal(layoutProject.files, settings);
  assert.deepEqual({ ...first, createdAt: 0 }, { ...second, createdAt: 0 });
  assert.ok(first.files.every(file => Number.isFinite(file.metrics.edgeNodeIntersectionsAfter)));
}

// Exercise the shipped embedded modules, including metric eviction and the
// real desktop request path, instead of only matching source declarations.
const context = vm.createContext({ console, Promise, Set, Map, WeakMap, Object, Array, String, Number, Boolean, Symbol, Error, TypeError, Date, Math, JSON,
  TextEncoder, TextDecoder, Blob, URL, URLSearchParams, DOMException, performance, setTimeout, clearTimeout,
  MessageChannel: class { constructor() { this.port1 = {}; this.port2 = { postMessage() {} }; } },
});
context.globalThis = context;
for (const name of ['amd-loader.js', 'preact-lite.js', 'compat-modules.js', 'app.js']) vm.runInContext(fs.readFileSync(`tauri-ui/${name}`, 'utf8'), context, { filename: name });
const diagnostics = context.require('support/runtimeDiagnostics');
for (let i = 0; i < 10000; i++) diagnostics.recordRuntimeMetric(`dynamic.${i}`, 1);
assert.equal(diagnostics.runtimeDiagnosticSummary().metricCount, 256);
assert.equal(diagnostics.runtimeDiagnosticSummary().evictedMetricNames, 10000 - 256);
assert.ok(!diagnostics.runtimeMetrics().some(metric => metric.name === 'dynamic.0'));
for (let i = 0; i < 500; i++) diagnostics.recordRuntimeMetric('recent', i % 10);
const recent = diagnostics.runtimeMetrics().find(metric => metric.name === 'recent');
assert.equal(recent.count, 500);
assert.equal(recent.p95Ms, 9);
for (let i = 0; i < 255; i++) diagnostics.recordRuntimeMetric(`other.${i}`, 1);
diagnostics.recordRuntimeMetric('recent', 2);
diagnostics.recordRuntimeMetric('newest', 1);
assert.ok(diagnostics.runtimeMetrics().some(metric => metric.name === 'recent'), 'recently used metrics survive eviction');
diagnostics.recordRuntimeMetric('x'.repeat(100000), 1);
assert.ok(diagnostics.runtimeMetrics().every(metric => metric.name.length <= 120));
for (let i = 0; i < 1000; i++) diagnostics.recordRuntimeMetric('sample-window', 0);
for (let i = 0; i < 96; i++) diagnostics.recordRuntimeMetric('sample-window', 9);
assert.equal(diagnostics.runtimeMetrics().find(metric => metric.name === 'sample-window').p50Ms, 9, 'percentiles retain only the newest 96 samples');

const bridge = context.require('io/desktopBridge');
context.fetch = async () => ({ status: 200, ok: true, json: async () => ({ kind: 'text', text: 'fixture', size: 7 }) });
for (let i = 0; i < 1000; i++) await bridge.desktopReadProjectTextPreview(`Density/${i}.json`);
assert.equal(diagnostics.runtimeMetrics().filter(metric => metric.name.startsWith('desktop.request:')).length, 1);
assert.equal(diagnostics.runtimeMetrics().find(metric => metric.name === 'desktop.request:/api/project/text-preview').count, 1000);
assert.ok(diagnostics.runtimeMetrics().every(metric => !metric.name.includes('?')));
context.fetch = async () => ({ status: 200, ok: true, json: async () => ({ nativeTrace: { phases: [{ name: 'desktop.project.native-open.total', durationMs: 0 }] } }) });
await bridge.desktopOpenProject('fixture-trace');
assert.ok(diagnostics.runtimeEvents().some(event => event.event === 'desktop.project.bridge-overhead' && event.traceId === 'fixture-trace'));
context.fetch = async () => ({ status: 500, ok: false, json: async () => ({ error: 'fixture failure' }) });
for (let i = 0; i < 100; i++) await assert.rejects(bridge.desktopOpenProject(`failed-${i}`), /fixture failure/);
assert.ok(diagnostics.runtimeDiagnosticSummary().metricCount <= 256);

const descriptor = context.require('projectFiles/descriptorIndex');
const workspace = { label: 'Fixture', sourceEntries: new Map(inventory.map(path => [path, {}])), semanticInfo: new Map() };
const descriptorIndex = measure('descriptor-index:10100-files/cold', () => descriptor.getProjectFileDescriptorIndex(project, workspace));
assert.equal(descriptorIndex.descriptors.length, inventory.length);
measure('descriptor-index:1000-cache-hits', () => { for (let i = 0; i < 1000; i++) assert.equal(descriptor.getProjectFileDescriptorIndex(project, workspace), descriptorIndex); });
assert.notEqual(descriptor.getProjectFileDescriptorIndex(project, { ...workspace, sourceEntries: new Map([...workspace.sourceEntries, ['Assets/extra.bin', {}]]) }), descriptorIndex);

const native = fs.readFileSync('src-tauri/src/main.rs', 'utf8');
assert.match(native, /mod performance_safety_tests;/);
assert.match(native, /tauri::async_runtime::spawn_blocking\(move \|\|/);
assert.match(native, /worldgen_scan\.begin\(&payload\.token\)/);
assert.match(native, /worldgen_scan\.cancel\(Some\(&payload\.token\)\)/);
assert.doesNotMatch(fs.readFileSync('src/io/desktopBridge.ts', 'utf8'), /tracedRequestDurations/);
console.log(JSON.stringify({ measurements, searchChangeVisits: changeVisits, graphReferenceVisits: referenceVisits, metricNames: diagnostics.runtimeDiagnosticSummary().metricCount,
  processHeapMiBAtEnd: +(process.memoryUsage().heapUsed / 1048576).toFixed(2), processRssMiBAtEnd: +(process.memoryUsage().rss / 1048576).toFixed(2) }, null, 2));
console.log('Pre-1.0 Audit 11 — performance/resources: PASS (operation-count and retention budgets; timings are observations, not frame-time guarantees)');
