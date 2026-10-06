import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { installerReview, verifyInstallerToolset } from './installer-materials.mjs';

const root = process.cwd();
const { policy, index, materials } = installerReview(root);
assert.equal(Object.keys(index).length, 442);
assert.equal(materials.length, 2);
assert.match(materials[0].files[0].text, /SPECIAL EXCEPTION FOR LZMA/);
assert.match(materials[0].files[2].text, /Copyright © 2002-2025 Joost Verburg/);
assert.match(policy.pluginBinary.upstreamTransitiveLock, /unresolved/);
assert.throws(() => installerReview(root, 'aarch64-pc-windows-msvc'), /schema\/target/);
const tempParent = path.resolve(os.tmpdir());
const temp = fs.mkdtempSync(path.join(tempParent, 'hgw-installer-materials-test-'));
const write = (name, bytes) => {
  const file = path.join(temp, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
};
const copy = name => write(name, fs.readFileSync(path.join(root, name)));
try {
  for (const name of ['release-spec/installer-materials.json', policy.toolsetIndex.path,
    'src-tauri/tauri.conf.json', 'src-tauri/tauri.installer.conf.json', 'tools/windows/Install-Windows-Installer-Tooling.cmd',
    ...policy.components.flatMap(c => c.legalFiles.map(f => f.path))]) copy(name);
  assert.equal(installerReview(temp).materials.length, 2);
  const legal = policy.components[0].legalFiles[2].path;
  write(legal, 'changed attribution');
  assert.throws(() => installerReview(temp), /legal material requires review/);
  copy(legal);
  write(policy.toolsetIndex.path, '{}');
  assert.throws(() => installerReview(temp), /index requires review/);
  copy(policy.toolsetIndex.path);
  const altered = structuredClone(policy);
  altered.components[0].legalFiles[0].path = '../outside.txt';
  write('release-spec/installer-materials.json', JSON.stringify(altered));
  assert.throws(() => installerReview(temp), /escapes its root/);
  copy('release-spec/installer-materials.json');
  const configFile = 'src-tauri/tauri.installer.conf.json';
  const config = JSON.parse(fs.readFileSync(path.join(root, configFile)));
  config.bundle.windows.nsis.template = 'unreviewed.nsi';
  write(configFile, JSON.stringify(config));
  assert.throws(() => installerReview(temp), /Custom installer tooling/);
  copy(configFile);
  write('tools/windows/Install-Windows-Installer-Tooling.cmd', 'TAURI_CLI_VERSION=99.0.0');
  assert.throws(() => installerReview(temp), /CLI version/);

  const toolset = path.join(temp, 'toolset');
  const fixtures = { 'Stubs/lzma_solid-x86-unicode': 'reviewed stub', 'Plugins/x86-unicode/additional/nsis_tauri_utils.dll': 'reviewed plugin' };
  const fixtureIndex = {};
  for (const [name, bytes] of Object.entries(fixtures)) {
    write('toolset/' + name, bytes);
    fixtureIndex[name] = createHash('sha256').update(bytes).digest('hex');
  }
  assert.deepEqual(verifyInstallerToolset(toolset, fixtureIndex), { files: 2 });
  for (const [name, bytes] of Object.entries(fixtures)) {
    write('toolset/' + name, bytes + 'tampered');
    assert.throws(() => verifyInstallerToolset(toolset, fixtureIndex), /bytes differ/);
    write('toolset/' + name, bytes);
  }
  write('toolset/Plugins/extra.dll', 'unreviewed');
  assert.throws(() => verifyInstallerToolset(toolset, fixtureIndex), /Unreviewed/);
  fs.unlinkSync(path.join(toolset, 'Plugins/extra.dll'));
  fs.unlinkSync(path.join(toolset, 'Stubs/lzma_solid-x86-unicode'));
  assert.throws(() => verifyInstallerToolset(toolset, fixtureIndex), /Missing/);

  // Both protected paths must gate staging on actual post-build tool bytes.
  for (const name of ['validate-release-candidate.yml', 'release-windows.yml']) {
    const workflow = fs.readFileSync(path.join(root, '.github/workflows', name), 'utf8');
    const build = workflow.indexOf('cargo tauri build --bundles nsis');
    const check = workflow.indexOf('run: node scripts/verify-installer-materials.mjs');
    const stage = workflow.indexOf('node scripts/release-surface.mjs --installer-dir');
    assert.ok(build >= 0 && check > build && stage > check, `${name}: post-build provenance must gate staging`);
  }
  const candidate = fs.readFileSync(path.join(root, '.github/workflows/validate-release-candidate.yml'), 'utf8');
  assert.match(candidate, /--evidence evidence\/installer-toolset.json/);
  assert.match(candidate, /^            evidence\/installer-toolset.json$/m);
  const helper = fs.readFileSync(path.join(root, 'Build-Windows-Installer.cmd'), 'utf8');
  assert.match(helper, /node scripts\\verify-installer-materials.mjs\r?\nif errorlevel 1 \([\s\S]*?exit \/b 1\r?\n\)/);
  assert.ok(helper.indexOf('verify-installer-materials.mjs') < helper.indexOf('release-surface.mjs --installer-dir'));
  console.log('Installer material review: PASS (legal/encoding integrity; changed, extra and missing binary rejection; target/config/CLI/index guards; staging gates)');
} finally {
  assert.equal(path.dirname(path.resolve(temp)), tempParent);
  assert.ok(path.basename(temp).startsWith('hgw-installer-materials-test-'));
  fs.rmSync(temp, { recursive: true, force: true });
}
