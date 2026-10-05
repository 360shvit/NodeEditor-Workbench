import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { bundledMaterials } from './bundled-materials.mjs';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hgw-bundled-materials-'));
const target = 'x86_64-pc-windows-msvc';
const policy = JSON.parse(fs.readFileSync('release-spec/bundled-materials.json', 'utf8'));
const copy = relative => {
  const dest = path.join(temp, relative);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(root, relative), dest);
};
const writePolicy = () => fs.writeFileSync(path.join(temp, 'release-spec/bundled-materials.json'), JSON.stringify(policy));
try {
  for (const relative of ['release-spec/bundled-materials.json', 'package-lock.json', 'tauri-ui/app.js',
    'node_modules/typescript/package.json', 'node_modules/typescript/LICENSE.txt', 'node_modules/typescript/ThirdPartyNoticeText.txt',
    ...policy.webview2.legalFiles.map(file => file.path), ...policy.typescript.legalFiles.map(file => file.path)]) copy(relative);
  const manifest = path.join(temp, 'wrapper/Cargo.toml');
  const binary = path.join(temp, 'wrapper', policy.webview2.libraryPath);
  fs.mkdirSync(path.dirname(binary), { recursive: true });
  const fixture = Buffer.from('isolated native library fixture');
  fs.writeFileSync(binary, fixture);
  const packages = new Map([['wrapper', { name: 'webview2-com-sys', version: policy.webview2.wrapperVersion, manifest_path: manifest }]]);
  assert.throws(() => bundledMaterials(temp, target, packages), /loader bytes differ/, 'unreviewed native bytes must fail');
  policy.webview2.librarySha256 = createHash('sha256').update(fixture).digest('hex');
  writePolicy();
  const materials = bundledMaterials(temp, target, packages);
  assert.deepEqual(materials.map(item => item.license), ['BSD-3-Clause', 'Apache-2.0']);
  assert.equal(materials.flatMap(item => item.files).length, 4);
  assert.ok(materials[0].files[1].text.includes('NOTICES AND INFORMATION'));
  assert.throws(() => bundledMaterials(temp, 'aarch64-pc-windows-msvc', packages), /schema\/target/);
  assert.throws(() => bundledMaterials(temp, target, new Map()), /wrapper version/);
  const wrongVersion = new Map([['wrapper', { ...packages.get('wrapper'), version: '0.39.0' }]]);
  assert.throws(() => bundledMaterials(temp, target, wrongVersion), /wrapper version/);
  fs.appendFileSync(binary, '!');
  assert.throws(() => bundledMaterials(temp, target, packages), /loader bytes differ/);
  fs.writeFileSync(binary, fixture);
  const notice = policy.webview2.legalFiles[1].path;
  fs.writeFileSync(path.join(temp, notice), '');
  assert.throws(() => bundledMaterials(temp, target, packages), /legal material requires review/);
  copy(notice);
  const originalPath = policy.webview2.legalFiles[1].path;
  policy.webview2.legalFiles[1].path = '../outside.txt';
  writePolicy();
  assert.throws(() => bundledMaterials(temp, target, packages), /escapes its root/);
  policy.webview2.legalFiles[1].path = originalPath;
  writePolicy();
  fs.writeFileSync(path.join(temp, 'node_modules/typescript/package.json'), '{"version":"0.0.0"}');
  assert.throws(() => bundledMaterials(temp, target, packages), /compiler version/);
  copy('node_modules/typescript/package.json');
  fs.writeFileSync(path.join(temp, 'tauri-ui/app.js'), 'var injected = 1;\n' + fs.readFileSync('tauri-ui/app.js', 'utf8'));
  assert.throws(() => bundledMaterials(temp, target, packages), /helper bytes/);
  copy('tauri-ui/app.js');
  fs.appendFileSync(path.join(temp, 'node_modules/typescript/LICENSE.txt'), 'modified');
  assert.throws(() => bundledMaterials(temp, target, packages), /Installed compiler legal material/);
  console.log('Bundled material review: PASS (native bytes, versions, helper output, legal text integrity, target and path rejection)');
} finally {
  const expectedParent = path.resolve(os.tmpdir());
  assert.equal(path.dirname(path.resolve(temp)), expectedParent);
  assert.ok(path.basename(temp).startsWith('hgw-bundled-materials-'));
  fs.rmSync(temp, { recursive: true, force: true });
}
