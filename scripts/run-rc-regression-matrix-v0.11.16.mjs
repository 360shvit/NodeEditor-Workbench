import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

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
const failures = [];
const timings = [];
const matrixStarted = performance.now();

for (const name of tests) {
  const started = performance.now();
  const result = spawnSync(process.execPath, [npmCli, 'run', name, '--silent'], { stdio: 'inherit', shell: false });
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
