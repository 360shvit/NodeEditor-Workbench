import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compareSemver } from './release-version.mjs';

const read = (file) => fs.readFileSync(file, 'utf8');
const contract = JSON.parse(read('release-spec/release-contract.json'));
const releaseIntegrityDeep = read('scripts/test-release-integrity-deep-v0.11.34.mjs');
const rcWorkflow = read('.github/workflows/validate-release-candidate.yml');
const releaseWorkflow = read('.github/workflows/release-windows.yml');

assert.ok(compareSemver(contract.version.semver, '0.11.35') >= 0, 'current release must not precede the v0.11.35 fix baseline');
if (contract.version.semver === '0.11.35') assert.match(contract.version.revision, /^r(?:9|[1-9]\d+)$/, 'v0.11.35 candidates must be r9 or later');

// The r9 fix protects the isolated release-sync mutation test from copying the entire
// dependency tree. That deep mutation test now belongs to RC/publish validation rather
// than the fast PR contract, so keep this regression attached to the deep suite.
assert.match(releaseIntegrityDeep, /installedNodeModules = path\.resolve\('node_modules'\)/);
assert.match(releaseIntegrityDeep, /installedTypeScript = path\.join\(installedNodeModules, 'typescript', 'bin', 'tsc'\)/);
assert.match(releaseIntegrityDeep, /fs\.symlinkSync\(installedNodeModules, path\.join\(tempProject, 'node_modules'\), process\.platform === 'win32' \? 'junction' : 'dir'\)/);
assert.doesNotMatch(releaseIntegrityDeep, /fs\.cpSync\([^\n]*node_modules/, 'temp release sync must not recursively duplicate node_modules');
assert.match(rcWorkflow, /test-release-integrity-deep-v0\.11\.34\.mjs/);
assert.match(releaseWorkflow, /test-release-integrity-deep-v0\.11\.34\.mjs/);

console.log(`${contract.version.display} temp release dependency-context contract: PASS`);
