import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { compareSemver } from './release-version.mjs';

const read = (file) => fs.readFileSync(file, 'utf8');
const contract = JSON.parse(read('release-spec/release-contract.json'));
const rust = read('src-tauri/src/main.rs');
const bundle = read('tauri-ui/app.js');
const syncScript = read('scripts/sync-release-contract.mjs');
const bundleScript = read('scripts/embedded-bundle.mjs');

assert.ok(compareSemver('0.11.34', contract.version.semver) <= 0, 'release-integrity guarantees must survive later milestones');
assert.match(contract.version.display, new RegExp(`^${contract.version.semver.replaceAll('.', '\\.')}\-r[1-9]\\d*$`));
assert.equal(contract.updater.publication.updaterVersionSource, 'version.semver');
assert.equal(contract.updater.publication.allowSameSemverRepublish, false);

assert.ok(compareSemver('1.0.0', '1.0.1') < 0);
assert.ok(compareSemver('1.1.0-rc.1', '1.1.0-rc.2') < 0);
assert.ok(compareSemver('1.1.0-rc.2', '1.1.0') < 0);
assert.equal(compareSemver('1.0.0+build.1', '1.0.0+build.2'), 0, 'build metadata must not affect updater ordering');

assert.match(bundleScript, /--noCheck/);
assert.match(bundleScript, /--module', 'AMD'/);
assert.match(bundleScript, /byte-identical|byte-for-byte|byte-identical/i);
assert.match(syncScript, /checkEmbeddedBundle\(\)/);
assert.match(syncScript, /writeEmbeddedBundle\(\)/);
assert.match(bundle, /define\("release\/releaseIdentity"/);
assert.match(bundle, /define\("support\/releaseIdentity\.generated"/);
assert.doesNotMatch(bundle, /const APP_VERSION = /, 'shipped bundle must not restore hand-maintained release identity');

assert.match(rust, /const WORLDGEN_REPORT_CANDIDATE_MAX_BYTES: u64 = 8 \* 1024 \* 1024;/);
assert.match(rust, /\.take\(WORLDGEN_REPORT_CANDIDATE_MAX_BYTES\.saturating_add\(1\)\)/);
assert.match(rust, /worldgen_malformed_candidate_is_bounded_without_limiting_whole_file_scan/);
assert.match(rust, /assert_eq!\(report\.world_structure_name, ["']OlderComplete["']\);/);
assert.doesNotMatch(rust, /world_structure_name\.as_deref\(\)/, 'WorldgenPerformanceReport.world_structure_name is a String, not an Option<String>');
assert.match(rust, /struct RegisteredSaveTarget/);
assert.match(rust, /canonical_parent: PathBuf/);
assert.match(rust, /revalidate_registered_save_target\(&target\)\?/);
assert.match(rust, /registered_save_target_revalidates_parent_authority_before_write/);

const bundleCheck = spawnSync(process.execPath, ['scripts/embedded-bundle.mjs', '--check'], { encoding: 'utf8' });
assert.equal(bundleCheck.status, 0, `${bundleCheck.stdout}\n${bundleCheck.stderr}`);

// Exercise repeated synchronization in an isolated project copy. This catches the old
// v0.11.* / -r1 replacement trap without mutating the working tree.
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

// The temp project intentionally isolates source mutations, but release sync still needs
// the exact installed dev dependency set used by the parent test run. Link that dependency
// context instead of recursively copying node_modules into every temp tree.
const installedNodeModules = path.resolve('node_modules');
const installedTypeScript = path.join(installedNodeModules, 'typescript', 'bin', 'tsc');
assert.ok(fs.existsSync(installedTypeScript), 'release-integrity temp sync requires installed TypeScript dev dependency');
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

mutateTempContract((value) => {
  value.version.revision = 'r2';
  value.version.display = `${value.version.semver}-r2`;
  value.version.buildId = 'v0.11.34-r2-release-integrity-hardening';
});
runTempSync();
mutateTempContract((value) => {
  value.version.revision = 'r3';
  value.version.display = `${value.version.semver}-r3`;
  value.version.buildId = 'v0.11.34-r3-release-integrity-hardening';
});
runTempSync();
mutateTempContract((value) => {
  value.version.semver = '0.11.35';
  value.version.revision = 'r1';
  value.version.display = '0.11.35-r1';
  value.version.milestone = 'v0.11.35';
  value.version.buildId = 'v0.11.35-r1-release-integrity-hardening';
});
runTempSync();
mutateTempContract((value) => {
  value.version.revision = 'r2';
  value.version.display = '0.11.35-r2';
  value.version.buildId = 'v0.11.35-r2-release-integrity-hardening';
  value.updater.publication.publishable = true;
});
runTempSync(false);

fs.rmSync(tempRoot, { recursive: true, force: true });
console.log('v0.11.34 release-integrity contract: PASS');
