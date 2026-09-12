import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';

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

for (const name of tests) {
  const result = spawnSync(process.execPath, [npmCli, 'run', name, '--silent'], { stdio: 'inherit', shell: false });
  if (result.error) console.error(`${name}: ${result.error.message}`);
  if (result.status !== 0) failures.push({ name, status: result.status ?? 1 });
}

if (failures.length) {
  console.error(`RC regression matrix failed: ${failures.map((item) => `${item.name}(${item.status})`).join(', ')}`);
  process.exit(1);
}

console.log(`RC regression matrix passed (${tests.length}/${tests.length} self-contained suites).`);
