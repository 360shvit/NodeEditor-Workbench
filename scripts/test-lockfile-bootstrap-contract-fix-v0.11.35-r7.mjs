import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compareSemver } from './release-version.mjs';
import { spawnSync } from 'node:child_process';

const read = (file) => fs.readFileSync(file, 'utf8');
const contract = JSON.parse(read('release-spec/release-contract.json'));
assert.ok(compareSemver(contract.version.semver, '0.11.35') > 0 || Number(contract.version.revision.slice(1)) >= 7, 'v0.11.35 candidates must be r7 or later; later SemVer releases inherit this fix');

const legacy = read('scripts/test-rc-architecture-validation-v0.11.16.mjs');
assert.doesNotMatch(legacy, /existsSync\('package-lock\.json'\),\s*false/, 'historical test must not require package-lock.json to be absent');
assert.match(legacy, /npmLock\.lockfileVersion/, 'historical test must validate a present npm lock');
assert.match(legacy, /npm lock root package name must match package\.json/, 'historical test must validate root package identity');

const packageJson = JSON.parse(read('package.json'));
const lockPath = 'package-lock.json';
const hadLock = fs.existsSync(lockPath);
const originalLock = hadLock ? fs.readFileSync(lockPath) : null;
try {
  if (!hadLock) {
    fs.writeFileSync(lockPath, JSON.stringify({
      name: packageJson.name,
      version: packageJson.version,
      lockfileVersion: 3,
      requires: true,
      packages: {
        '': {
          name: packageJson.name,
          version: packageJson.version,
          dependencies: packageJson.dependencies ?? {},
          devDependencies: packageJson.devDependencies ?? {},
        },
      },
    }, null, 2) + '\n');
  }
  const result = spawnSync(process.execPath, ['scripts/test-rc-architecture-validation-v0.11.16.mjs'], { stdio: 'inherit' });
  assert.equal(result.status, 0, 'historical architecture test must pass when package-lock.json exists');
} finally {
  if (hadLock && originalLock) fs.writeFileSync(lockPath, originalLock);
  else if (fs.existsSync(lockPath)) fs.rmSync(lockPath);
}

console.log('v0.11.35-r7 lockfile bootstrap compatibility contract: PASS');
