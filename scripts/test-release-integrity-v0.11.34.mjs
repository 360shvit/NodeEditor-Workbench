import assert from 'node:assert/strict';
import fs from 'node:fs';
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

console.log('v0.11.34 release-integrity fast contract: PASS');
