import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execTypeScript } from './typescript-cli.mjs';

const read = (path) => fs.readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const runtimeSource = read('src/support/runtimeDiagnostics.ts');
const perfSource = read('src/support/performanceTracing.ts');
const layoutSource = read('src/features/visual/VisualLayoutTab.tsx');
const graphSource = read('src/features/project-graph/ProjectGraphView.tsx');
const searchSource = read('src/components/SearchSidebar.tsx');
const quickOpenSource = read('src/components/QuickOpen.tsx');
const changeSource = read('src/components/ChangePanel.tsx');
const appSource = read('src/App.tsx');
const loaderSource = read('src/io/folderLoader.ts');
const rust = read('src-tauri/src/main.rs');
const settings = read('src/components/WorkbenchSettings.tsx');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(read('src-tauri/Cargo.toml'), new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.') }"`, 'm'));
assert.equal(read('BUILD_ID.txt').trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);
assert.match(appSource, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);

assert.match(runtimeSource, /REPORT_SCHEMA_VERSION = 8/);
assert.match(runtimeSource, /MAX_METRIC_SAMPLES = 96/);
assert.match(runtimeSource, /p50Ms/);
assert.match(runtimeSource, /p95Ms/);
assert.match(runtimeSource, /p99Ms/);
assert.match(runtimeSource, /runtimeSlowOperations/);
assert.match(runtimeSource, /performance\.slow-operation/);
assert.doesNotMatch(runtimeSource, /fetch\(/, 'support report must remain local-only');
assert.match(perfSource, /beginPerformanceOperation/);
assert.match(perfSource, /measurePerformanceSync/);
assert.match(perfSource, /measurePerformanceAsync/);
assert.match(perfSource, /recordPerformanceDuration/);
assert.match(perfSource, /aggregateOnly/);

for (const marker of [
  'layout.generate', 'layout.stage', 'layout.render.commit', 'graph.build', 'graph.layout', 'search.preview',
  'search.direct-navigation', 'quick-open.search', 'changes.apply', 'changes.project-copy',
  'changes.zip-export', 'project.rescan', 'project.workspace-reload',
]) {
  const combined = [layoutSource, graphSource, searchSource, quickOpenSource, changeSource, appSource, loaderSource].join('\n');
  assert.ok(combined.includes(marker), `missing unified performance marker ${marker}`);
}
for (const phase of [
  'desktop.project.inventory.directory-canonicalize',
  'desktop.project.inventory.enumerate',
  'desktop.project.inventory.metadata',
  'desktop.project.inventory.file-canonicalize',
  'desktop.project.inventory.relative-path',
  'desktop.project.inventory.other',
]) assert.ok(rust.includes(phase), `missing native inventory phase ${phase}`);
assert.match(settings, /slow ops/);
assert.match(settings, /p50\/p95\/p99/);

fs.rmSync('.support-build', { recursive: true, force: true });
try {
  execTypeScript(['-p', 'tsconfig.support.json'], { stdio: 'inherit' });
  const runtime = await import('../.support-build/runtimeDiagnostics.js');
  const perf = await import('../.support-build/performanceTracing.js');

  runtime.recordRuntimeMetric('synthetic.percentile', 10);
  runtime.recordRuntimeMetric('synthetic.percentile', 20);
  runtime.recordRuntimeMetric('synthetic.percentile', 30);
  runtime.recordRuntimeMetric('synthetic.percentile', 40);
  runtime.recordRuntimeMetric('synthetic.percentile', 50);
  const percentileMetric = runtime.runtimeMetrics().find((item) => item.name === 'synthetic.percentile');
  assert.ok(percentileMetric);
  assert.equal(percentileMetric.p50Ms, 30);
  assert.equal(percentileMetric.p95Ms, 50);
  assert.equal(percentileMetric.p99Ms, 50);

  runtime.recordRuntimeMetric('search.synthetic-slow', 650);
  assert.ok(runtime.runtimeSlowOperations().some((item) => item.name === 'search.synthetic-slow'));

  const op = perf.beginPerformanceOperation('layout.synthetic', { data: { nodeCount: 12 } });
  const value = op.phase('prepare', () => 42, { fileCount: 2 });
  assert.equal(value, 42);
  op.end({ patchCount: 3 });
  const trace = runtime.runtimeTraceSummaries().find((item) => item.traceId === op.traceId);
  assert.ok(trace);
  assert.ok(trace.phases.some((item) => item.event === 'layout.synthetic.prepare'));
  assert.ok(trace.phases.some((item) => item.event === 'layout.synthetic.total'));

  const eventsBefore = runtime.runtimeEvents().length;
  const aggregateResult = perf.measurePerformanceSync('quick-open.synthetic', () => 7, {
    aggregateOnly: true,
    thresholds: { noteworthyMs: 1_000_000, slowMs: 2_000_000, verySlowMs: 3_000_000 },
  });
  assert.equal(aggregateResult, 7);
  assert.ok(runtime.runtimeMetrics().some((item) => item.name === 'quick-open.synthetic.total'));
  assert.equal(runtime.runtimeEvents().length, eventsBefore, 'normal aggregate-only operations must not flood the event ring');

  const report = runtime.createDiagnosticReport({ includeProjectPaths: false, includeLogs: true, includePerformance: true });
  assert.equal(report.schemaVersion, 8);
  assert.equal(report.privacy.projectContentsIncluded, false);
  assert.equal(report.privacy.automaticUpload, false);
  assert.ok(Array.isArray(report.slowOperations));
  assert.ok(report.performance.some((item) => item.name === 'synthetic.percentile'));
} finally {
  fs.rmSync('.support-build', { recursive: true, force: true });
}

console.log('v0.11.2 Unified Performance Tracing checks passed');
