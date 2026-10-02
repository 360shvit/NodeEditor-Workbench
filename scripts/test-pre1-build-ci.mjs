import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { emitEmbeddedBundle } from './embedded-bundle.mjs';

const read = file => fs.readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
assert.equal(lock.lockfileVersion, 3);
assert.equal(lock.version, pkg.version);
for (const section of ['dependencies', 'devDependencies']) {
  assert.deepEqual(lock.packages[''][section], pkg[section], `npm root ${section} must match the committed lock`);
  for (const version of Object.values(pkg[section])) assert.match(version, /^\d+\.\d+\.\d+$/, 'direct npm versions must be exact');
}
for (const [name, entry] of Object.entries(lock.packages)) {
  if (!name) continue;
  assert.match(entry.resolved, /^https:\/\/registry\.npmjs\.org\//, `${name}: unexpected dependency origin`);
  assert.match(entry.integrity, /^sha512-/, `${name}: missing locked integrity`);
}
assert.match(read('.nvmrc').trim(), /^\d+\.\d+\.\d+$/, 'Node must be pinned to an exact release');
const rustVersion = read('rust-toolchain.toml').match(/^channel = "(\d+\.\d+\.\d+)"$/m)?.[1];
assert.ok(rustVersion, 'Rust must be pinned to an exact release');
assert.match(read('rust-toolchain.toml'), /targets = \["x86_64-pc-windows-msvc"\]/);
const cliVersion = read('tools/windows/Install-Windows-Installer-Tooling.cmd').match(/TAURI_CLI_VERSION=(\d+\.\d+\.\d+)/)?.[1];
assert.ok(cliVersion);

for (const name of ['build-tauri-windows.yml', 'validate-release-candidate.yml', 'release-windows.yml']) {
  const workflow = read(`.github/workflows/${name}`);
  for (const match of workflow.matchAll(/runs-on:\s*(\S+)/g)) assert.equal(match[1], 'windows-2025');
  for (const match of workflow.matchAll(/toolchain:\s*(\S+)/g)) assert.equal(match[1], rustVersion);
  assert.match(workflow, /node-version-file: \.nvmrc/);
  assert.match(workflow, /npm ci --ignore-scripts/);
  assert.doesNotMatch(workflow, /\bnpm install\b|cargo generate-lockfile|cargo update\b/);
  for (const line of workflow.split('\n').filter(line => /\bcargo (?:test|install|tauri build)\b/.test(line))) {
    assert.match(line, /--locked/, `${name}: Cargo must consume locked dependencies`);
  }
  for (const match of workflow.matchAll(/cargo install tauri-cli --version (\S+) --locked/g)) assert.equal(match[1], cliVersion);
  for (const match of workflow.matchAll(/uses:\s*(\S+)/g)) assert.match(match[1], /@[a-f0-9]{40}$/i);
}
const candidate = read('.github/workflows/validate-release-candidate.yml');
assert.doesNotMatch(candidate, /contents:\s*write|\bgh release\b/);
assert.match(candidate, /environment: release/);
const validation = read('.github/workflows/build-tauri-windows.yml');
assert.match(validation, /save-if: \$\{\{ github.event_name == 'push' && github.ref == 'refs\/heads\/main' \}\}/, 'untrusted PRs must not save the Rust cache');

// Windows CI executes actual shell semantics, not only matching source tokens.
if (process.platform === 'win32') {
  const result = spawnSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', 'scripts/test-build-failure-paths.ps1'], { encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  process.stdout.write(result.stdout);
} else {
  console.log('Windows command failure fixtures: NOT RUN on this platform; required Windows CI executes them.');
}

// Re-emit into different output paths. Each emission must match the committed
// desktop frontend, and neither may depend on a previous emission's output.
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hgw-build-repro-'));
try {
  const expected = fs.readFileSync('tauri-ui/app.js');
  for (const name of ['first.js', 'second.js']) {
    const target = path.join(tempRoot, name);
    emitEmbeddedBundle(target);
    assert.ok(fs.readFileSync(target).equals(expected), `${name}: embedded output must be byte-identical to the committed frontend`);
  }
  assert.ok(fs.readFileSync('src/styles.css').equals(fs.readFileSync('tauri-ui/styles.css')));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
console.log('Pre-1.0 Audit 15 — build input/CI contract: PASS');
