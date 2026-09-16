import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const read = (file) => fs.readFileSync(file, 'utf8');
const contract = JSON.parse(read('release-spec/release-contract.json'));
const render = (pattern, current = contract) => pattern
  .replaceAll('{version}', current.version.semver)
  .replaceAll('{displayVersion}', current.version.display);
const installerName = render(contract.updater.publication.installerAssetPattern);
const signatureName = render(contract.updater.publication.installerSignaturePattern);

assert.ok(!fs.existsSync('docs/history'), 'internal history must not ship in the public repository');
assert.ok(!fs.existsSync('Package-Windows-Portable.cmd'));
assert.ok(!fs.existsSync('PORTABLE_README.txt'));
assert.ok(!fs.existsSync('Run-Windows.cmd'));
assert.ok(fs.existsSync('tools/windows/Freeze-Windows-Dependencies.cmd'));
assert.ok(fs.existsSync('tools/windows/Install-Windows-Installer-Tooling.cmd'));
assert.ok(!fs.existsSync('Freeze-Windows-Dependencies.cmd'));
assert.ok(!fs.existsSync('Install-Windows-Installer-Tooling.cmd'));
assert.match(read('tools/windows/Freeze-Windows-Dependencies.cmd'), /cd \/d "%~dp0\\\.\.\\\.\."/);
assert.match(read('tools/windows/Install-Windows-Installer-Tooling.cmd'), /cd \/d "%~dp0\\\.\.\\\.\."/);

const buildPlan = read('docs/BUILD_PLAN.md');
assert.match(buildPlan, /release[- ]surface/i);
assert.match(buildPlan, /tools\/windows\/Freeze-Windows-Dependencies\.cmd/);
const releaseScript = read('scripts/release-surface.mjs');
for (const token of ['sourceIncluded: false', 'testsIncluded: false', 'devToolingIncluded: false', 'unexpected release-surface file', 'latest-preview.json', 'latest.json', 'installerSignaturePattern']) {
  assert.ok(releaseScript.includes(token), `release surface missing ${token}`);
}

function makeFixture(currentContract, prefix) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const input = path.join(temp, 'input');
  const output = path.join(temp, 'public');
  fs.mkdirSync(input, { recursive: true });
  const installer = render(currentContract.updater.publication.installerAssetPattern, currentContract);
  const signature = render(currentContract.updater.publication.installerSignaturePattern, currentContract);
  fs.writeFileSync(path.join(input, installer), 'installer fixture');
  fs.writeFileSync(path.join(input, signature), 'untrusted comment: fixture\nRWSIGNATUREFIXTURE');
  fs.writeFileSync(path.join(input, 'source.zip'), 'must never leak');
  fs.writeFileSync(path.join(input, 'test-results.txt'), 'must never leak');
  return { temp, input, output, installer, signature };
}

const fixture = makeFixture(contract, 'hgw-release-surface-');
try {
  const stage = spawnSync(process.execPath, ['scripts/release-surface.mjs', '--input', fixture.input, '--out', fixture.output, '--repository', 'example/hgw'], { encoding: 'utf8' });
  assert.equal(stage.status, 0, `${stage.stdout}\n${stage.stderr}`);
  const names = fs.readdirSync(fixture.output).sort();
  const isPrerelease = contract.version.semver.includes('-');
  const expectedNames = [
    'RELEASE_SURFACE.json',
    'THIRD_PARTY_NOTICES.txt',
    fixture.installer,
    `${fixture.installer}.sha256`,
    fixture.signature,
    'latest-preview.json',
    ...(isPrerelease ? [] : ['latest.json']),
  ].sort();
  assert.deepEqual(names, expectedNames);
  assert.ok(!names.includes('source.zip'));
  assert.ok(!names.includes('test-results.txt'));

  const preview = JSON.parse(read(path.join(fixture.output, 'latest-preview.json')));
  assert.equal(preview.version, contract.version.semver);
  assert.equal(preview.platforms['windows-x86_64'].signature, read(path.join(fixture.output, fixture.signature)).trim());
  assert.equal(preview.platforms['windows-x86_64'].url, `https://github.com/example/hgw/releases/download/v${contract.version.semver}/${fixture.installer}`);
  if (isPrerelease) {
    assert.ok(!fs.existsSync(path.join(fixture.output, 'latest.json')), 'prerelease must not emit Stable rolling manifest');
  } else {
    const latest = JSON.parse(read(path.join(fixture.output, 'latest.json')));
    assert.deepEqual(preview, latest, 'stable release should also advance Preview to the same stable version');
  }

  const check = spawnSync(process.execPath, ['scripts/release-surface.mjs', '--check', '--out', fixture.output], { encoding: 'utf8' });
  assert.equal(check.status, 0, `${check.stdout}\n${check.stderr}`);

  const installerSidecar = path.join(fixture.output, `${fixture.installer}.sha256`);
  const validSidecar = fs.readFileSync(installerSidecar, 'utf8');
  fs.writeFileSync(installerSidecar, `deadbeef  ${fixture.installer}\n`);
  const badHash = spawnSync(process.execPath, ['scripts/release-surface.mjs', '--check', '--out', fixture.output], { encoding: 'utf8' });
  assert.notEqual(badHash.status, 0, 'release surface must reject a mismatched SHA-256 sidecar');
  fs.writeFileSync(installerSidecar, validSidecar);

  fs.writeFileSync(path.join(fixture.output, 'src.zip'), 'unexpected');
  const reject = spawnSync(process.execPath, ['scripts/release-surface.mjs', '--check', '--out', fixture.output], { encoding: 'utf8' });
  assert.notEqual(reject.status, 0, 'release surface must reject unexpected/source-like files');
} finally {
  fs.rmSync(fixture.temp, { recursive: true, force: true });
}

// Run the same script in a tiny copied project with a prerelease contract. A Preview
// release must never emit the Stable rolling-manifest asset.
const prereleaseRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hgw-release-preview-'));
try {
  fs.mkdirSync(path.join(prereleaseRoot, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(prereleaseRoot, 'release-spec'), { recursive: true });
  fs.copyFileSync('scripts/release-surface.mjs', path.join(prereleaseRoot, 'scripts/release-surface.mjs'));
  fs.copyFileSync('THIRD_PARTY_NOTICES.txt', path.join(prereleaseRoot, 'THIRD_PARTY_NOTICES.txt'));
  const previewContract = structuredClone(contract);
  previewContract.version.semver = '0.11.36-rc.1';
  previewContract.version.revision = 'r1';
  previewContract.version.display = '0.11.36-rc.1-r1';
  previewContract.version.buildId = 'v0.11.36-rc.1-r1-preview-fixture';
  fs.writeFileSync(path.join(prereleaseRoot, 'release-spec/release-contract.json'), `${JSON.stringify(previewContract, null, 2)}\n`);
  const fixtureInput = path.join(prereleaseRoot, 'input');
  const fixtureOutput = path.join(prereleaseRoot, 'release/public');
  fs.mkdirSync(fixtureInput, { recursive: true });
  const previewInstaller = render(previewContract.updater.publication.installerAssetPattern, previewContract);
  const previewSignature = render(previewContract.updater.publication.installerSignaturePattern, previewContract);
  fs.writeFileSync(path.join(fixtureInput, previewInstaller), 'preview installer');
  fs.writeFileSync(path.join(fixtureInput, previewSignature), 'preview signature');
  const stage = spawnSync(process.execPath, ['scripts/release-surface.mjs', '--input', fixtureInput, '--out', fixtureOutput, '--repository', 'example/hgw'], { cwd: prereleaseRoot, encoding: 'utf8' });
  assert.equal(stage.status, 0, `${stage.stdout}\n${stage.stderr}`);
  assert.ok(fs.existsSync(path.join(fixtureOutput, 'latest-preview.json')));
  assert.ok(!fs.existsSync(path.join(fixtureOutput, 'latest.json')), 'prerelease must not emit Stable rolling manifest');
} finally {
  fs.rmSync(prereleaseRoot, { recursive: true, force: true });
}

console.log('release-surface restructure and updater publication boundary: PASS');
