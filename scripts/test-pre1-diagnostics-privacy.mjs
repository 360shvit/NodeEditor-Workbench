import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';

function runtime(bridge) {
  const local = new Map();
  const context = vm.createContext({ console, Promise, Set, Map, WeakSet, WeakMap, Object, Array, String, Number, Boolean, Symbol, Error, TypeError, SyntaxError, Date, Math, JSON,
    TextEncoder, TextDecoder, Blob, URL, URLSearchParams, DOMException, performance, setTimeout, clearTimeout,
    MessageChannel: class { constructor() { this.port1 = {}; this.port2 = { postMessage() {} }; } },
    window: { __HYTALE_DESKTOP_BRIDGE__: !!bridge, __HYTALE_PERSISTENT_LOG__: bridge,
      localStorage: { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, value) } },
  });
  context.globalThis = context;
  for (const name of ['amd-loader.js', 'preact-lite.js', 'compat-modules.js', 'app.js']) vm.runInContext(fs.readFileSync(`tauri-ui/${name}`, 'utf8'), context, { filename: name });
  return context.require('support/runtimeDiagnostics');
}
const status = { enabled: true, format: 'jsonl', currentFile: 'workbench-current.jsonl', maxFileBytes: 2 * 1024 * 1024, retainedFiles: 4, currentBytes: 0 };
const batches = [];
const diagnostics = runtime({ status: async () => status, append: async entries => { batches.push(entries); return status; }, clear: async () => status });
const options = { includeProjectPaths: false, includeLogs: true, includePerformance: true };
const canary = 'P12Secret';
// V8 JSON parse errors can include the rejected input, even when no file is attached.
try { JSON.parse(canary); } catch (error) { diagnostics.recordRuntimeError('project.open.failed', error); }
assert.ok(!diagnostics.diagnosticReportJson(options).includes(canary), 'raw parser errors must not export project contents');
diagnostics.recordRuntimeError('runtime.unhandled-rejection', { toString() { throw Error('do not stringify untrusted errors'); } });
const paths = ['C:\\Users\\Private\\secret.json', 'D:/Work/Private/secret.json', '\\\\server\\share\\secret.json', '\\\\?\\C:\\Private\\secret.json', 'file:///C:/Private/secret.json', '/opt/private/secret.json', '../secret.json'];
for (const path of paths) diagnostics.recordRuntimeEvent('project.open.completed', { message: `Failed at ${path}`, data: { path, errorMessage: canary, content: canary, query: canary } });
diagnostics.recordRuntimeEvent('project.watcher.reload', { data: { changedPaths: ['Custom Assets/Private File.json', 'standalone.json'], changedPathCount: 2 } });
diagnostics.recordRuntimeMetric('desktop.request:/api/project/text-preview?path=PRIVATE_PROJECT_CONTENT_27182', 10);
diagnostics.recordRuntimeEvent('project.open.failed', { traceId: paths[0], data: { [canary]: true, password: canary, nodeCount: 7, status: 'failed' } });
const metadata = diagnostics.recordRuntimeEvent('project.open.completed', { data: { enabled: false, nodeCount: 7, inputCount: 3, status: 'completed', command: 'showExplorer', symbolType: canary } });
assert.deepEqual(JSON.parse(JSON.stringify(metadata.data)), { enabled: false, nodeCount: 7, inputCount: 3, status: 'completed', command: 'showExplorer' });
assert.equal(diagnostics.runtimeEvents()[0].data.errorName, 'SyntaxError');
for (const includeProjectPaths of [false, true]) {
  const report = diagnostics.diagnosticReportJson({ ...options, includeProjectPaths });
  assert.ok(!report.includes(canary));
  for (const path of paths) assert.ok(!report.includes(JSON.stringify(path).slice(1, -1)), `absolute/unsafe path retained: ${path}`);
  assert.equal(report.includes('Custom Assets/Private File.json'), includeProjectPaths);
  const parsed = JSON.parse(report);
  assert.equal(parsed.privacy.projectPathsIncluded, includeProjectPaths);
  assert.equal(parsed.privacy.projectContentsIncluded, false);
  assert.equal(parsed.privacy.automaticUpload, false);
}
await diagnostics.flushPersistentRuntimeLog();
assert.ok(!JSON.stringify(batches).includes('Private'));
assert.ok(!JSON.stringify(batches).includes('standalone.json'));
assert.ok(!JSON.stringify(batches).includes(canary));
const excluded = JSON.parse(diagnostics.diagnosticReportJson({ includeProjectPaths: false, includeLogs: false, includePerformance: false }));
for (const key of ['events', 'performance', 'slowOperations', 'traces']) assert.equal(excluded[key], undefined);

const cyclic = { nodeCount: 9 }; cyclic.metadata = cyclic;
assert.doesNotThrow(() => diagnostics.recordRuntimeEvent('project.open.completed', { data: cyclic }));
const throwing = { nodeCount: 5, get content() { throw Error('getter must not execute'); } };
assert.doesNotThrow(() => diagnostics.recordRuntimeEvent('project.open.completed', { data: throwing }));
let deep = { nodeCount: 1 }; for (let i = 0; i < 10000; i++) deep = { metadata: deep };
assert.doesNotThrow(() => diagnostics.recordRuntimeEvent('project.open.completed', { data: deep }));
const large = { paths: Array(30).fill('Custom Assets/' + '密'.repeat(1000) + '.json'), metadata: { paths: Array(30).fill('a'.repeat(600)) } };
for (let i = 0; i < 550; i++) diagnostics.recordRuntimeEvent('project.open.completed', { data: large });
const retained = diagnostics.runtimeEvents();
assert.equal(retained.length, 500);
assert.ok(retained.every(event => Buffer.byteLength(JSON.stringify(event)) <= 16 * 1024));
const exposed = diagnostics.recordRuntimeEvent('project.open.completed', { data: { paths: ['Custom/Original.json'] } });
exposed.data.paths[0] = canary;
diagnostics.runtimeEvents().at(-1).data.paths[0] = canary;
assert.ok(!diagnostics.diagnosticReportJson({ ...options, includeProjectPaths: true }).includes(canary), 'callers cannot mutate retained entries');
await diagnostics.flushPersistentRuntimeLog();

// Backpressure bounds the queue even when the native sink is stalled.
let unblock;
const held = new Promise(resolve => { unblock = resolve; });
let appends = 0;
const queued = runtime({ status: async () => status, append: async () => { appends++; await held; return status; }, clear: async () => status });
for (let i = 0; i < 1250; i++) queued.recordRuntimeEvent('project.open.completed', { data: { nodeCount: i } });
await Promise.resolve();
assert.equal(queued.persistentLogSupportSnapshot().queuedEvents, 1000);
assert.equal(queued.persistentLogSupportSnapshot().droppedEvents, 200);
assert.equal(appends, 1);
unblock(); await queued.flushPersistentRuntimeLog();
assert.equal(queued.persistentLogSupportSnapshot().queuedEvents, 0);

// Clearing waits for the old append and suppresses new writes until clear returns.
let finishAppend, finishClear;
const appending = new Promise(resolve => { finishAppend = resolve; });
const clearing = new Promise(resolve => { finishClear = resolve; });
let clearCalls = 0, raceAppends = 0;
const race = runtime({ status: async () => status,
  append: async () => { raceAppends++; await appending; return status; },
  clear: async () => { clearCalls++; await clearing; return status; },
});
race.recordRuntimeEvent('project.open.completed');
const flushing = race.flushPersistentRuntimeLog();
const firstClear = race.clearPersistentRuntimeLogs();
const secondClear = race.clearPersistentRuntimeLogs();
finishAppend(); await flushing;
// Allow the waiting clear continuation and its bridge call to run.
await Promise.resolve(); await Promise.resolve();
assert.equal(clearCalls, 1);
for (let i = 0; i < 75; i++) race.recordRuntimeEvent('project.open.completed');
await race.flushPersistentRuntimeLog();
assert.equal(raceAppends, 1);
assert.equal(race.persistentLogSupportSnapshot().queuedEvents, 0);
finishClear(); await Promise.all([firstClear, secondClear]);
race.recordRuntimeEvent('project.open.completed'); await race.flushPersistentRuntimeLog();
assert.equal(raceAppends, 2, 'logging resumes after clearing completes');

// Sink failures are bounded, non-recursive and do not retain raw OS error text.
let failures = 0;
const failed = runtime({ status: async () => status, append: () => { failures++; throw Error(canary); }, clear: async () => status });
failed.recordRuntimeEvent('project.open.completed'); await failed.flushPersistentRuntimeLog();
failed.recordRuntimeEvent('project.open.completed'); await failed.flushPersistentRuntimeLog();
assert.equal(failures, 1);
assert.equal(failed.persistentLogSupportSnapshot().available, false);
assert.ok(!failed.diagnosticReportJson(options).includes(canary));
await failed.clearPersistentRuntimeLogs();
assert.equal(failed.persistentLogSupportSnapshot().available, true);
assert.equal(failed.persistentLogSupportSnapshot().droppedEvents, 0);
failed.recordRuntimeEvent('project.open.completed'); await failed.flushPersistentRuntimeLog();
assert.equal(failures, 2, 'a synchronous sink throw must not leave a stale flush promise after recovery');

const source = fs.readFileSync('src/support/runtimeDiagnostics.ts', 'utf8');
assert.doesNotMatch(source, /\bfetch\s*\(|sendBeacon\s*\(|WebSocket\s*\(/, 'diagnostics have no upload transport');
assert.match(fs.readFileSync('src/components/WorkbenchSettings.tsx', 'utf8'), /\[includeProjectPaths, setIncludeProjectPaths\] = useState\(false\)/);
assert.match(fs.readFileSync('src-tauri/src/main.rs', 'utf8'), /mod diagnostic_privacy_tests;/);
console.log('Pre-1.0 Audit 12 — diagnostics/privacy: PASS (content/path canaries, opt-ins, recursion/byte/queue bounds, immutable snapshots, sink failure)');
