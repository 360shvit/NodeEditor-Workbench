import fs from 'node:fs';
import { checkEmbeddedBundle, writeEmbeddedBundle } from './embedded-bundle.mjs';
import { isValidSemver } from './release-version.mjs';

const checkOnly = process.argv.includes('--check');
const read = (path) => fs.readFileSync(path, 'utf8');
const writeIfChanged = (path, next) => {
  if (!fs.existsSync(path)) {
    if (checkOnly) throw new Error(`${path} is missing; run release:sync`);
    fs.writeFileSync(path, next);
    return true;
  }
  const current = read(path);
  if (current === next) return false;
  if (checkOnly) throw new Error(`${path} is out of sync with release-spec/release-contract.json`);
  fs.writeFileSync(path, next);
  return true;
};
const replaceChecked = (path, pattern, replacement, description) => {
  const current = read(path);
  if (!pattern.test(current)) throw new Error(`${path}: cannot locate ${description}`);
  const next = current.replace(pattern, replacement);
  writeIfChanged(path, next);
};

const contract = JSON.parse(read('release-spec/release-contract.json'));
const { product, version, validation, updater } = contract;
if (contract.schemaVersion !== 1) throw new Error('unsupported release contract schemaVersion');
if (!isValidSemver(version.semver)) throw new Error('version.semver must be SemVer');
if (!/^r[1-9]\d*$/.test(version.revision)) throw new Error('version.revision must use rN form');
if (version.display !== `${version.semver}-${version.revision}`) throw new Error('version.display must equal semver-revision');
if (version.milestone !== `v${version.semver}`) throw new Error('version.milestone must equal v + semver');
if (updater.publication?.updaterVersionSource !== 'version.semver') throw new Error('updater publication must use version.semver as updater ordering identity');
if (updater.publication?.allowSameSemverRepublish !== false) throw new Error('same-SemVer updater republishes must be forbidden');
if (updater.publication?.publishable === true && version.revision !== 'r1') {
  throw new Error('publishable builds must use revision r1; every public update after publication must bump SemVer');
}

const renderAssetPattern = (pattern) => pattern
  .replaceAll('{version}', version.semver)
  .replaceAll('{displayVersion}', version.display);
const installerAssetName = renderAssetPattern(updater.publication.installerAssetPattern);

const manifestExample = JSON.parse(read('release-spec/update-manifest.example.json'));
manifestExample.version = version.semver;
manifestExample.notes = `Example only. ${version.display} integration candidate; replace URL/signature during real GitHub publication.`;
if (manifestExample.platforms?.['windows-x86_64']) {
  manifestExample.platforms['windows-x86_64'].url = `https://example.invalid/${installerAssetName}`;
}
writeIfChanged('release-spec/update-manifest.example.json', `${JSON.stringify(manifestExample, null, 2)}\n`);

const pkg = JSON.parse(read('package.json'));
pkg.version = version.semver;
writeIfChanged('package.json', `${JSON.stringify(pkg, null, 2)}\n`);

replaceChecked('src-tauri/Cargo.toml', /^version = ".*"/m, `version = "${version.semver}"`, 'Cargo package version');
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
tauri.productName = product.name;
tauri.version = version.semver;
tauri.identifier = product.identifier;
writeIfChanged('src-tauri/tauri.conf.json', `${JSON.stringify(tauri, null, 2)}\n`);
writeIfChanged('BUILD_ID.txt', `${version.buildId}\n`);

const bool = (value) => value ? 'true' : 'false';
const generated = `// GENERATED from release-spec/release-contract.json by scripts/sync-release-contract.mjs.\n// Do not hand-edit release identity values here.\nexport const RELEASE_VERSION = '${version.semver}';\nexport const RELEASE_REVISION = '${version.revision}';\nexport const RELEASE_DISPLAY_VERSION = '${version.display}';\nexport const RELEASE_MILESTONE = '${version.milestone}';\nexport const RELEASE_MILESTONE_NAME = '${version.milestoneName}';\nexport const RELEASE_BUILD_ID = '${version.buildId}';\nexport const RELEASE_VALIDATION_PROFILE = '${validation.profile}';\nexport const RELEASE_FEATURE_FREEZE = ${bool(validation.featureFreeze)};\nexport const RELEASE_CANONICAL_RUN_REQUIRED = ${bool(validation.canonicalRunRequired)};\nexport const UPDATER_PREPARED = ${bool(updater.prepared)};\nexport const UPDATER_ENABLED = ${bool(updater.enabled)};\nexport const UPDATER_VERSION = '${version.semver}';\nexport const UPDATER_DEFAULT_CHANNEL = '${updater.defaultChannel}';\nexport const RELEASE_REVISION_INTERNAL_ONLY = true;\n`;
writeIfChanged('src/release/releaseIdentity.ts', generated);
writeIfChanged('src/support/releaseIdentity.generated.ts', generated);

// Release/build helper labels and local evidence names mirror the canonical contract.
// Patterns intentionally accept any previous SemVer/revision so repeated release:sync
// remains valid across patch/minor/major, prerelease and internal revision changes.
const displayPattern = '[0-9]+\\.[0-9]+\\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?-r[0-9]+';
const semverPattern = '[0-9]+\\.[0-9]+\\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?';
replaceChecked('Build-Windows.cmd', new RegExp(`^echo Hytale Generator Workbench v${displayPattern} - Native Windows Build`, 'm'), `echo Hytale Generator Workbench v${version.display} - Native Windows Build`, 'native build label');
replaceChecked('Build-Windows.cmd', /docs\\(?:TEST_V[^\r\n ]+\.md|VALIDATION\.md)/g, 'docs\\VALIDATION.md', 'native build validation-doc pointer');
replaceChecked('Build-Windows-Installer.cmd', new RegExp(`^echo Hytale Generator Workbench v${displayPattern} - Windows NSIS Setup`, 'm'), `echo Hytale Generator Workbench v${version.display} - Windows NSIS Setup`, 'installer build label');
replaceChecked('Build-Windows-Installer.cmd', /^set "SETUP_OUT=release\\[^"\r\n]+"/m, `set "SETUP_OUT=release\\${installerAssetName}"`, 'installer release asset name');
replaceChecked('Build-Windows-Installer.cmd', /^> "%SETUP_OUT%\.sha256" echo !SETUPHASH!  .*$/m, `> "%SETUP_OUT%.sha256" echo !SETUPHASH!  ${installerAssetName}`, 'installer sidecar asset name');
replaceChecked('tools/windows/Freeze-Windows-Dependencies.cmd', new RegExp(`^echo Hytale Generator Workbench v${displayPattern} - Dependency Lock Capture`, 'm'), `echo Hytale Generator Workbench v${version.display} - Dependency Lock Capture`, 'lock-capture label');
replaceChecked('tools/windows/Freeze-Windows-Dependencies.cmd', new RegExp(`cargo-tree-v${semverPattern}\\.txt`, 'g'), `cargo-tree-v${version.semver}.txt`, 'cargo-tree evidence name');
replaceChecked('tools/windows/Freeze-Windows-Dependencies.cmd', new RegExp(`cargo-metadata-v${semverPattern}\\.json`, 'g'), `cargo-metadata-v${version.semver}.json`, 'cargo-metadata evidence name');
replaceChecked('tools/windows/Freeze-Windows-Dependencies.cmd', new RegExp(`v${displayPattern} keeps that exact verified lock`, 'g'), `v${version.display} keeps that exact verified lock`, 'lock-capture release label');
replaceChecked('tools/windows/Generate-Updater-Signing-Key.cmd', new RegExp(`^echo Hytale Generator Workbench v${displayPattern} - Updater Signing Key Bootstrap`, 'm'), `echo Hytale Generator Workbench v${version.display} - Updater Signing Key Bootstrap`, 'updater signing-key label');
replaceChecked('Test-Windows-Safety.cmd', new RegExp(`^echo Hytale Generator Workbench v${displayPattern} - Windows Native Safety Matrix`, 'm'), `echo Hytale Generator Workbench v${version.display} - Windows Native Safety Matrix`, 'native safety label');
const workflowArtifactPattern = new RegExp(`Hytale-Generator-Workbench-v${displayPattern}-Windows-Setup`, 'g');
if (workflowArtifactPattern.test(read('.github/workflows/build-tauri-windows.yml'))) {
  replaceChecked('.github/workflows/build-tauri-windows.yml', workflowArtifactPattern, `Hytale-Generator-Workbench-v${version.display}-Windows-Setup`, 'GitHub workflow artifact label');
}

if (checkOnly) {
  checkEmbeddedBundle();
  console.log(`release contract sync: PASS (${version.display}; updater=${version.semver})`);
} else {
  writeEmbeddedBundle();
  console.log(`release contract synchronized: ${version.display}; updater=${version.semver}`);
}
