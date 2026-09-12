import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOT = path.join(ROOT, 'src');
const PACKAGED_APP = path.join(ROOT, 'tauri-ui', 'app.js');
const SOURCE_CSS = path.join(ROOT, 'src', 'styles.css');
const PACKAGED_CSS = path.join(ROOT, 'tauri-ui', 'styles.css');
const require = createRequire(import.meta.url);
const TYPESCRIPT_CLI = require.resolve('typescript/bin/tsc');

function listSources(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...listSources(absolute));
    else if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) result.push(absolute);
  }
  return result.sort((left, right) => left.localeCompare(right, 'en'));
}


export function emitEmbeddedBundle(outFile) {
  const sources = listSources(SOURCE_ROOT);
  const args = [
    '--noCheck',
    '--target', 'ES2022',
    '--module', 'AMD',
    '--moduleResolution', 'node',
    '--jsx', 'react-jsx',
    '--esModuleInterop',
    '--allowSyntheticDefaultImports',
    '--skipLibCheck',
    '--resolveJsonModule',
    '--useDefineForClassFields', 'true',
    '--outFile', outFile,
    ...sources,
  ];
  const result = spawnSync(process.execPath, [TYPESCRIPT_CLI, ...args], { cwd: ROOT, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`embedded bundle TypeScript emit failed${detail ? `:\n${detail}` : ''}`);
  }
  if (!fs.existsSync(outFile)) throw new Error('embedded bundle emit did not create an output file');
}

function sameBytes(left, right) {
  if (!fs.existsSync(left) || !fs.existsSync(right)) return false;
  return fs.readFileSync(left).equals(fs.readFileSync(right));
}

export function writeEmbeddedBundle() {
  fs.mkdirSync(path.dirname(PACKAGED_APP), { recursive: true });
  const temporary = path.join(os.tmpdir(), `hgw-embedded-${process.pid}-${Date.now()}.js`);
  try {
    emitEmbeddedBundle(temporary);
    fs.copyFileSync(temporary, PACKAGED_APP);
    fs.copyFileSync(SOURCE_CSS, PACKAGED_CSS);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
  console.log(`embedded bundle synchronized: ${path.relative(ROOT, PACKAGED_APP)}`);
}

export function checkEmbeddedBundle() {
  const temporary = path.join(os.tmpdir(), `hgw-embedded-check-${process.pid}-${Date.now()}.js`);
  try {
    emitEmbeddedBundle(temporary);
    if (!sameBytes(temporary, PACKAGED_APP)) {
      throw new Error('tauri-ui/app.js is not byte-identical to deterministic TS/TSX AMD emission; run npm run bundle:embedded');
    }
    if (!sameBytes(SOURCE_CSS, PACKAGED_CSS)) {
      throw new Error('tauri-ui/styles.css is not byte-identical to src/styles.css; run npm run bundle:embedded');
    }
  } finally {
    fs.rmSync(temporary, { force: true });
  }
  console.log('embedded bundle parity: PASS');
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(fileURLToPath(import.meta.url))) {
  if (process.argv.includes('--check')) checkEmbeddedBundle();
  else writeEmbeddedBundle();
}
