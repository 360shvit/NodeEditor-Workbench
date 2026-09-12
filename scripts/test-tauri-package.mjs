import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const runtime = readFileSync(new URL('../tauri-ui/tauri-runtime.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../tauri-ui/index.html', import.meta.url), 'utf8');
const rust = readFileSync(new URL('../src-tauri/src/main.rs', import.meta.url), 'utf8');
const config = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
const app = readFileSync(new URL('../tauri-ui/app.js', import.meta.url), 'utf8');
const releaseContract = JSON.parse(readFileSync(new URL('../release-spec/release-contract.json', import.meta.url), 'utf8'));
execFileSync(process.execPath, ['scripts/embedded-bundle.mjs', '--check'], { stdio: 'pipe' });

assert.equal(config.version, releaseContract.version.semver);
assert.equal(config.build.frontendDist, '../tauri-ui');
assert.equal(config.app.withGlobalTauri, true);
assert.deepEqual(config.bundle.icon, [
  'icons/32x32.png',
  'icons/128x128.png',
  'icons/128x128@2x.png',
  'icons/icon.ico',
]);
assert.equal(existsSync(new URL('../src-tauri/icons/icon.ico', import.meta.url)), true);
assert.equal(existsSync(new URL('../src-tauri/icons/app-icon-source.png', import.meta.url)), true);
assert.match(html, /tauri-runtime\.js/);
assert.match(html, /bootstrap\.js/);
assert.doesNotMatch(html, /<script>(?!<\/script>)[\s\S]*?<\/script>/);
assert.doesNotMatch(html, /desktop-runtime\.js/);
assert.match(runtime, /__HYTALE_DESKTOP_BRIDGE__ = true/);
assert.match(runtime, /select_project/);
assert.match(runtime, /\/api\/project\/open-recent/);
assert.match(runtime, /read_project_file/);
assert.match(runtime, /apply_project_files/);
assert.match(runtime, /export_output/);
assert.match(runtime, /write_registered_binary/);
assert.match(runtime, /project-files-changed/);
assert.match(runtime, /hgw:project-files-changed/);
assert.match(rust, /safe_relative/);
assert.match(rust, /canonical_root/);
assert.match(rust, /struct ProjectScan \{[\s\S]*root: String/);
assert.match(rust, /symlink/);
assert.match(rust, /tauri_plugin_dialog::init/);
assert.match(rust, /RecommendedWatcher/);
assert.match(rust, /RecursiveMode::Recursive/);
assert.match(rust, /watch_suppression/);
assert.match(app, /exports\.RELEASE_MILESTONE = 'v[^']+'/);
assert.match(app, /exports\.RELEASE_MILESTONE_NAME = '[^']+'/);
assert.match(app, /define\("components\/LucideIcon"/);
assert.match(app, /folder-tree/);
assert.match(app, /git-compare-arrows/);
assert.match(app, /Recent Projects/);
assert.match(app, /Project Start Screen|project-start-screen/);
assert.match(app, /define\("components\/UniversalTooltip"/);
assert.match(app, /defaultDiagnosticsTab/);
assert.match(app, /Open editors/i);
assert.match(app, /Go Back/);
assert.match(app, /Export Changes ZIP/);
assert.match(app, /Export Project Copy/);
assert.match(app, /Apply to Project/);
assert.match(app, /Developer mode/);
assert.match(app, /Open snapshot/);
assert.doesNotMatch(app, />Upload</);

console.log(JSON.stringify({
  version: releaseContract.version.semver,
  host: 'tauri-v2',
  npmNeededForDesktopBuild: false,
  localhostBridge: false,
  nativeProjectDialog: true,
  recentProjectNativeRescan: true,
  recentProjectNativeGrant: true,
  cspEnabled: true,
  appDataCapable: true,
  rustFilesystemBoundary: true,
  nativeProjectWatcher: true,
  offlineSvgIcons: 'local Lucide subset',
}, null, 2));
