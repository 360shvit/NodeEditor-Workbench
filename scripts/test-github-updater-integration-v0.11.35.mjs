import fs from 'node:fs';
import assert from 'node:assert/strict';
import { isValidSemver } from './release-version.mjs';

const read = (path) => fs.readFileSync(path, 'utf8');
const contract = JSON.parse(read('release-spec/release-contract.json'));
assert.ok(isValidSemver(contract.version.semver), 'release version must be valid SemVer');
assert.match(contract.version.revision, /^r[1-9]\d*$/);
assert.equal(contract.version.display, `${contract.version.semver}-${contract.version.revision}`);
assert.equal(contract.updater.enabled, true);
assert.equal(contract.updater.channels.stable.manifestReleaseTag, 'updater-stable');
assert.equal(contract.updater.channels.preview.manifestReleaseTag, 'updater-preview');
assert.equal(contract.updater.publication.updaterVersionSource, 'version.semver');
assert.equal(contract.updater.publication.allowSameSemverRepublish, false);
assert.equal(typeof contract.updater.publication.publishable, 'boolean');
if (contract.updater.publication.publishable) assert.equal(contract.version.revision, 'r1', 'publishable releases must use r1');

const cargo = read('src-tauri/Cargo.toml');
assert.match(cargo, /tauri-plugin-updater = "=2\.11\.0"/);
const installer = JSON.parse(read('src-tauri/tauri.installer.conf.json'));
const pubkey = read('src-tauri/updater.pubkey').trim();
assert.equal(installer.bundle.createUpdaterArtifacts, true);
assert.equal(
  installer.plugins.updater.pubkey,
  pubkey,
  'Tauri bundler updater pubkey must match src-tauri/updater.pubkey',
);
assert.equal(installer.plugins.updater.windows.installMode, 'passive');
assert.equal(
  installer.bundle.resources?.['../LICENSE'],
  'LICENSE',
  'Windows installer must bundle the project MIT LICENSE as an installed application resource',
);
assert.equal(
  installer.bundle.resources?.['../THIRD_PARTY_NOTICES.txt'],
  'THIRD_PARTY_NOTICES.txt',
  'Windows installer must bundle THIRD_PARTY_NOTICES.txt as an installed application resource',
);

const rust = read('src-tauri/src/main.rs');
for (const token of ['check_for_update', 'install_update', 'pending_change_count', 'HGW_GITHUB_REPOSITORY', 'updater.pubkey', 'restart_after_install(true)', '.download(', '.install(&bytes)', 'phase: "blocked"', 'phase: "installing"']) {
  assert.ok(rust.includes(token), `native updater missing ${token}`);
}
assert.ok(!rust.includes('.download_and_install('), 'install path must split verified download from final native install gate');
assert.match(rust, /validate_update_target\(&payload.channel, &version, update.download_url.as_str\(\), UPDATER_REPOSITORY\)\?/, 'native check must validate channel and immutable installer authority');
assert.match(rust, /channel == "stable" && version.split\('\+'\).next\(\).unwrap_or_default\(\).contains\('-'\)/, 'Stable must reject prereleases independently of build metadata; native Track 14 fixtures execute this policy');
assert.ok(rust.includes('UPDATER_DISTRIBUTION_KIND == "installed"'), 'native updater must fail closed outside the installed NSIS distribution class');
assert.ok(read('Build-Windows.cmd').includes('HGW_DISTRIBUTION_KIND=development'), 'raw Windows builds must compile as development/non-installed');
assert.ok(read('Build-Windows-Installer.cmd').includes('HGW_DISTRIBUTION_KIND=installed'), 'local NSIS builds must compile as installed');
assert.ok(read('Build-Windows-Installer.cmd').includes('HGW_GITHUB_REPOSITORY is not set'), 'local updater-enabled NSIS builds must require a real GitHub repository slug');
const secondPendingIndex = rust.indexOf('let pending_changes = desktop.pending_change_count.load(Ordering::Relaxed);', rust.indexOf('let bytes = update'));
const installIndex = rust.indexOf('.install(&bytes)');
assert.ok(secondPendingIndex > 0 && secondPendingIndex < installIndex, 'native pending-change recheck must happen after download and immediately before install');

const capability = read('src-tauri/capabilities/default.json');
assert.ok(!capability.includes('updater:default'), 'webview must not receive updater plugin authority');
const runtime = read('tauri-ui/tauri-runtime.js');
assert.ok(runtime.includes('/api/app/update/check'));
assert.ok(runtime.includes('/api/app/update/install'));
assert.ok(runtime.includes("tauri.event.listen('app-update-progress'"));
const bridge = read('src/io/desktopBridge.ts');
assert.ok(bridge.includes('desktopCheckForUpdate'));
assert.ok(bridge.includes('desktopInstallUpdate'));
const settings = read('src/components/WorkbenchSettings.tsx');
for (const token of ['Check and install', 'Install & restart', 'pendingChangeCount', 'hgw:app-update-progress', 'Downloaded and signature-verified', 'disabled={updateBusy}', 'closeSettings']) {
  assert.ok(settings.includes(token), `updater UX missing ${token}`);
}

assert.equal(read('.nvmrc').trim(), '24.21.0');
assert.match(read('rust-toolchain.toml'), /channel = "1\.98\.1"/);
const workflow = read('.github/workflows/release-windows.yml');
assert.equal((workflow.match(/runs-on: windows-2025/g) ?? []).length, 2, 'validate and publish jobs must use the explicit Windows 2025 runner image');
for (const token of [
  'environment: release',
  'TAURI_SIGNING_PRIVATE_KEY',
  'release/public',
  'release-surface.mjs',
  'updater-stable',
  'updater-preview',
  "if (-not $isPrerelease)",
  'publication.publishable',
  'same-SemVer republish is forbidden',
  'fetch-depth: 0',
  'persist-credentials: false',
  'git merge-base --is-ancestor',
  'node node_modules/typescript/bin/tsc -p tsconfig.app.json',
  'npm run test:rc-regression-matrix',
  'npm run audit:unused-carry',
]) {
  assert.ok(workflow.includes(token), `release workflow missing ${token}`);
}
const releaseUses = [...workflow.matchAll(/^\s*-\s+uses:\s+([^\s#]+)/gm)].map((match) => match[1]);
assert.ok(releaseUses.length >= 6, 'release workflow must pin actions in both jobs');
for (const use of releaseUses) {
  const split = use.lastIndexOf('@');
  assert.ok(split > 0, `release workflow action reference must contain @: ${use}`);
  assert.match(use.slice(split + 1), /^[0-9a-f]{40}$/i, `release workflow action must use a full 40-character commit SHA: ${use}`);
}
for (const action of ['actions/checkout', 'actions/setup-node', 'dtolnay/rust-toolchain']) {
  assert.ok(releaseUses.some((use) => use.startsWith(`${action}@`)), `release workflow must use ${action}`);
}
assert.ok(workflow.includes('if ($LASTEXITCODE -eq 0)'), 'GitHub CLI release existence checks must use the external-process exit code');
assert.ok(workflow.includes('HGW_DISTRIBUTION_KIND: installed'), 'GitHub NSIS build must compile the installed updater distribution class');
assert.ok(!workflow.includes('tauri-apps/tauri-action@'), 'GitHub publication must not bypass the allowlisted release/public surface');
assert.match(workflow, /permissions:\n\s+contents: read/);
assert.match(workflow, /publish:[\s\S]*permissions:\n\s+contents: write/);

const approvalWorkflow = read('.github/workflows/dependency-approval.yml');
assert.match(approvalWorkflow, /pull_request_target:/, 'dependency approval must run from trusted base workflow');
assert.match(approvalWorkflow, /pull_request_review:/, 'dependency approval must re-evaluate when reviews change');
assert.match(approvalWorkflow, /pull-requests: read/, 'dependency approval needs read-only review metadata');
assert.match(approvalWorkflow, /dependabot\[bot\]/, 'dependency approval must identify Dependabot PRs');
assert.match(approvalWorkflow, /github\.repository_owner/, 'dependency approval must require repository-owner approval');
assert.match(approvalWorkflow, /PR_HEAD_SHA/, 'dependency approval must bind approval to the current PR head');
assert.match(approvalWorkflow, /\.commit_id ==/, 'dependency approval must compare the review commit to current head');
assert.doesNotMatch(approvalWorkflow, /^\s*-\s+uses:/m, 'approval metadata workflow must not checkout or execute PR actions');

const dependabot = read('.github/dependabot.yml');
for (const ecosystem of ['npm', 'cargo', 'github-actions']) assert.ok(dependabot.includes(`package-ecosystem: "${ecosystem}"`));
assert.match(dependabot, /version-update:semver-minor/);
assert.match(dependabot, /version-update:semver-patch/);
assert.doesNotMatch(dependabot, /version-update:semver-major/, 'major migrations must remain explicit/manual');

const installerBuild = read('Build-Windows-Installer.cmd');
assert.ok(installerBuild.includes('SIGNATURE_SOURCE'));
assert.ok(installerBuild.includes('%SETUP_OUT%.sig'));

const rootReadme = read('README.md');
assert.ok(rootReadme.includes(`v${contract.version.display}`));
assert.match(rootReadme, /native Tauri v2 updater integration/i);
assert.ok(!rootReadme.includes('Updater is still disabled'));
const releaseReadme = read('release-spec/README.md');
assert.ok(releaseReadme.includes(`v${contract.version.display}`));
assert.match(releaseReadme, /rechecks? pending/i);
assert.ok(fs.existsSync('SECURITY.md'));
assert.ok(!fs.existsSync('Package-Windows-Portable.cmd'));
assert.ok(!fs.existsSync('PORTABLE_README.txt'));
assert.ok(!fs.existsSync('Run-Windows.cmd'));
assert.ok(!fs.existsSync('vite.config.ts'));
assert.ok(!fs.existsSync('index.html'));
assert.ok(!('vite' in JSON.parse(read('package.json')).dependencies));

if (contract.updater.publication.publishable) {
  assert.ok(fs.existsSync('package-lock.json'), 'publishable tree must contain package-lock.json');
  assert.ok(fs.existsSync('src-tauri/Cargo.lock'), 'publishable tree must contain src-tauri/Cargo.lock');
  assert.ok(!pubkey.startsWith('UNCONFIGURED'), 'publishable tree must contain real updater public key');
} else {
  assert.ok(pubkey.length > 0, 'integration candidate must carry explicit updater key state');
}
const noticeGenerator = read('scripts/generate-third-party-notices.mjs');
assert.match(noticeGenerator, /audit-third-party-distribution\.mjs/, 'third-party notices must derive from the Windows distribution classification');
assert.ok(installerBuild.includes('generate-third-party-notices.mjs --target x86_64-pc-windows-msvc --output THIRD_PARTY_NOTICES.txt'), 'local installer build must generate third-party notices before bundling');
assert.ok(workflow.includes('generate-third-party-notices.mjs --target x86_64-pc-windows-msvc --output THIRD_PARTY_NOTICES.txt'), 'release workflow must generate third-party notices before bundling');
assert.match(read('release-spec/README.md'), /private signing key must never be committed/i);

console.log(`${contract.version.display} GitHub/updater integration contract: PASS`);
