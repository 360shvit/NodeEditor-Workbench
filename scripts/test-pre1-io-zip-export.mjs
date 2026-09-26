import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { setImmediate } from 'node:timers/promises';

const read = (file) => fs.readFileSync(file, 'utf8');
const native = read('src-tauri/src/main.rs');
const nativeTests = read('src-tauri/src/io_safety_tests.rs');
const bridge = { hasDesktopBridge: () => false, desktopSaveZip: async () => {} };
const module = { exports: {} };
const emitted = ts.transpileModule(read('src/io/zip.ts'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  reportDiagnostics: true,
});
assert.deepEqual(emitted.diagnostics, []);
vm.runInNewContext(emitted.outputText, {
  exports: module.exports, module, require: (name) => {
    assert.equal(name, './desktopBridge'); return bridge;
  },
  Blob, Uint8Array, Uint32Array, DataView, TextEncoder, Date, Set, Number,
});
const { createZipBlob, downloadBlob, checkedZipLayout } = module.exports;

// Decode records independently and check local/central consistency, exact binary
// payloads and a published CRC32 check vector, rather than snapshotting writer text.
async function decodeStoredZip(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const end = bytes.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50);
  const count = view.getUint16(end + 10, true);
  assert.equal(view.getUint16(end + 8, true), count);
  const centralStart = view.getUint32(end + 16, true);
  assert.equal(centralStart + view.getUint32(end + 12, true), end);
  let cursor = centralStart;
  const files = new Map();
  for (let i = 0; i < count; i += 1) {
    assert.equal(view.getUint32(cursor, true), 0x02014b50);
    assert.equal(view.getUint16(cursor + 8, true), 0x0800);
    assert.equal(view.getUint16(cursor + 10, true), 0);
    const size = view.getUint32(cursor + 24, true);
    const crc = view.getUint32(cursor + 16, true);
    const nameSize = view.getUint16(cursor + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameSize));
    const local = view.getUint32(cursor + 42, true);
    assert.equal(view.getUint32(local, true), 0x04034b50);
    assert.equal(view.getUint32(local + 18, true), size);
    assert.equal(view.getUint32(local + 22, true), size);
    assert.equal(view.getUint32(local + 14, true), crc);
    assert.equal(view.getUint16(local + 26, true), nameSize);
    const contentStart = local + 30 + nameSize;
    assert.ok(contentStart + size <= centralStart);
    assert.equal(new TextDecoder().decode(bytes.subarray(local + 30, contentStart)), name);
    assert.ok(!files.has(name));
    files.set(name, { data: bytes.slice(contentStart, contentStart + size), crc });
    cursor += 46 + nameSize;
  }
  assert.equal(cursor, end);
  return files;
}

const binary = Uint8Array.from({ length: 65536 }, (_, index) => index % 256);
const roundtrip = await createZipBlob([
  { path: 'Density/Größe-键.json', data: '{"Value":42}\n' },
  { path: 'Assets\\texture.bin', data: new Blob([binary]) },
  { path: 'crc.txt', data: '123456789' },
  { path: 'empty.bin', data: new Uint8Array() },
  { path: 'unicode.txt', data: 'aé键🚀\ud800' },
]);
const decoded = await decodeStoredZip(roundtrip);
assert.equal(new TextDecoder().decode(decoded.get('Density/Größe-键.json').data), '{"Value":42}\n');
assert.deepEqual(decoded.get('Assets/texture.bin').data, binary);
assert.equal(decoded.get('crc.txt').crc, 0xcbf43926);
assert.equal(decoded.get('empty.bin').data.length, 0);
assert.deepEqual(decoded.get('unicode.txt').data, new TextEncoder().encode('aé键🚀\ud800'));
assert.equal((await decodeStoredZip(await createZipBlob([]))).size, 0);

for (const path of ['', '..', '../escape', '/absolute', '\\absolute', 'C:/absolute', 'file:stream', 'a/../b', 'a/./b', 'a//b', 'a/', 'nul.txt', 'COM1', 'lpt².json', 'name.', 'name ', 'a\0b']) {
  await assert.rejects(createZipBlob([{ path, data: 'x' }]), /Unsafe ZIP path/, path);
}
for (const paths of [['a/b', 'a\\b'], ['file', 'FILE'], ['a', 'a/b'], ['a/b', 'a']]) {
  await assert.rejects(createZipBlob(paths.map((path) => ({ path, data: '' }))), /Conflicting ZIP path/);
}
await assert.rejects(createZipBlob([{ path: 'é'.repeat(32768), data: '' }]), /filename/);
const longestName = 'é'.repeat(32767) + 'x';
assert.equal((await decodeStoredZip(await createZipBlob([{ path: longestName, data: '' }]))).size, 1);

let materialized = 0;
class OversizedBlob extends Blob {
  constructor(size) { super(); this.claimedSize = size; }
  get size() { return this.claimedSize; }
  async arrayBuffer() { materialized += 1; throw new Error('must reject before materializing oversized input'); }
}
await assert.rejects(createZipBlob([{ path: 'huge.bin', data: new OversizedBlob(0xffffffff) }]), /ZIP32 size/);
await assert.rejects(createZipBlob([{ path: 'huge.bin', data: new OversizedBlob(512 * 1024 * 1024) }]), /512 MiB/);
assert.equal(materialized, 0);
// Exercise aggregate/header boundaries without allocating multi-gigabyte input.
for (const args of [[0xffffffff - 30, 0, 1, 0], [0, 0xffffffff - 46, 1, 0], [0, 0, 1, -1], [0, 0, 1, Number.NaN]]) {
  assert.throws(() => checkedZipLayout(...args), /ZIP32 size/);
}
const archiveLimit = 512 * 1024 * 1024;
const exactLayout = checkedZipLayout(0, 0, 1, archiveLimit - 100);
assert.equal(exactLayout.nextOffset + exactLayout.nextCentralSize + 22, archiveLimit);
assert.throws(() => checkedZipLayout(0, 0, 1, archiveLimit - 99), /512 MiB/);
const firstLayout = checkedZipLayout(0, 0, 1, archiveLimit - 150);
assert.throws(() => checkedZipLayout(firstLayout.nextOffset, firstLayout.nextCentralSize, 1, 1), /512 MiB/);
await assert.rejects(createZipBlob(Array.from({ length: 65535 }, (_, i) => ({ path: `${i}`, data: '' }))), /65,534/);
await assert.rejects(createZipBlob(Array.from({ length: 65536 }, (_, i) => ({ path: `${i}`, data: '' }))), /65,534/);
const maxEntries = await createZipBlob(Array.from({ length: 65534 }, (_, i) => ({ path: `${i}`, data: '' })));
assert.equal((await decodeStoredZip(maxEntries)).size, 65534);

const mutable = new Uint8Array([1, 2, 3]);
async function* changingInputs() {
  yield { path: 'first.bin', data: mutable };
  mutable.fill(9);
  yield { path: 'second.bin', data: 'later' };
}
assert.deepEqual((await decodeStoredZip(await createZipBlob(changingInputs()))).get('first.bin').data, new Uint8Array([1, 2, 3]));

// Native download promise must propagate completion and failure to ChangePanel.
let completeSave;
bridge.hasDesktopBridge = () => true;
bridge.desktopSaveZip = () => new Promise((resolve) => { completeSave = resolve; });
let saveCompleted = false;
const pendingSave = downloadBlob('test.zip', roundtrip).then(() => { saveCompleted = true; });
await setImmediate();
assert.equal(saveCompleted, false);
completeSave();
await pendingSave;
assert.equal(saveCompleted, true);
bridge.desktopSaveZip = async () => { throw new Error('injected native save error'); };
await assert.rejects(downloadBlob('test.zip', roundtrip), /injected native save error/);

// Execute the shipped bridge with a controlled native IPC implementation.
let nativeInvoke;
const calls = [];
const window = {
  __TAURI__: { core: { invoke: async (...args) => { calls.push(args); return nativeInvoke(...args); } } },
  fetch: async () => { throw new Error('unexpected network request'); },
  location: { href: 'http://tauri.localhost/' },
};
class TestURL extends URL {
  static createObjectURL() { return 'blob:fixture'; }
  static revokeObjectURL() {}
}
class Anchor { click() {} }
vm.runInNewContext(read('tauri-ui/tauri-runtime.js'), {
  window, URL: TestURL, Request, Response, Blob, ArrayBuffer, Uint8Array,
  HTMLAnchorElement: Anchor, console: { info() {}, error() {} }, setTimeout,
});
const saveRequest = () => window.fetch('/api/output/save-zip?name=test.zip', { method: 'POST', body: roundtrip });
nativeInvoke = async (command) => { assert.equal(command, 'select_save_target'); return null; };
assert.equal((await saveRequest()).status, 204);
assert.equal(calls.filter(([command]) => command === 'write_registered_binary').length, 0);
nativeInvoke = async (command) => {
  if (command === 'select_save_target') return { token: 'fixture' };
  throw new Error('disk failure for cancelled.zip');
};
assert.equal((await saveRequest()).status, 500, 'disk errors must not be classified as user cancellation');
let completeNativeWrite;
nativeInvoke = async (command, bytes, options) => {
  if (command === 'select_save_target') return { token: 'fixture' };
  assert.equal(command, 'write_registered_binary');
  assert.equal(options.headers['X-Hytale-Save-Token'], 'fixture');
  assert.deepEqual(bytes, new Uint8Array(await roundtrip.arrayBuffer()));
  await new Promise((resolve) => { completeNativeWrite = resolve; });
};
let bridgeCompleted = false;
const bridgeSave = saveRequest().then((response) => { bridgeCompleted = true; return response; });
await setImmediate();
assert.equal(bridgeCompleted, false, 'bridge must await native write completion');
completeNativeWrite();
assert.deepEqual(await (await bridgeSave).json(), { saved: true });
nativeInvoke = async () => ({ unexpected: 'response' });
assert.equal((await window.fetch('/api/project/file?path=asset.bin')).status, 500);
nativeInvoke = async () => [0, 128, 255];
assert.deepEqual(new Uint8Array(await (await window.fetch('/api/project/file?path=asset.bin')).arrayBuffer()), new Uint8Array([0, 128, 255]));

// Keep behavioral native fixtures connected to normal locked Windows CI.
assert.match(native, /#\[cfg\(all\(test, windows\)\)\]\s*mod io_safety_tests;/);
for (const fixture of [
  'track10_read_limits_count_actual_bytes_and_stop_at_limit_plus_one',
  'track10_probe_rejects_growth_after_inventory',
  'track10_inventory_budget_is_checked_during_enumeration',
  'track10_preview_and_semantic_boundaries_are_explicit',
  'track10_output_preflight_rejects_source_aliases_and_invalid_plans',
  'track10_output_preserves_binary_bytes_and_source_hard_links',
  'track10_staging_failure_and_late_collision_preserve_existing_data',
  'track10_large_mixed_project_inventory_is_complete_and_deterministic',
]) assert.ok(nativeTests.includes(`fn ${fixture}(`), `missing native I/O fixture: ${fixture}`);
const exportCommand = native.slice(native.indexOf('async fn export_output('), native.indexOf('\nfn export_project_files('));
assert.match(exportCommand, /apply_transaction_lock\.lock\(\)/);
assert.match(exportCommand, /payload\.allow_overwrite/);
assert.match(read('.github/workflows/build-tauri-windows.yml'), /cargo test --locked/);
assert.match(read('src/components/ChangePanel.tsx'), /await operation\.phaseAsync\('download-dispatch'/);
assert.match(read('src/io/output.ts'), /async function\* zipEntries/);
const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.scripts['test:pre1-io-zip-export'], 'node scripts/test-pre1-io-zip-export.mjs');
console.log('Pre-1.0 Audit 10 — I/O, ZIP, import/export & large-project safety: PASS (ZIP32 boundaries, binary roundtrip, native save outcomes; Windows fixtures registered)');
