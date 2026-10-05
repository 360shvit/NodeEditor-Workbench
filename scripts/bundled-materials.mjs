import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const readText = file => fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');

function contained(base, relative) {
  const full = path.resolve(base, relative);
  const check = path.relative(base, full);
  if (!check || check.startsWith('..') || path.isAbsolute(check)) throw new Error('Bundled material path escapes its root');
  return full;
}

export function bundledMaterials(root, target, cargoPackages) {
  const policy = JSON.parse(readText(path.join(root, 'release-spec/bundled-materials.json')));
  if (policy.schemaVersion !== 1 || target !== policy.target || target !== 'x86_64-pc-windows-msvc') {
    throw new Error('Bundled material review does not cover this schema/target');
  }
  const legalFiles = component => {
    if (component.legalFiles?.length !== 2) throw new Error('Bundled material license/notice coverage is incomplete');
    return component.legalFiles.map(file => {
      const text = readText(contained(root, file.path));
      if (!text.trim() || sha256(text) !== file.sha256Lf) throw new Error(`Bundled legal material requires review: ${file.path}`);
      return { name: file.path, text };
    });
  };

  const loader = policy.webview2;
  const wrappers = [...cargoPackages.values()].filter(pkg => pkg.name === 'webview2-com-sys');
  if (wrappers.length !== 1 || wrappers[0].version !== loader.wrapperVersion) {
    throw new Error('Native WebView2 wrapper version requires renewed SDK review');
  }
  const nativeFile = contained(path.dirname(wrappers[0].manifest_path), loader.libraryPath);
  if (sha256(fs.readFileSync(nativeFile)) !== loader.librarySha256) {
    throw new Error('Native WebView2 loader bytes differ from the reviewed Microsoft SDK');
  }

  const compiler = policy.typescript;
  const lock = JSON.parse(readText(path.join(root, 'package-lock.json')));
  const installed = JSON.parse(readText(path.join(root, 'node_modules/typescript/package.json')));
  if (lock.packages['node_modules/typescript']?.version !== compiler.version || installed.version !== compiler.version) {
    throw new Error('TypeScript compiler version requires renewed emitted-helper review');
  }
  const bundle = readText(path.join(root, 'tauri-ui/app.js'));
  const firstModule = bundle.search(/^define\(/m);
  if (firstModule <= 0 || sha256(bundle.slice(0, firstModule)) !== compiler.helpersSha256Lf) {
    throw new Error('Compiler-emitted helper bytes require renewed review');
  }
  const compilerFiles = legalFiles(compiler);
  for (const [index, name] of ['LICENSE.txt', 'ThirdPartyNoticeText.txt'].entries()) {
    if (readText(path.join(root, 'node_modules/typescript', name)) !== compilerFiles[index].text) {
      throw new Error('Installed compiler legal material differs from the reviewed copy');
    }
  }

  return [
    {
      identity: `native:Microsoft.Web.WebView2.Loader@${loader.sdkVersion}`,
      license: 'BSD-3-Clause', source: loader.source, sourceArchive: loader.sourceArchive,
      files: legalFiles(loader),
    },
    {
      identity: `compiler-emitted:TypeScript helpers@${compiler.version}`,
      license: 'Apache-2.0', source: compiler.source, sourceArchive: compiler.sourceArchive,
      files: compilerFiles,
    },
  ];
}
