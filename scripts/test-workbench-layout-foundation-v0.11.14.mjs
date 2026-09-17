import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const hashFile = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const cargo = read('src-tauri/Cargo.toml');
const app = read('src/App.tsx');
const prefs = read('src/workbench/workbenchLayoutPreferences.ts');
const splitter = read('src/components/WorkbenchSplitter.tsx');
const settings = read('src/components/WorkbenchSettings.tsx');
const styles = read('src/styles.css');
const runtime = read('src/support/runtimeDiagnostics.ts');
const persistence = read('src/projects/projectPersistence.ts');
const embeddedApp = read('tauri-ui/app.js');
const embeddedStyles = read('tauri-ui/styles.css');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(cargo, new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.')}"`, 'm'));
assert.equal(read('BUILD_ID.txt').trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.match(runtime, /REPORT_SCHEMA_VERSION = 8/);
assert.match(pkg.scripts['test:workbench-layout'], /test-workbench-layout-foundation-v0\.11\.14\.mjs/);

// One global Workbench preference, not project-session state.
assert.match(prefs, /hytale-workbench\.layout\.v2/);
assert.match(prefs, /hytale-workbench\.layout\.v1/);
assert.match(prefs, /WORKBENCH_LAYOUT_VERSION = 2/);
assert.match(prefs, /WORKBENCH_SPLIT_DEFAULT_RATIO = 0\.5/);
assert.match(prefs, /WORKBENCH_SIDEBAR_DEFAULT_WIDTH = 292/);
assert.match(prefs, /WORKBENCH_SIDEBAR_MIN_WIDTH = 220/);
assert.match(prefs, /WORKBENCH_SIDEBAR_MAX_WIDTH = 520/);
assert.match(prefs, /clampWorkbenchSidebarWidth/);
assert.match(prefs, /localStorage\.setItem/);
assert.match(prefs, /localStorage\.removeItem/);
assert.doesNotMatch(persistence, /sidebarWidth|workbench\.layout/);
assert.equal(hashFile('src/projects/projectPersistence.ts'), '7e6df70a194355682a7eab6bea8c1a9f05a38d3c2119bf6fc32fe17476ecb31f');

// Reusable accessible splitter with pointer capture and keyboard support.
assert.match(splitter, /role="separator"/);
assert.match(splitter, /aria-orientation=\{orientation\}/);
assert.match(splitter, /aria-valuemin=\{min\}/);
assert.match(splitter, /aria-valuemax=\{max\}/);
assert.match(splitter, /aria-valuenow=\{value\}/);
assert.match(splitter, /tabIndex=\{0\}/);
assert.match(splitter, /setPointerCapture/);
assert.match(splitter, /releasePointerCapture/);
assert.match(splitter, /ArrowLeft/);
assert.match(splitter, /ArrowRight/);
assert.match(splitter, /Home/);
assert.match(splitter, /End/);
assert.match(splitter, /onCommit\(committed, 'pointer'\)/);
assert.match(splitter, /onCommit\(clamped, 'keyboard'\)/);

// Drag updates render state; persistence happens only on commit.
assert.match(app, /onChange=\{\(value\) => setSidebarWidth\(clampWorkbenchSidebarWidth\(value\)\)\}/);
assert.match(app, /onCommit=\{commitSidebarWidth\}/);
assert.match(app, /persistWorkbenchLayoutPreferences/);
assert.match(app, /workbench\.layout\.sidebar-width\.persist/);
assert.doesNotMatch(splitter, /localStorage|persistWorkbenchLayoutPreferences/);

// Fixed chrome remains, with only the existing sidebar becoming resizable.
assert.match(styles, /\.topbar,[\s\S]*?\.developer-runtime-bar,[\s\S]*?\.change-panel \{ flex: 0 0 auto; \}/);
assert.match(styles, /grid-template-columns: 50px var\(--workbench-sidebar-width, 292px\) 6px minmax\(0, 1fr\)/);
assert.match(styles, /\.workbench-body\.sidebar-collapsed[\s\S]*?50px minmax\(0, 1fr\)/);
assert.match(styles, /cursor: col-resize/);
assert.match(styles, /touch-action: none/);
assert.match(app, /<WorkbenchRail/);
assert.match(app, /<WorkbenchSidebar/);
assert.match(app, /<WorkbenchSplitter/);
assert.match(app, /<InspectorPane/);

// Reset and diagnostics are explicit and privacy-safe.
assert.match(settings, /Workbench layout/);
assert.match(settings, />Reset<\/button>/);
assert.doesNotMatch(settings, /Reset to 292 px/);
assert.match(app, /resetWorkbenchLayoutPreferences/);
assert.match(app, /workbench\.layout\.reset/);
assert.match(runtime, /workbenchLayout: workbenchLayoutSupport/);
assert.match(runtime, /WorkbenchLayoutSupportSnapshot/);
assert.doesNotMatch(runtime, /projectContentsIncluded: true/);

// Preserve previously frozen feature/security boundaries.
assert.equal(hashFile('src/components/WorkbenchSidebar.tsx'), '60f03ce06748098e26dd1b8d7613c74221b0a9cb66200fdf31479285d1158a4b');
assert.equal(hashFile('src/components/WorkbenchRail.tsx'), 'fae19cf5925657639ba85a53fbcc50f5a2590a9a8480b81834e65355be0146db');
assert.match(read('src/features/project-graph/ProjectGraphView.tsx'), /project-graph-camera/);
const nativeMain = read('src-tauri/src/main.rs');
assert.match(nativeMain, /metadata_is_reparse_point/);
assert.match(nativeMain, /pending_change_count/);
assert.equal(hashFile('src-tauri/capabilities/default.json'), '5042c8d799a75be8248b9877ea2c59aabca2c6fccaed0082c2cdd438c6e345a4');
const tauriRuntime = read('tauri-ui/tauri-runtime.js');
assert.match(tauriRuntime, /app-close-requested/);
assert.match(tauriRuntime, /project-files-changed/);

// Packaged frontend mirrors source layout behavior.
for (const marker of ['Resize Workbench sidebar', 'Workbench layout', 'workbench.layout.sidebar-width.persist']) {
  assert.match(embeddedApp, new RegExp(marker.replaceAll('.', '\\.')));
}
assert.match(embeddedStyles, /--workbench-sidebar-width/);
assert.match(embeddedStyles, /workbench-splitter-vertical/);


console.log('v0.11.14 Workbench Layout Foundation source checks passed');
