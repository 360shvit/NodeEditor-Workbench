import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { spawnTypeScript } from './typescript-cli.mjs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const excluded = new Set([
  'test:layout-baseline', // requires an explicit external/fixture baseline argument
  'test:rc-regression-matrix',
]);
const tests = Object.keys(pkg.scripts).filter((name) => name.startsWith('test:') && !excluded.has(name));
// Invoke npm's JavaScript entrypoint through Node. A .cmd shim cannot be
// spawned with shell:false on Windows.
const npmCli = process.env.npm_execpath;
if (!npmCli || !fs.existsSync(npmCli)) {
  throw new Error('Run this matrix with npm run test:rc-regression-matrix.');
}

// Several historical runtime suites consume the same emitted .core-build and used to
// re-run the identical tsconfig.core.json compilation independently. Build it once for
// the matrix, then let helper-based suites reuse it. The three package scripts that
// prepend `npm run typecheck:core` are invoked directly here so standalone npm test
// commands remain self-contained for developers.
const directCoreSuites = new Map([
  ['test:core', 'scripts/test-core.mjs'],
  ['test:performance-tracing', 'scripts/test-performance-tracing-v0.11.1.mjs'],
  ['test:performance-optimization', 'scripts/test-performance-optimization-v0.11.5.mjs'],
]);
const coreBuildStarted = performance.now();
const coreBuild = spawnTypeScript(['-p', 'tsconfig.core.json', '--pretty', 'false'], { stdio: 'inherit' });
if (coreBuild.error) throw coreBuild.error;
if (coreBuild.status !== 0) process.exit(coreBuild.status ?? 1);
console.log(`[regression-timing] shared-core-build ${((performance.now() - coreBuildStarted) / 1000).toFixed(2)}s`);

const failures = [];
const timings = [];
const matrixStarted = performance.now();
const sharedEnv = { ...process.env, HGW_CORE_BUILD_READY: '1' };

for (const name of tests) {
  const started = performance.now();
  const directScript = directCoreSuites.get(name);
  const result = directScript
    ? spawnSync(process.execPath, [directScript], { stdio: 'inherit', shell: false, env: sharedEnv })
    : spawnSync(process.execPath, [npmCli, 'run', name, '--silent'], { stdio: 'inherit', shell: false, env: sharedEnv });
  const durationMs = performance.now() - started;
  timings.push({ name, durationMs, status: result.status ?? 1 });
  console.log(`[regression-timing] ${name} ${(durationMs / 1000).toFixed(2)}s`);
  if (result.error) console.error(`${name}: ${result.error.message}`);
  if (result.status !== 0) failures.push({ name, status: result.status ?? 1 });
}

const totalMs = performance.now() - matrixStarted;
const slowest = timings
  .slice()
  .sort((left, right) => right.durationMs - left.durationMs)
  .slice(0, 10);
console.log(`[regression-timing] total ${(totalMs / 1000).toFixed(2)}s`);
console.log(`[regression-timing] slowest ${slowest.map((item) => `${item.name}=${(item.durationMs / 1000).toFixed(2)}s`).join(', ')}`);

if (failures.length) {
  console.error(`RC regression matrix failed: ${failures.map((item) => `${item.name}(${item.status})`).join(', ')}`);
  process.exit(1);
}

console.log(`RC regression matrix passed (${tests.length}/${tests.length} self-contained suites).`);
