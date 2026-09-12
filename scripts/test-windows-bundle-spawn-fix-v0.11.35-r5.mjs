import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const contract = JSON.parse(read('release-spec/release-contract.json'));
assert.equal(contract.version.semver, '0.11.35');
assert.match(contract.version.revision, /^r(?:[5-9]|[1-9]\d+)$/, 'current candidate must be r5 or later');

const bundle = read('scripts/embedded-bundle.mjs');
assert.match(bundle, /createRequire\(import\.meta\.url\)/, 'embedded bundler must resolve the local TypeScript package');
assert.match(bundle, /require\.resolve\('typescript\/bin\/tsc'\)/, 'embedded bundler must resolve TypeScript CLI from node_modules');
assert.match(bundle, /spawnSync\(process\.execPath, \[TYPESCRIPT_CLI, \.\.\.args\]/, 'embedded bundler must execute TypeScript through the current Node executable');
assert.ok(!bundle.includes('tsc.cmd'), 'embedded bundler must not spawn the Windows npm shim directly');
assert.ok(!bundle.includes("return process.platform === 'win32'"), 'platform-specific tsc shim selection must not return');

console.log('v0.11.35-r5 Windows embedded-bundle spawn contract: PASS');
