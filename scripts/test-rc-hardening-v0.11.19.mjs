import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const build = read('Build-Windows.cmd');
const freeze = read('tools/windows/Freeze-Windows-Dependencies.cmd');
const safety = read('Test-Windows-Safety.cmd');
const nodeCard = read('src/components/NodeCard.tsx');
const searchSidebar = read('src/components/SearchSidebar.tsx');
const runtime = read('src/support/runtimeDiagnostics.ts');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.bundle.active, false, 'portable RC1 decision intentionally keeps Tauri bundling disabled');
assert.match(read('src-tauri/Cargo.toml'), new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.') }"`, 'm'));
assert.equal(read('BUILD_ID.txt').trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);
assert.match(read('src/App.tsx'), /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.match(runtime, /profile: RELEASE_VALIDATION_PROFILE/);
assert.match(runtime, /featureFreeze: RELEASE_FEATURE_FREEZE/);
assert.match(runtime, /REPORT_SCHEMA_VERSION = 8/);

// Ordinary build/safety never resolve a new dependency set implicitly.
assert.match(build, /Release build BLOCKED: src-tauri\\Cargo\.lock is missing/);
assert.match(build, /cargo build --release --locked --manifest-path src-tauri\\Cargo\.toml/);
assert.doesNotMatch(build, /cargo generate-lockfile/);
assert.match(safety, /Native safety test BLOCKED: src-tauri\\Cargo\.lock is missing/);
assert.match(safety, /cargo test --locked --manifest-path src-tauri\\Cargo\.toml/);
assert.doesNotMatch(safety, /cargo generate-lockfile/);

// Dependency resolution has exactly one explicit capture workflow.
assert.match(freeze, /cargo generate-lockfile --manifest-path src-tauri\\Cargo\.toml/);
assert.match(freeze, /cargo check --locked/);
assert.match(freeze, /cargo tree --locked/);
assert.match(freeze, /cargo metadata --locked/);
assert.match(freeze, /Cargo\.lock\.sha256\.txt/);


// Portable packaging remains intentionally absent from the current source tree.
assert.equal(fs.existsSync('Package-Windows-Portable.cmd'), false);

// Collapse/disclosure consistency: explicit Node and Search controls use the local Lucide chevrons.
assert.match(nodeCard, /LucideIcon name=\{collapsed \? 'chevron-right' : 'chevron-down'\}/);
assert.doesNotMatch(nodeCard, /[›⌄]/);
assert.match(searchSidebar, /name="chevron-right" size=\{14\} className="details-chevron"/);
assert.match(read('src/styles.css'), /search-recent-dropdown\[open\].*details-chevron/s);

// Hardening's native/security/persistence boundaries remain byte-identical; later product work may intentionally evolve store/graph UI state.
const frozen = {
  'src/projects/projectPersistence.ts': '7e6df70a194355682a7eab6bea8c1a9f05a38d3c2119bf6fc32fe17476ecb31f',
  'src/commands/commandRegistry.ts': '47f00fedb615856a9f44dbbb1e5123b0ede5fbe1a32942218a0b477d66247245',
  'src/workbench/workbenchLayoutPreferences.ts': '156f1f39dcd45df58d3ab2d7dc31adc8824e69a97e8e2b3e2cb5cb2ad4ca5322',
  'src-tauri/capabilities/default.json': '5042c8d799a75be8248b9877ea2c59aabca2c6fccaed0082c2cdd438c6e345a4',
};
for (const [file, expected] of Object.entries(frozen)) assert.equal(hash(file), expected, `${file} changed outside v0.11.19 hardening scope`);
assert.match(read('src-tauri/src/main.rs'), /pending_change_count/);
assert.match(read('src-tauri/src/main.rs'), /metadata_is_reparse_point/);
assert.match(read('tauri-ui/tauri-runtime.js'), /app-close-requested/);

// r1 may intentionally lack the lock; if present it must at least be non-empty and is ready for r2 freeze verification.
if (fs.existsSync('src-tauri/Cargo.lock')) assert.ok(fs.statSync('src-tauri/Cargo.lock').size > 100, 'Cargo.lock must not be an empty placeholder');

console.log('v0.11.19 RC Hardening source contract passed (lock-capture candidate)');
