import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const read = (file) => fs.readFileSync(file, 'utf8');

const bundleCheck = spawnSync(process.execPath, ['scripts/embedded-bundle.mjs', '--check'], { encoding: 'utf8' });
assert.equal(bundleCheck.status, 0, `${bundleCheck.stdout}\n${bundleCheck.stderr}`);

// Exercise repeated synchronization in an isolated project copy. This protects the
// historical replacement/idempotence failure without pinning the current product
// version to a specific patch or prerelease string.
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hgw-release-sync-'));
const tempProject = path.join(tempRoot, 'project');
fs.cpSync('.', tempProject, {
  recursive: true,
  filter(source) {
    const relative = path.relative('.', source).replaceAll('\\', '/');
    return !relative.startsWith('.core-build')
      && !relative.startsWith('.support-build')
      && !relative.startsWith('node_modules')
      && !relative.startsWith('src-tauri/target')
      && relative !== 'release';
  },
});

const installedNodeModules = path.resolve('node_modules');
const installedTypeScript = path.join(installedNodeModules, 'typescript', 'bin', 'tsc');
assert.ok(fs.existsSync(installedTypeScript), 'release-integrity deep sync requires installed TypeScript dev dependency');
fs.symlinkSync(installedNodeModules, path.join(tempProject, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');

function runTempSync(expectSuccess = true) {
  const result = spawnSync(process.execPath, ['scripts/sync-release-contract.mjs'], { cwd: tempProject, encoding: 'utf8' });
  if (expectSuccess) assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  else assert.notEqual(result.status, 0, 'publishable r2 must be rejected');
  return result;
}

function mutateTempContract(mutator) {
  const file = path.join(tempProject, 'release-spec/release-contract.json');
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutator(value);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

const current = JSON.parse(read('release-spec/release-contract.json'));
mutateTempContract((value) => {
  value.version.revision = 'r2';
  value.version.display = `${value.version.semver}-r2`;
  value.version.buildId = `v${value.version.semver}-r2-release-integrity-deep`;
});
runTempSync();
mutateTempContract((value) => {
  value.version.revision = 'r3';
  value.version.display = `${value.version.semver}-r3`;
  value.version.buildId = `v${value.version.semver}-r3-release-integrity-deep`;
});
runTempSync();

// Prove the synchronizer accepts a later prerelease independently of today's version.
mutateTempContract((value) => {
  value.version.semver = '9.8.7-rc.2';
  value.version.revision = 'r1';
  value.version.display = '9.8.7-rc.2-r1';
  value.version.milestone = 'v9.8.7-rc.2';
  value.version.buildId = 'v9.8.7-rc.2-r1-release-integrity-deep';
  value.updater.integrationMilestone = 'v9.8.7-rc.2-r1';
});
runTempSync();

// Public publication remains r1-only regardless of the current product version.
mutateTempContract((value) => {
  value.version.revision = 'r2';
  value.version.display = `${value.version.semver}-r2`;
  value.version.buildId = `v${value.version.semver}-r2-release-integrity-deep`;
  value.updater.publication.publishable = true;
});
runTempSync(false);

fs.rmSync(tempRoot, { recursive: true, force: true });
console.log(`release-integrity deep mutation contract: PASS (baseline ${current.version.semver})`);
