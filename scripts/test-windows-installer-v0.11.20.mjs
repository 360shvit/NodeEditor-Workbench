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
const noticeGenerator = read('scripts/generate-third-party-notices.mjs');

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
assert.equal(installer.bundle.resources['../LICENSE'], 'LICENSE');
assert.equal(installer.bundle.resources['../THIRD_PARTY_NOTICES.txt'], 'THIRD_PARTY_NOTICES.txt');
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
assert.match(build, /where node/);
assert.match(build, /generate-third-party-notices\.mjs --target x86_64-pc-windows-msvc --output THIRD_PARTY_NOTICES\.txt/);
assert.match(build, /Installer build BLOCKED: third-party notice generation failed/);
assert.match(build, /cargo tauri build --bundles nsis --config src-tauri\\tauri\.installer\.conf\.json -- --locked/);
assert.match(build, new RegExp(installerAssetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(build, /certutil -hashfile/);

assert.match(noticeGenerator, /audit-third-party-distribution\.mjs/);
assert.match(noticeGenerator, /classification === 'runtime'/);
assert.match(noticeGenerator, /Runtime package lacks legal material and no curated exception exists/);
assert.match(noticeGenerator, /legalTextSha256/);
assert.match(noticeGenerator, /vendored:Preact@vendored/);
assert.match(noticeGenerator, /vendored:Lucide icon geometry@1\.29\.0/);

console.log('v0.11.20 Windows Installer source contract passed');
