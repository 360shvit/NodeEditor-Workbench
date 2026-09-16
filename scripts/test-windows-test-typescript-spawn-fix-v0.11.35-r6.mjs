import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compareSemver } from './release-version.mjs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const contract = JSON.parse(read('release-spec/release-contract.json'));
assert.ok(compareSemver(contract.version.semver, '0.11.35') > 0 || Number(contract.version.revision.slice(1)) >= 6, 'v0.11.35 candidates must be r6 or later; later SemVer releases inherit this fix');

const helper = read('scripts/typescript-cli.mjs');
assert.match(helper, /require\.resolve\('typescript\/bin\/tsc'\)/, 'shared TypeScript helper must resolve the local package CLI');
assert.match(helper, /process\.execPath/, 'shared TypeScript helper must launch the CLI through the current Node executable');
assert.doesNotMatch(helper, /tsc\.cmd/, 'shared helper must not depend on the Windows npm shim');

const scripts = fs.readdirSync('scripts').filter((name) => name.endsWith('.mjs'));
const offenders = [];
for (const name of scripts) {
  if (name === path.basename(import.meta.url)) continue;
  const source = read(path.join('scripts', name));
  if (/execFileSync\(\s*['"]tsc(?:\.cmd)?['"]/.test(source) || /spawnSync\(\s*['"]tsc(?:\.cmd)?['"]/.test(source)) offenders.push(name);
}
assert.deepEqual(offenders, [], `test scripts must not spawn tsc through PATH: ${offenders.join(', ')}`);

for (const name of [
  'test-explorer-descriptor-index-v0.11.9.mjs',
  'test-semantic-discovery-v0.10.1.mjs',
  'test-semantic-references-v0.10.3.mjs',
  'test-resource-references-v0.10.5.mjs',
  'test-resource-reference-ux-v0.10.7.mjs',
  'test-whole-project-explorer-v0.10.8.mjs',
  'test-state-reset-audit-v0.10.9.mjs',
  'test-unified-performance-tracing-v0.11.2.mjs',
  'test-workbench-ux-polish-v0.11.17.mjs',
  'test-persistent-structured-logging-v0.11.18.mjs',
  'test-settings-appearance-v0.11.23.mjs',
]) {
  assert.match(read(path.join('scripts', name)), /typescript-cli\.mjs/, `${name} must use the shared TypeScript launcher`);
}

console.log('v0.11.35-r6 Windows regression TypeScript launcher contract: PASS');
