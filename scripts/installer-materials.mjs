import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const text = file => fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');

function contained(root, relative) {
  if (typeof relative !== 'string' || relative.includes('\\') || relative.includes(':')) throw new Error('Invalid installer material path');
  const full = path.resolve(root, relative);
  const check = path.relative(root, full);
  if (!check || check.startsWith('..') || path.isAbsolute(check)) throw new Error('Installer material path escapes its root');
  return full;
}

export function installerReview(root, target = 'x86_64-pc-windows-msvc') {
  const policy = JSON.parse(text(path.join(root, 'release-spec/installer-materials.json')));
  if (policy.schemaVersion !== 1 || target !== policy.target || target !== 'x86_64-pc-windows-msvc') throw new Error('Installer review does not cover this schema/target');
  for (const name of ['tauri.conf.json', 'tauri.installer.conf.json']) {
    const bundle = JSON.parse(text(path.join(root, 'src-tauri', name))).bundle;
    const nsis = bundle?.windows?.nsis;
    if (bundle?.useLocalToolsDir || nsis?.template || nsis?.installerHooks || nsis?.customLanguageFiles) throw new Error('Custom installer tooling requires review');
  }
  const config = JSON.parse(text(path.join(root, 'src-tauri/tauri.installer.conf.json')));
  if (config.bundle.targets?.join(',') !== 'nsis' || config.bundle.windows.nsis.compression !== 'lzma') throw new Error('Installer target/compression requires review');
  const cli = text(path.join(root, 'tools/windows/Install-Windows-Installer-Tooling.cmd')).match(/TAURI_CLI_VERSION=(\d+\.\d+\.\d+)/)?.[1];
  if (cli !== policy.tauriCliVersion) throw new Error('Installer CLI version requires renewed material review');
  const indexText = text(contained(root, policy.toolsetIndex.path));
  if (sha256(indexText) !== policy.toolsetIndex.sha256Lf) throw new Error('Installer toolset index requires review');
  const index = JSON.parse(indexText);
  if (Object.keys(index).length !== policy.toolsetIndex.files) throw new Error('Installer toolset coverage is incomplete');
  for (const [file, hash] of Object.entries(index)) {
    contained(root, file);
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid installer toolset digest');
  }
  if (policy.components?.length !== 2 || policy.components[0].legalFiles?.length !== 3 || policy.components[1].legalFiles?.length !== 2) throw new Error('Installer legal coverage is incomplete');
  const materials = policy.components.map(component => ({
    identity: component.identity, license: component.license, source: component.source,
    sourceArchive: component.sourceArchive,
    files: component.legalFiles.map(file => {
      const content = text(contained(root, file.path));
      if (!content.trim() || sha256(content) !== file.sha256Lf) throw new Error(`Installer legal material requires review: ${file.path}`);
      return { name: file.path, text: content };
    }),
  }));
  return { policy, index, materials };
}

// Post-build provenance gate: it does not claim to sandbox the compiler or prove
// the upstream plug-in's missing transitive build lock. No cache repair occurs.
export function verifyInstallerToolset(directory, index) {
  const found = new Set();
  function visit(dir) {
    if (fs.lstatSync(dir).isSymbolicLink()) throw new Error('Installer toolset contains a reparse link');
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Installer toolset contains a reparse link');
      if (entry.isDirectory()) visit(full);
      else {
        const relative = path.relative(directory, full).split(path.sep).join('/');
        if (!entry.isFile() || !Object.hasOwn(index, relative)) throw new Error(`Unreviewed installer toolset file: ${relative}`);
        if (sha256(fs.readFileSync(full)) !== index[relative]) throw new Error(`Installer toolset bytes differ: ${relative}`);
        found.add(relative);
      }
    }
  }
  visit(directory);
  for (const relative of Object.keys(index)) if (!found.has(relative)) throw new Error(`Missing installer toolset file: ${relative}`);
  return { files: found.size };
}
