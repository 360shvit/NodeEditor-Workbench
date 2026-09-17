import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const hashFile = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const cargo = read('src-tauri/Cargo.toml');
const rust = read('src-tauri/src/main.rs');
const capabilities = read('src-tauri/capabilities/default.json');
const runtime = read('src/support/runtimeDiagnostics.ts');
const app = read('src/App.tsx');
const buildId = read('BUILD_ID.txt');
const readme = read('README.md');
const noticeGenerator = read('scripts/generate-third-party-notices.mjs');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(cargo, new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.')}"`, 'm'));
assert.equal(buildId.trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.match(runtime, /REPORT_SCHEMA_VERSION = 8/);

// Native-only integration: no JS plugin package or new guest permissions are required.
assert.match(cargo, /tauri-plugin-window-state = "2\.4\.1"/);
assert.doesNotMatch(JSON.stringify(pkg.dependencies ?? {}), /window-state/);
assert.doesNotMatch(JSON.stringify(pkg.devDependencies ?? {}), /window-state/);
assert.match(capabilities, /"core:event:default"/);
assert.doesNotMatch(capabilities, /window-state/);
assert.equal(hashFile('src-tauri/capabilities/default.json'), '5042c8d799a75be8248b9877ea2c59aabca2c6fccaed0082c2cdd438c6e345a4');

// The plugin owns exactly the main window and exactly the agreed persistence flags.
assert.match(rust, /use tauri_plugin_window_state::StateFlags;/);
assert.match(rust, /tauri_plugin_window_state::Builder::default\(\)/);
assert.match(rust, /\.with_filter\(\|label\| label == "main"\)/);
assert.match(rust, /StateFlags::SIZE \| StateFlags::POSITION \| StateFlags::MAXIMIZED/);
assert.doesNotMatch(rust, /StateFlags::FULLSCREEN/);
assert.doesNotMatch(rust, /StateFlags::VISIBLE/);
assert.doesNotMatch(rust, /StateFlags::DECORATIONS/);

// Existing close safety remains authoritative: close is prevented until the frontend approves app.exit.
assert.match(rust, /WindowEvent::CloseRequested/);
assert.match(rust, /api\.prevent_close\(\)/);
assert.match(rust, /app-close-requested/);
assert.match(rust, /fn exit_application\(app: AppHandle\)/);
assert.match(rust, /app\.exit\(0\)/);

// Existing defaults remain the cold-start/fallback geometry.
const mainWindow = tauri.app.windows.find((window) => window.label === 'main');
assert.ok(mainWindow, 'main window config must exist');
assert.equal(mainWindow.width, 1600);
assert.equal(mainWindow.height, 980);
assert.equal(mainWindow.minWidth, 1100);
assert.equal(mainWindow.minHeight, 700);
assert.equal(mainWindow.resizable, true);
assert.equal(mainWindow.fullscreen, false);

// Support reports expose the fixed window-state contract without leaking raw coordinates.
assert.match(runtime, /windowState: \{/);
assert.match(runtime, /trackedWindow: 'main'/);
assert.match(runtime, /persisted: \['size', 'position', 'maximized'\]/);
assert.match(runtime, /source: 'tauri-plugin-window-state'/);
assert.match(runtime, /desktop\.window-state\.enabled/);
assert.doesNotMatch(runtime, /windowX|windowY|windowWidth|windowHeight/);

// v0.11.11 must not mutate project/sidebar/session ownership while introducing desktop window persistence.
assert.equal(hashFile('src/components/WorkbenchSidebar.tsx'), '60f03ce06748098e26dd1b8d7613c74221b0a9cb66200fdf31479285d1158a4b');
assert.equal(hashFile('src/components/WorkbenchRail.tsx'), 'fae19cf5925657639ba85a53fbcc50f5a2590a9a8480b81834e65355be0146db');
assert.equal(hashFile('src/components/ProjectExplorer.tsx'), '8900fab72a28023c4e3b133b772f7b88fd3f1e32b2f6740ae8fead456c22d7fd');
assert.equal(hashFile('src/components/ExplorerSelectionDialog.tsx'), 'ebc00dcb3091986d4d66a286ea2673ddc4a66272d77c56ad0a2c5330e0c87366');
assert.equal(hashFile('src/features/visual/VisualLayoutSidebar.tsx'), 'ae0e96d5ccae7fb44bc279fc105369ee33def01f1b9801c1da26fb2fdb8ce44c');
assert.match(read('src/features/project-graph/ProjectGraphSidebar.tsx'), /Open as new graph/);
assert.equal(hashFile('src/projects/projectPersistence.ts'), '7e6df70a194355682a7eab6bea8c1a9f05a38d3c2119bf6fc32fe17476ecb31f');
const tauriRuntime = read('tauri-ui/tauri-runtime.js');
assert.match(tauriRuntime, /app-close-requested/);
assert.match(tauriRuntime, /project-files-changed/);

assert.match(readme, /Build the user installer|Windows Installer/);
assert.match(noticeGenerator, /audit-third-party-distribution\.mjs/);
assert.match(noticeGenerator, /classification === 'runtime'/);
assert.match(noticeGenerator, /pkg\.complianceFiles\?\.length/);
assert.match(noticeGenerator, /legalTextSha256/);

console.log('v0.11.11 Native Window Persistence regression checks passed');
