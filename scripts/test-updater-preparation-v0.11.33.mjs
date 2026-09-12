import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const contract = json('release-spec/release-contract.json');
const manifestSchema = json('release-spec/update-manifest.schema.json');
const manifestExample = json('release-spec/update-manifest.example.json');
const pkg = json('package.json');
const tauri = json('src-tauri/tauri.conf.json');
const installer = json('src-tauri/tauri.installer.conf.json');
const cargo = read('src-tauri/Cargo.toml');
const identity = read('src/release/releaseIdentity.ts');
const runtime = read('src/support/runtimeDiagnostics.ts');
const supportIdentity = read('src/support/releaseIdentity.generated.ts');
const settings = read('src/components/WorkbenchSettings.tsx');
const app = read('src/App.tsx');
const embedded = read('tauri-ui/app.js');
const releaseReadme = read('release-spec/README.md');

assert.equal(contract.schemaVersion, 1);
assert.equal(contract.product.name, 'Hytale Generator Workbench');
assert.equal(contract.product.identifier, 'com.hytalegenerator.workbench');
assert.equal(contract.updater.prepared, true);
assert.equal(typeof contract.updater.enabled, 'boolean');
assert.equal(pkg.version, contract.version.semver);
assert.equal(tauri.version, contract.version.semver);
assert.equal(tauri.productName, contract.product.name);
assert.equal(tauri.identifier, contract.product.identifier);
assert.match(cargo, new RegExp(`^version = "${escape(contract.version.semver)}"$`, 'm'));
assert.equal(read('BUILD_ID.txt').trim(), contract.version.buildId);

assert.match(identity, /GENERATED from release-spec\/release-contract\.json/);
for (const [name, value] of [
  ['RELEASE_VERSION', contract.version.semver],
  ['RELEASE_DISPLAY_VERSION', contract.version.display],
  ['RELEASE_MILESTONE', contract.version.milestone],
  ['RELEASE_MILESTONE_NAME', contract.version.milestoneName],
  ['RELEASE_VALIDATION_PROFILE', contract.validation.profile],
  ['UPDATER_VERSION', contract.version.semver],
]) {
  assert.match(identity, new RegExp(`${name} = '${escape(value)}'`));
}
assert.match(identity, /UPDATER_PREPARED = true/);
assert.match(identity, new RegExp(`UPDATER_ENABLED = ${contract.updater.enabled}`));
assert.match(identity, /RELEASE_REVISION_INTERNAL_ONLY = true/);
assert.equal(supportIdentity, identity);
assert.match(runtime, /from '\.\/releaseIdentity\.generated\.js'/);
execFileSync(process.execPath, ['scripts/sync-release-contract.mjs', '--check'], { stdio: 'pipe' });

assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(app, /<small>\{RELEASE_MILESTONE\} · \{RELEASE_MILESTONE_NAME\}<\/small>/);
assert.match(settings, /RELEASE_DISPLAY_VERSION/);
assert.match(settings, /UPDATER_ENABLED/);
assert.match(settings, /UPDATER_PREPARED/);
assert.doesNotMatch(runtime, /const APP_VERSION =/);

assert.equal(contract.updater.defaultChannel, 'stable');
assert.equal(contract.updater.channels.stable.manifestAsset, 'latest.json');
assert.equal(contract.updater.channels.stable.acceptPrerelease, false);
assert.equal(contract.updater.channels.preview.manifestAsset, 'latest-preview.json');
assert.equal(contract.updater.channels.preview.acceptPrerelease, true);
assert.equal(contract.updater.windows.target, 'windows-x86_64');
assert.equal(contract.updater.windows.installer, 'nsis');
assert.equal(contract.updater.windows.autoUpdateInstalledBuild, true);
assert.equal(contract.updater.integrity.httpsRequired, true);
assert.equal(contract.updater.integrity.tauriSignatureRequired, true);
assert.equal(contract.updater.integrity.privateKeyInRepository, false);
assert.equal(contract.updater.publication.updaterVersionSource, 'version.semver');
assert.equal(contract.updater.publication.allowSameSemverRepublish, false);
assert.match(contract.updater.lifecycle.pendingChanges, /do not install\/restart/i);
assert.match(contract.updater.lifecycle.signatureFailure, /reject update/i);
assert.match(contract.updater.lifecycle.nonInstalledBuild, /automatic updater disabled/i);

assert.deepEqual(manifestSchema.required, ['version', 'platforms']);
assert.deepEqual(manifestSchema.properties.platforms.required, ['windows-x86_64']);
assert.deepEqual(manifestSchema.properties.platforms.properties['windows-x86_64'].required, ['url', 'signature']);
assert.equal(manifestExample.version, contract.version.semver);
assert.match(manifestExample.platforms['windows-x86_64'].url, /^https:\/\//);
assert.ok(manifestExample.platforms['windows-x86_64'].signature.length > 0);

// Updater preparation must remain least-privilege when later milestones activate it.
if (!contract.updater.enabled) {
  assert.doesNotMatch(cargo, /tauri-plugin-updater/);
  assert.equal(tauri.plugins?.updater, undefined);
  assert.equal(tauri.bundle?.createUpdaterArtifacts, undefined);
  assert.equal(installer.plugins?.updater, undefined);
  assert.equal(installer.bundle?.createUpdaterArtifacts, undefined);
} else {
  assert.match(cargo, /tauri-plugin-updater/);
  assert.equal(installer.bundle?.createUpdaterArtifacts, true);
  assert.equal(installer.plugins?.updater?.windows?.installMode, 'passive');
  assert.match(read('tauri-ui/tauri-runtime.js'), /api\/app\/update\/check/);
  assert.match(read('tauri-ui/tauri-runtime.js'), /api\/app\/update\/install/);
  assert.doesNotMatch(read('src-tauri/capabilities/default.json'), /updater:default/);
}

// The shipped bundle now consumes the generated identity modules instead of hand-maintained literals.
assert.match(embedded, /define\("release\/releaseIdentity"/);
assert.match(embedded, /define\("support\/releaseIdentity\.generated"/);
assert.match(embedded, new RegExp(`exports\\.RELEASE_MILESTONE = '${escape(contract.version.milestone)}'`));
assert.match(embedded, new RegExp(`exports\\.RELEASE_VALIDATION_PROFILE = '${escape(contract.validation.profile)}'`));
assert.match(embedded, /Automatic updates/);

console.log('v0.11.33 updater-preparation guarantees remain intact under current release identity: PASS');
