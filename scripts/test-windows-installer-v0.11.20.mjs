import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const installer = JSON.parse(read('src-tauri/tauri.installer.conf.json'));
const releaseContract = JSON.parse(read('release-spec/release-contract.json'));
const installerAssetName = releaseContract.updater.publication.installerAssetPattern.replaceAll('{version}', releaseContract.version.semver).replaceAll('{displayVersion}', releaseContract.version.display);
const build = read('Build-Windows-Installer.cmd');
const tooling = read('tools/windows/Install-Windows-Installer-Tooling.cmd');
const runtime = read('src/support/runtimeDiagnostics.ts');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.bundle.active, false, 'base config remains bundling-neutral; installer overlay owns distribution');
assert.match(read('src-tauri/Cargo.toml'), new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.') }"`, 'm'));
assert.match(read('BUILD_ID.txt'), /v0\.11\.[0-9]+-r[0-9]+-[a-z0-9-]+/);
assert.match(read('src/App.tsx'), /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.match(runtime, /profile: RELEASE_VALIDATION_PROFILE/);
assert.match(runtime, /featureFreeze: RELEASE_FEATURE_FREEZE/);
assert.match(runtime, /REPORT_SCHEMA_VERSION = 8/);

assert.equal(installer.bundle.active, true);
assert.deepEqual(installer.bundle.targets, ['nsis']);
assert.equal(installer.bundle.windows.nsis.installMode, 'currentUser');
assert.deepEqual(installer.bundle.windows.nsis.languages, ['English', 'German']);
assert.equal(installer.bundle.windows.nsis.displayLanguageSelector, false);
assert.equal(installer.bundle.windows.nsis.compression, 'lzma');
assert.equal(installer.bundle.windows.webviewInstallMode.type, 'downloadBootstrapper');
assert.equal(installer.bundle.windows.webviewInstallMode.silent, true);
assert.equal(installer.bundle.windows.nsis.installerIcon, 'icons/icon.ico');
assert.equal(installer.bundle.windows.nsis.uninstallerIcon, 'icons/icon.ico');

assert.match(tooling, /TAURI_CLI_VERSION=2\.11\.0/);
assert.match(tooling, /cargo install tauri-cli --version %TAURI_CLI_VERSION% --locked/);
assert.match(build, /Installer build BLOCKED: src-tauri\\Cargo\.lock is missing/);
assert.match(build, /cargo tauri build --bundles nsis --config src-tauri\\tauri\.installer\.conf\.json -- --locked/);
assert.match(build, new RegExp(installerAssetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(build, /certutil -hashfile/);

console.log('v0.11.20 Windows Installer source contract passed');
