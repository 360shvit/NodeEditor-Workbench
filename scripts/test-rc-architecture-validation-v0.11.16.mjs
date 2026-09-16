import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const cargo = read('src-tauri/Cargo.toml');
const capability = JSON.parse(read('src-tauri/capabilities/default.json'));
const runtime = read('src/support/runtimeDiagnostics.ts');
const persistence = read('src/projects/projectPersistence.ts');
const layout = read('src/workbench/workbenchLayoutPreferences.ts');
const commands = read('src/commands/commandRegistry.ts');
const store = read('src/store.ts');
const graph = read('src/features/project-graph/ProjectGraphView.tsx');
const main = read('src-tauri/src/main.rs');
const embedded = read('tauri-ui/app.js');
const releaseContract = JSON.parse(read('release-spec/release-contract.json'));

assert.equal(pkg.version, releaseContract.version.semver);
assert.equal(tauri.version, releaseContract.version.semver);
assert.match(cargo, new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.')}"`, 'm'));
assert.equal(read('BUILD_ID.txt').trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);
assert.match(read('src/App.tsx'), /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.match(runtime, /REPORT_SCHEMA_VERSION = 8/);
assert.match(runtime, /releaseValidation:/);
assert.match(runtime, /profile: RELEASE_VALIDATION_PROFILE/);
assert.match(runtime, /featureFreeze: RELEASE_FEATURE_FREEZE/);
assert.match(runtime, /canonicalRunRequired: RELEASE_CANONICAL_RUN_REQUIRED/);
assert.ok(embedded.includes(releaseContract.version.display));
assert.match(embedded, /exports\.RELEASE_VALIDATION_PROFILE = '[^']+'/);

// Security/authority boundaries remain unchanged in intent.
assert.deepEqual(capability.permissions, ['core:event:default', 'core:webview:allow-set-webview-zoom']);
assert.match(capability.description, /filesystem authority remain inside Rust commands/i);
assert.match(main, /apply_project_files/);
assert.match(main, /write_recovery_journal/);
assert.match(main, /apply_transaction_lock/);
assert.match(main, /Refusing to write a ZIP through a symlink\/junction or directory target/);
assert.match(main, /Refusing to write a diagnostic report through a symlink\/junction or directory target/);
assert.match(main, /CloseRequested/);
assert.match(main, /pending_change_count/);

// Frozen state ownership.
assert.match(persistence, /export interface ProjectSessionSnapshot[\s\S]*version: 1/);
assert.doesNotMatch(persistence, /splitViewEnabled|paneActiveTabIds|activePane|splitRatio/);
assert.match(layout, /WORKBENCH_LAYOUT_VERSION = 2/);
assert.match(store, /activePane/);
assert.match(store, /paneActiveTabIds/);
assert.match(store, /splitViewEnabled/);

// Command registry remains centralized; v0.11.17 adds only the deliberately approved override layer around it.
assert.match(commands, /WORKBENCH_COMMANDS/);
assert.match(commands, /commandShortcutConflicts/);
assert.match(commands, /commandForKeyboardEvent/);
assert.match(commands, /hytale-workbench\.hotkeys\.v1/);

// The validated canonical graph remains a singleton; post-validation product development may add explicit secondary graph instances.
assert.match(store, /const id = 'tab:project-graph'/);
assert.match(store, /setProjectGraphSettings/);
assert.match(store, /openProjectGraphAsNew/);
assert.match(graph, /project-graph-camera/);


// The later hardening lineage closes the distribution ambiguity with an explicit portable contract and requires a checked Cargo lock.
assert.equal(tauri.bundle.active, false);
assert.match(read('Build-Windows.cmd'), /Release build BLOCKED: src-tauri\\Cargo\.lock is missing/);
assert.match(read('tools/windows/Freeze-Windows-Dependencies.cmd'), /cargo generate-lockfile/);
if (fs.existsSync('src-tauri/Cargo.lock')) assert.ok(fs.statSync('src-tauri/Cargo.lock').size > 100);
if (fs.existsSync('package-lock.json')) {
  const npmLock = JSON.parse(read('package-lock.json'));
  assert.equal(npmLock.name, pkg.name, 'npm lock must belong to the current package');
  assert.equal(npmLock.version, pkg.version, 'npm lock must match the current package version');
  assert.ok(Number(npmLock.lockfileVersion) >= 2, 'npm lock must use a modern lockfile format');
  assert.equal(npmLock.packages?.['']?.name, pkg.name, 'npm lock root package name must match package.json');
  assert.equal(npmLock.packages?.['']?.version, pkg.version, 'npm lock root package version must match package.json');
}

// No product implementation drift in key domains compared with the validated r2 baseline hashes.
const expected = {
  'src-tauri/capabilities/default.json': '5042c8d799a75be8248b9877ea2c59aabca2c6fccaed0082c2cdd438c6e345a4',
  'src/projects/projectPersistence.ts': '497c6791bfc3eadc6b664db607f6664235aecf8b25bf5b4985063c46f1b2ed0b',
};
for (const [file, digest] of Object.entries(expected)) assert.equal(hash(file), digest, `${file} drifted during validation build`);

console.log('v0.11.16 RC Architecture Validation source contract passed');
