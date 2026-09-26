import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compareSemver, isValidSemver } from './release-version.mjs';
import { verifyUpdaterSignature } from './verify-updater-signature.mjs';
import { checkReleasePublication, fetchPublicationJson } from './check-release-publication.mjs';

// Public verification vectors from the locked minisign-verify 0.2.5 tests (src/lib.rs).
// No private key is present or generated. These are cryptographic fixtures, not installable artifacts.
const wrap = text => Buffer.from(text).toString('base64');
const publicKey = wrap('untrusted comment: minisign public key E7620F1842B4E81F\nRWQf6LRCGA9i53mlYecO4IzT51TGPpvWucNSCh1CBM0QTaLn73Y7GFO3');
const signatures = [
  ['Ed', 'RWQf6LRCGA9i59SLOFxz6NxvASXDJeRtuZykwQepbDEGt87ig1BNpWaVWuNrm73YiIiJbq71Wi+dP9eKL8OC351vwIasSSbXxwA=', 'timestamp:1555779966\tfile:test', 'QtKMXWyYcwdpZAlPF7tE2ENJkRd1ujvKjlj1m9RtHTBnZPa5WKU5uWRs5GoP5M/VqE81QFuMKI5k/SfNQUaOAA=='],
  ['ED', 'RUQf6LRCGA9i559r3g7V1qNyJDApGip8MfqcadIgT9CuhV3EMhHoN1mGTkUidF/z7SrlQgXdy8ofjb7bNJJylDOocrCo8KLzZwo=', 'timestamp:1556193335\tfile:test', 'y/rUw2y8/hOUYjZU71eHp/Wo1KZ40fGy2VJEDl34XMJM+TX48Ss/17u3IvIfbVR1FkZZSNCisQbuQY+bHwhEBg=='],
];
for (const [algorithm, signature, comment, global] of signatures) {
  const envelope = `untrusted comment: public verification fixture\n${signature}\ntrusted comment: ${comment}\n${global}`;
  assert.equal(verifyUpdaterSignature(Buffer.from('test'), wrap(envelope), publicKey).algorithm, algorithm);
  assert.throws(() => verifyUpdaterSignature(Buffer.from('Test'), wrap(envelope), publicKey), /signature is invalid/);
  assert.throws(() => verifyUpdaterSignature(Buffer.from('test'), wrap(envelope.replace('file:test', 'file:other')), publicKey), /trusted-comment/);
  const record = Buffer.from(signature, 'base64'); record[2] ^= 1;
  assert.throws(() => verifyUpdaterSignature(Buffer.from('test'), wrap(envelope.replace(signature, record.toString('base64'))), publicKey), /key ID mismatch/);
  const keyLines = Buffer.from(publicKey, 'base64').toString().split('\n');
  const wrongKey = Buffer.from(keyLines[1], 'base64'); wrongKey[10] ^= 1;
  keyLines[1] = wrongKey.toString('base64');
  assert.throws(() => verifyUpdaterSignature(Buffer.from('test'), wrap(envelope), wrap(keyLines.join('\n'))), /signature is invalid/);
  assert.throws(() => verifyUpdaterSignature(Buffer.from('test'), `${wrap(envelope)}!`, publicKey), /base64/);
  assert.throws(() => verifyUpdaterSignature(Buffer.from('test'), wrap(envelope), 'UNCONFIGURED'), /Invalid/);
}

for (const invalid of ['1.0.0-01', '1.0.0-rc.01', '1.0', '01.0.0', '1.0.0-', '9007199254740992.0.0', null, 1]) assert.equal(isValidSemver(invalid), false, String(invalid));
assert.equal(isValidSemver('1.0.0+build-01'), true);
assert.ok(compareSemver('1.0.0-9007199254740992', '1.0.0-9007199254740993') < 0, 'large prerelease identifiers cannot collapse through floating-point rounding');
assert.equal(compareSemver('1.0.0+a', '1.0.0+b'), 0);

const repository = 'example/workbench';
const manifest = version => ({ version, platforms: { 'windows-x86_64': { signature: 'signed-public-fixture', url: `https://github.com/${repository}/releases/download/v${version}/Hytale-Generator-Workbench_${version}_x64-setup.exe` } } });
async function plan(version, channels = {}, existing = false) {
  const calls = [];
  const result = await checkReleasePublication({ repository, version, getJson: async (url, missing) => {
    calls.push(url);
    if (url.includes('/releases/tags/v')) { assert.equal(missing, true); return existing ? {} : null; }
    const channel = url.includes('updater-stable') ? 'stable' : 'preview';
    const current = channels[channel];
    if (url.includes('/releases/tags/')) return current ? { draft: false, assets: [{ name: channel === 'stable' ? 'latest.json' : 'latest-preview.json' }] } : null;
    assert.equal(missing, false);
    return typeof current === 'string' ? manifest(current) : current;
  } });
  return { ...result, calls };
}
assert.equal((await plan('1.0.0-rc.1')).advancePreview, true, 'confirmed absent channels can bootstrap');
const prerelease = await plan('1.0.0-rc.2', { preview: '1.0.0-rc.1' });
assert.ok(prerelease.calls.every(url => !url.includes('stable')), 'Preview publication never reads or writes Stable');
await assert.rejects(plan('1.0.0-rc.1', { preview: '1.0.0-rc.2' }), /regression/);
await assert.rejects(plan('1.0.0', { stable: '1.0.0' }), /same-version/);
await assert.rejects(plan('1.0.0', {}, true), /already exists/);
await assert.rejects(plan('1.0.0', { stable: '0.9.0-rc.1' }), /Stable.*prerelease/);
await assert.rejects(plan('1.0.0', { stable: { ...manifest('0.9.0'), platforms: {} } }), /Invalid.*target/);
assert.equal((await plan('1.0.1', { stable: '1.0.0', preview: '1.1.0-beta.1' })).advancePreview, false, 'a stable hotfix must preserve the newer Preview channel');
assert.equal((await plan('1.0.0', { preview: '1.0.0-rc.3' })).advancePreview, true);
await assert.rejects(checkReleasePublication({ repository, version: '1.0.0', getJson: async () => { throw Error('network unavailable'); } }), /network/);
await assert.rejects(checkReleasePublication({ repository, version: '1.0.0', getJson: async url => url.includes('/tags/v') ? null : { assets: [] } }), /Invalid.*rolling/);

const originalFetch = globalThis.fetch;
try {
  for (const status of [401, 403, 429, 500]) {
    globalThis.fetch = async () => new Response('', { status });
    await assert.rejects(fetchPublicationJson('https://api.github.com/repos/example/workbench/releases/tags/v1.0.0', true, 'fixture-token'), /preflight failed/);
  }
  globalThis.fetch = async (_url, options) => { assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, 'Bearer fixture-token'); return new Response('', { status: 404 }); };
  assert.equal(await fetchPublicationJson('https://api.github.com/repos/example/workbench/releases/tags/v1.0.0', true, 'fixture-token'), null);
  globalThis.fetch = async (_url, options) => { assert.equal(options.headers.Authorization, undefined); return new Response('{}'); };
  await fetchPublicationJson('https://github.com/example/workbench/releases/download/updater-preview/latest-preview.json', false, 'fixture-token');
} finally { globalThis.fetch = originalFetch; }

const read = file => fs.readFileSync(file, 'utf8');
const rust = read('src-tauri/src/main.rs');
const install = rust.slice(rust.indexOf('async fn install_update('), rust.indexOf('fn exit_application('));
assert.match(install, /if !updater_configured\(\)/);
assert.match(install, /pending.begin_install\(/);
const verified = install.indexOf('Update download or signature verification failed');
assert.ok(verified > 0 && install.indexOf('phase: "downloaded"') > verified, 'verified progress must follow successful Tauri signature verification, not its earlier download callback');
assert.ok(install.indexOf('lock_update_install(&desktop)?') > verified);
assert.ok(install.indexOf('lock_update_install(&desktop)?') < install.lastIndexOf('pending_change_count.load'));
assert.ok(install.lastIndexOf('pending_change_count.load') < install.indexOf('.install(&bytes)'));
assert.match(rust, /let generation = pending.begin_check\(\)\?/);
for (const file of ['release-windows.yml', 'validate-release-candidate.yml']) {
  const workflow = read(`.github/workflows/${file}`);
  assert.match(workflow, /node scripts\/release-surface.mjs --check\n\s+if \(\$LASTEXITCODE -ne 0\)/);
  assert.match(workflow, /node scripts\/verify-updater-signature.mjs\n\s+if \(\$LASTEXITCODE -ne 0\)/);
}
const publish = read('.github/workflows/release-windows.yml');
assert.equal((publish.match(/semver\.Split\('\+'\)\[0\]\.Contains\('-'\)/g) ?? []).length, 2, 'release tagging and rolling publication must ignore hyphens in SemVer build metadata');
assert.match(read('scripts/release-surface.mjs'), /parseSemver\(contract.version.semver\).prerelease.length > 0/);
assert.match(rust, /\.timeout\(Duration::from_secs\(30\)\)/);
assert.match(rust, /update.timeout = Some\(Duration::from_secs\(600\)\)/);
assert.match(publish, /group: publish-windows\n/, 'all version tags must share one publishing lock');
assert.ok(publish.indexOf('check-release-publication.mjs') < publish.indexOf("@('release', 'create', $tag)"));
assert.match(publish, /--verify-tag/);
assert.match(publish, /ADVANCE_PREVIEW: \$\{\{ steps.publication.outputs.advance_preview \}\}/);
assert.match(publish, /if \(\$env:ADVANCE_PREVIEW -eq 'true'\)/);
console.log('Pre-1.0 Audit 14 — updater/release: PASS (public signature vectors, publication failures/ordering, native integration boundaries; installed E2E still required)');
