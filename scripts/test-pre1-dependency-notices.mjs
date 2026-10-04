import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { assertReviewedCargoSources, assertReviewedRuntimeLicenses, assertReviewedVendoredFiles, readThirdPartyPolicy } from './third-party-policy.mjs';

const root = process.cwd();
const read = file => fs.readFileSync(file, 'utf8');
const policy = readThirdPartyPolicy(root);
const rootManifest = path.join(root, 'src-tauri/Cargo.toml');
const lock = read('src-tauri/Cargo.lock');
const rustlsVersions = [...lock.matchAll(/\[\[package\]\]\s+name = "rustls"\s+version = "([^"]+)"/g)].map(match => match[1]);
assert.ok(rustlsVersions.length, 'the actual locked TLS dependency must be checked');
function metadata(version = rustlsVersions[0]) {
  return { packages: [
    { id: 'app', name: 'app', version: '1.0.0', source: null, manifest_path: rootManifest },
    { id: 'tls', name: 'rustls', version, source: policy.cargoRegistry, manifest_path: path.join(root, 'fixture/rustls/Cargo.toml') },
  ], resolve: { root: 'app', nodes: [{ id: 'app', deps: [{ pkg: 'tls' }] }, { id: 'tls', deps: [] }] } };
}
for (const version of rustlsVersions) assertReviewedCargoSources(metadata(version), rootManifest, policy);
assert.throws(() => assertReviewedCargoSources(metadata('0.23.44'), rootManifest, policy), /security floor/);
assert.throws(() => assertReviewedCargoSources(metadata('0.23.45-rc.1'), rootManifest, policy), /security floor/);
assertReviewedCargoSources(metadata('0.23.45'), rootManifest, policy);
const localDependency = metadata();
localDependency.packages[1].source = null;
assert.throws(() => assertReviewedCargoSources(localDependency, rootManifest, policy), /source requires review/);
const gitDependency = metadata();
gitDependency.packages[1].source = 'git+https://example.invalid/dependency';
assert.throws(() => assertReviewedCargoSources(gitDependency, rootManifest, policy), /source requires review/);
const missingGraph = metadata();
missingGraph.resolve = null;
assert.throws(() => assertReviewedCargoSources(missingGraph, rootManifest, policy), /complete resolved/);

const runtime = license => [{ ecosystem: 'cargo', name: 'fixture', version: '1.0.0', classification: 'runtime', license }];
assertReviewedRuntimeLicenses(runtime('MIT OR Apache-2.0'), policy);
assertReviewedRuntimeLicenses(runtime('(MIT OR Apache-2.0) AND Unicode-3.0'), policy);
for (const license of ['LicenseRef-unreviewed', 'MIT AND LicenseRef-unreviewed', null, '']) {
  assert.throws(() => assertReviewedRuntimeLicenses(runtime(license), policy), /license requires review/);
}

const vendored = [
  { ecosystem: 'vendored', name: 'Preact', version: null, license: 'MIT', sourcePath: 'tauri-ui/preact-lite.js' },
  { ecosystem: 'vendored', name: 'Lucide icon geometry', version: '1.29.0', license: 'ISC AND MIT', sourcePath: 'src/components/LucideIcon.tsx' },
];
assertReviewedVendoredFiles(root, policy, vendored);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hgw-notice-review-'));
try {
  for (const entry of policy.vendored) {
    const output = path.join(temp, entry.path);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(path.join(root, entry.path), output);
  }
  assertReviewedVendoredFiles(temp, policy, vendored);
  fs.appendFileSync(path.join(temp, policy.vendored[0].path), '\n// changed component\n');
  assert.throws(() => assertReviewedVendoredFiles(temp, policy, vendored), /renewed provenance\/license review/);
  assert.throws(() => assertReviewedVendoredFiles(root, { ...policy, vendored: [] }, vendored), /coverage/);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

// Test the shipped downstream Preact bytes directly. JSON null is not the
// undefined constructor marker of a genuine VNode (GHSA-36hm-qxxp-pg3m).
const context = vm.createContext({});
vm.runInContext(read('tauri-ui/preact-lite.js'), context);
assert.equal(vm.runInContext('PreactLite.isValidElement(PreactLite.h("span", {}, "text"))', context), true);
assert.equal(vm.runInContext('PreactLite.isValidElement(JSON.parse(\'{"type":"div","constructor":null,"props":{"dangerouslySetInnerHTML":{"__html":"injected"}}}\'))', context), false);
assert.equal(vm.runInContext('PreactLite.isValidElement(JSON.parse(\'{"type":"div","props":{}}\'))', context), false);

// Confirm the current npm build-only classification against emitted imports and
// their local providers; introducing a new runtime import requires review.
const definitions = new Set();
const imports = new Set();
for (const match of read('tauri-ui/app.js').matchAll(/define\("([^"]+)",\s*(\[[^\]]*\])/g)) {
  definitions.add(match[1]);
  for (const name of JSON.parse(match[2])) imports.add(name);
}
assert.ok(definitions.size > 0);
const external = [...imports].filter(name => !definitions.has(name) && !['require', 'exports'].includes(name)).sort();
assert.deepEqual(external, ['./styles.css', 'react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'zustand']);
const providers = [...read('tauri-ui/compat-modules.js').matchAll(/define\('([^']+)'/g)].map(match => match[1]).sort();
assert.deepEqual(providers, external.filter(name => name !== './styles.css'));
const installer = JSON.parse(read('src-tauri/tauri.installer.conf.json'));
assert.equal(installer.bundle.resources['../THIRD_PARTY_NOTICES.txt'], 'THIRD_PARTY_NOTICES.txt');
assert.equal(installer.bundle.resources['../LICENSE'], 'LICENSE');
console.log('Pre-1.0 Audit 16 — dependency origins, license review, vendored identity and TLS floor: PASS');
