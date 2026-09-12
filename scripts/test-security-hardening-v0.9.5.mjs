import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const config = JSON.parse(read('../src-tauri/tauri.conf.json'));
const capability = JSON.parse(read('../src-tauri/capabilities/default.json'));
const rust = read('../src-tauri/src/main.rs');
const runtime = read('../tauri-ui/tauri-runtime.js');
const bridge = read('../src/io/desktopBridge.ts');
const build = read('../Build-Windows.cmd');
const pkg = JSON.parse(read('../package.json'));
const workflow = read('../.github/workflows/build-tauri-windows.yml');
const releaseWorkflow = read('../.github/workflows/release-windows.yml');
const desktopHtml = read('../tauri-ui/index.html');
const bootstrap = read('../tauri-ui/bootstrap.js');

assert.equal(config.version, pkg.version);
assert.equal(config.build.frontendDist, '../tauri-ui');
assert.equal(config.app.withGlobalTauri, true, 'Embedded runtime still intentionally uses window.__TAURI__ in v0.10.0');
assert.ok(config.app.security?.csp, 'CSP must be enabled');
assert.equal(config.app.security.csp['default-src'], "'self'");
assert.equal(config.app.security.csp['script-src'], "'self'");
assert.match(config.app.security.csp['connect-src'], /ipc:/);
assert.equal(config.app.security.csp['object-src'], "'none'");
assert.equal(config.app.security.csp['frame-src'], "'none'");
assert.equal(config.app.security.csp['base-uri'], "'none'");
assert.match(desktopHtml, /bootstrap\.js/);
assert.doesNotMatch(desktopHtml, /<script>(?!<\/script>)[\s\S]*?<\/script>/);
assert.match(bootstrap, /require\(\['main'\]\)/);

assert.deepEqual(capability.permissions, ['core:event:default', 'core:webview:allow-set-webview-zoom']);
assert.doesNotMatch(JSON.stringify(capability), /dialog:default|core:default|fs:|shell:|process:|http:/);

// The WebView may request an operation, but it must not register arbitrary absolute paths as authority.
for (const retired of ['scan_project', 'write_project_files', 'register_output', 'register_save_target', '/api/project/open-path']) {
  assert.doesNotMatch(runtime, new RegExp(retired.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.doesNotMatch(runtime, /tauri\.dialog/);
assert.match(runtime, /select_project/);
assert.match(runtime, /open_recent_project/);
assert.match(runtime, /revoke_recent_project/);
assert.match(runtime, /select_output_directory/);
assert.match(runtime, /select_save_target/);
assert.match(runtime, /apply_project_files/);
assert.match(bridge, /REAUTHORIZE_RECENT/);
assert.match(bridge, /desktopRevokeRecentProject/);

// Active-project reads/writes use relative paths and canonical containment checks.
assert.match(rust, /fn safe_relative/);
assert.match(rust, /resolve_existing_project_file/);
assert.match(rust, /canonical\.starts_with\(&project\.canonical_root\)/);
assert.match(rust, /fn inspect_output_path/);
assert.match(rust, /Output path escaped the selected output root/);
assert.match(rust, /Refusing to write a ZIP through a symlink\/junction or directory target/);

// Native project/output/save grants.
assert.match(rust, /blocking_pick_folder/);
assert.match(rust, /blocking_save_file/);
assert.match(rust, /RECENT_GRANTS_FILE/);
assert.match(rust, /recent_grants: Mutex<HashSet<PathBuf>>/);
assert.match(rust, /REAUTHORIZE_RECENT/);
// Keep the Tauri State borrow shorter than the Mutex lock result in setup().
assert.match(rust, /let recent_grants_lock = desktop_state\.recent_grants\.lock\(\);/);
assert.doesNotMatch(rust, /if let Ok\(mut recent_grants\) = desktop_state\.recent_grants\.lock\(\)/);

// Resource / malformed-project limits.
assert.match(rust, /MAX_PROJECT_ENTRIES/);
assert.match(rust, /MAX_JSON_FILES/);
assert.match(rust, /MAX_JSON_FILE_BYTES/);
assert.match(rust, /MAX_TOTAL_JSON_BYTES/);
assert.match(rust, /MAX_JSON_NESTING/);
assert.match(rust, /validate_json_nesting/);
assert.match(rust, /MAX_APPLY_FILES/);
assert.match(rust, /symlink_metadata/);
assert.match(rust, /seen_directories/);

// Apply final validation + crash recovery transaction.
assert.match(rust, /fn apply_project_files/);
assert.match(rust, /current == file\.expected/);
assert.match(rust, /hgw-txn-/);
assert.match(rust, /ApplyRecoveryJournal/);
assert.match(rust, /apply-transaction\.json/);
assert.match(rust, /recover_project_transaction/);
assert.match(rust, /ensure_apply_transaction_slot/);
assert.match(rust, /rollback_prepared/);
assert.match(rust, /active_write_paths/);
assert.match(rust, /Commit the runtime switch only after both scan and watcher setup succeeded/);
assert.match(rust, /let watcher = build_project_watcher/);
assert.match(rust, /sync_all/);
assert.match(rust, /apply_transaction_lock/);
assert.match(rust, /ZIP export target must use the \.zip extension/);

// Locked Rust build boundary. Local builds and CI refuse implicit dependency resolution.
assert.doesNotMatch(build, /cargo generate-lockfile/);
assert.match(build, /Release build BLOCKED: src-tauri\\Cargo\.lock is missing/);
assert.match(build, /cargo build --release --locked/);
assert.doesNotMatch(workflow, /cargo generate-lockfile/);
assert.match(workflow, /Require checked dependency lock/);
assert.match(workflow, /cargo test --locked/);
assert.doesNotMatch(releaseWorkflow, /tauri-apps\/tauri-action@/);
assert.match(releaseWorkflow, /release\/public/);
assert.match(releaseWorkflow, /release-surface\.mjs/);
assert.match(releaseWorkflow, /environment: release/);
assert.match(releaseWorkflow, /--bundles nsis --config src-tauri\/tauri\.installer\.conf\.json -- --locked/);
assert.match(releaseWorkflow, /TAURI_SIGNING_PRIVATE_KEY/);

// Direct JS dependency ranges are exact even though a package-lock cannot be generated in this offline build environment.
for (const section of ['dependencies', 'devDependencies']) {
  for (const [name, version] of Object.entries(pkg[section] ?? {})) {
    assert.doesNotMatch(version, /^[~^><=*]|\s\|\|\s/, `${name} should use an exact direct version in v0.10.0`);
  }
}

console.log(JSON.stringify({
  version: config.version,
  cspEnabled: true,
  frontendDialogCapability: false,
  arbitraryPathRegistrationFromWebView: false,
  recentProjectAuthority: 'native persisted grant',
  applyFinalConflictCheck: true,
  applyCrashRecovery: true,
  projectResourceLimits: true,
  rustBuildMode: 'checked Cargo.lock required; build/test use --locked',
}, null, 2));
