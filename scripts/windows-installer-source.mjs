import fs from 'node:fs';
import path from 'node:path';

// The pinned Tauri NSIS bundler names its output product_version_arch-setup.exe.
// Never relabel whichever artifact happens to have the newest filesystem timestamp.
export function findWindowsInstaller(directory, productName, version) {
  const name = `${productName}_${version}_x64-setup.exe`;
  if (path.basename(name) !== name || name.includes('/') || name.includes('\\')) {
    throw new Error('Invalid Windows installer identity');
  }
  const file = path.resolve(directory, name);
  if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
    throw new Error(`Expected current Windows installer is missing: ${name}`);
  }
  return file;
}
