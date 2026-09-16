import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compareSemver } from './release-version.mjs';

const read = (file) => fs.readFileSync(file, 'utf8');
const contract = JSON.parse(read('release-spec/release-contract.json'));
const releaseIntegrity = read('scripts/test-release-integrity-v0.11.34.mjs');

assert.ok(compareSemver(contract.version.semver, '0.11.35') >= 0, 'current release must not precede the v0.11.35 fix baseline');
if (contract.version.semver === '0.11.35') assert.match(contract.version.revision, /^r(?:9|[1-9]\d+)$/, 'v0.11.35 candidates must be r9 or later');
assert.match(releaseIntegrity, /installedNodeModules = path\.resolve\('node_modules'\)/);
assert.match(releaseIntegrity, /installedTypeScript = path\.join\(installedNodeModules, 'typescript', 'bin', 'tsc'\)/);
assert.match(releaseIntegrity, /fs\.symlinkSync\(installedNodeModules, path\.join\(tempProject, 'node_modules'\), process\.platform === 'win32' \? 'junction' : 'dir'\)/);
assert.doesNotMatch(releaseIntegrity, /fs\.cpSync\([^\n]*node_modules/, 'temp release sync must not recursively duplicate node_modules');

console.log(`${contract.version.display} temp release dependency-context contract: PASS`);
