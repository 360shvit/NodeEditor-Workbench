import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compareSemver } from './release-version.mjs';

const read = (path) => fs.readFileSync(path, 'utf8');
const exists = (path) => fs.existsSync(path);
const pkg = JSON.parse(read('package.json'));
const contract = JSON.parse(read('release-spec/release-contract.json'));

assert.ok(compareSemver(contract.version.semver, '0.11.35') >= 0, 'current release must not precede the v0.11.35 fix baseline');
assert.match(contract.version.revision, /^r\d+$/);

for (const path of [
  'Package-Windows-Portable.cmd',
  'PORTABLE_README.txt',
  'Run-Windows.cmd',
  'index.html',
  'vite.config.ts',
  'README_FIRST.txt',
  'src-tauri/icons/icon.png',
  'scripts/audit-layout-reader-v2.mjs',
  'scripts/audit-path.mjs',
  'scripts/verify-text-preservation.mjs',
  'scripts/test-desktop-ux-v0.8.4.mjs',
  'scripts/test-desktop-ux-v0.9.0.mjs',
  'scripts/test-desktop-ux-v0.9.1.mjs',
  'scripts/test-performance-optimization-v0.11.3.mjs',
  'scripts/test-performance-optimization-v0.11.4.mjs',
]) assert.equal(exists(path), false, `${path} must stay removed`);

assert.equal(pkg.dependencies.vite, undefined);
assert.equal(pkg.dependencies['@vitejs/plugin-react'], undefined);
assert.equal(pkg.scripts.dev, undefined);
assert.equal(pkg.scripts.preview, undefined);
assert.equal(pkg.scripts['test:performance-optimization-ii'], undefined);
assert.equal(pkg.scripts['test:performance-optimization-iii'], undefined);
assert.equal(pkg.scripts.build, 'tsc -p tsconfig.app.json && npm run bundle:embedded');
assert.equal(exists('docs/history'), false, 'internal engineering history must stay out of the public repository');

assert.equal(contract.updater.publication.portableAssetPattern, undefined);
assert.equal(contract.updater.windows.autoUpdatePortableBuild, undefined);
assert.equal(contract.updater.lifecycle.portable, undefined);
assert.match(contract.updater.lifecycle.nonInstalledBuild, /only installed NSIS/i);
assert.match(read('Build-Windows.cmd'), /HGW_DISTRIBUTION_KIND=development/);
assert.doesNotMatch(read('scripts/release-surface.mjs'), /canonicalPortable|resolvePortableSource/);
assert.doesNotMatch(read('scripts/sync-release-contract.mjs'), /Package-Windows-Portable/);

for (const path of [
  'scripts/generate-visual-catalog.mjs',
  'scripts/test-real-geometry.mjs',
  'scripts/test-real-layout.mjs',
  'scripts/test-real-refactor.mjs',
  'scripts/layout-baseline-v0.7.2.json',
  'fixtures/exporter.json',
  'fixtures/consumer.json',
]) assert.ok(exists(path), `${path} is deliberately retained`);

function assertActionPins(file) {
  const source = read(file);
  const uses = [...source.matchAll(/^\s*-\s+uses:\s+([^\s#]+)/gm)].map((match) => match[1]);
  assert.ok(uses.length > 0, `${file} must use pinned actions`);
  for (const use of uses) {
    const split = use.lastIndexOf('@');
    assert.ok(split > 0, `${file}: action reference must contain @: ${use}`);
    const ref = use.slice(split + 1);
    assert.match(ref, /^[0-9a-f]{40}$/i, `${file}: action must be pinned to a full 40-character commit SHA: ${use}`);
  }
  return uses;
}

const validateWorkflow = read('.github/workflows/build-tauri-windows.yml');
assert.match(validateWorkflow, /runs-on: windows-2025/);
const validateUses = assertActionPins('.github/workflows/build-tauri-windows.yml');
for (const action of ['actions/checkout', 'actions/setup-node', 'dtolnay/rust-toolchain']) {
  assert.ok(validateUses.some((use) => use.startsWith(`${action}@`)), `validation workflow must use ${action}`);
}
assertActionPins('.github/workflows/release-windows.yml');

console.log(`${contract.version.display} deep-clean contract: PASS`);
