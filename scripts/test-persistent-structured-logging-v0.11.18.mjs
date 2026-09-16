import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnTypeScript } from './typescript-cli.mjs';
import { pathToFileURL } from 'node:url';

const read = (file) => fs.readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const runtime = read('src/support/runtimeDiagnostics.ts');
const bridge = read('tauri-ui/tauri-runtime.js');
const rust = read('src-tauri/src/main.rs');
const settings = read('src/components/WorkbenchSettings.tsx');
const persistence = read('src/projects/projectPersistence.ts');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(read('src-tauri/Cargo.toml'), new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.') }"`, 'm'));
assert.equal(read('BUILD_ID.txt').trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);
assert.match(read('src/App.tsx'), /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.match(runtime, /REPORT_SCHEMA_VERSION = 8/);
assert.match(runtime, /profile: RELEASE_VALIDATION_PROFILE/);
assert.match(runtime, /persistentLogging: persistentLogSupportSnapshot\(\)/);

// One structured event path feeds both the memory sink and the bounded persistent sink.
assert.match(runtime, /enqueuePersistentRuntimeEvent\(entry\)/);
assert.match(runtime, /PERSISTENT_LOG_QUEUE_LIMIT = 1000/);
assert.match(runtime, /PERSISTENT_LOG_BATCH_SIZE = 50/);
assert.match(runtime, /PERSISTENT_LOG_FLUSH_DELAY_MS = 200/);
assert.match(runtime, /entry\.level === 'warn' \|\| entry\.level === 'error'/);
assert.match(runtime, /if \(readDetailedLogging\(\)\) return true/);
assert.match(runtime, /redactPathFields\(entry, false\)/);
assert.match(runtime, /skipPersistent\?: boolean/);
assert.match(runtime, /support\.persistent-log\.write-failed/);
assert.match(runtime, /flushPersistentRuntimeLog/);
assert.match(runtime, /clearPersistentRuntimeLogs/);

// Tauri bridge exposes only fixed native log operations; the WebView never chooses a filesystem path.
assert.match(bridge, /__HYTALE_PERSISTENT_LOG__/);
assert.match(bridge, /append_persistent_log_batch/);
assert.match(bridge, /persistent_log_status/);
assert.match(bridge, /clear_persistent_logs/);
assert.doesNotMatch(bridge, /persistent.*path.*invoke/i);

// Native sink owns path selection, JSONL serialization, hard limits, rotation and unsafe-target rejection.
assert.match(rust, /app\.path\(\)\.app_log_dir\(\)/);
assert.match(rust, /PERSISTENT_LOG_FILE: &str = "workbench-current\.jsonl"/);
assert.match(rust, /PERSISTENT_LOG_MAX_FILE_BYTES: u64 = 2 \* 1024 \* 1024/);
assert.match(rust, /PERSISTENT_LOG_RETAINED_FILES: usize = 4/);
assert.match(rust, /PERSISTENT_LOG_MAX_BATCH_ENTRIES: usize = 100/);
assert.match(rust, /metadata\.file_type\(\)\.is_symlink\(\)/);
assert.match(rust, /rotate_persistent_logs/);
assert.match(rust, /OpenOptions::new\(\)\.create\(true\)\.append\(true\)/);
assert.match(rust, /serde_json::to_vec\(&entry\)/);
assert.match(rust, /write_all\(b"\\n"\)/);
assert.match(rust, /fn clear_persistent_logs/);

// Settings keep detailed logging as the verbosity control and offer a bounded clear action.
assert.match(settings, /Persistent application log/);
assert.match(settings, /Project paths are always redacted/);
assert.match(settings, /Clear logs/);
assert.match(settings, /clearPersistentRuntimeLogs/);
assert.match(settings, /Detailed logging adds the full structured event stream/);

// Persistent logs must remain outside project-session persistence.
assert.doesNotMatch(persistence, /persistentLog|logRetention|jsonl/i);

// Execute the runtime sink in isolation: default filtering, privacy redaction, detailed mode and clear.
const tmp = path.resolve('.persistent-log-test-build');
fs.rmSync(tmp, { recursive: true, force: true });
const compile = spawnTypeScript([
  'src/support/runtimeDiagnostics.ts', '--target', 'ES2022', '--module', 'ES2022', '--lib', 'ES2022,DOM',
  '--skipLibCheck', '--outDir', tmp,
], { encoding: 'utf8' });
assert.equal(compile.status, 0, compile.stdout + compile.stderr);

const local = new Map();
const persistedBatches = [];
let clearCount = 0;
const nativeStatus = {
  enabled: true,
  format: 'jsonl',
  currentFile: 'workbench-current.jsonl',
  maxFileBytes: 2 * 1024 * 1024,
  retainedFiles: 4,
  currentBytes: 128,
};
globalThis.window = {
  __HYTALE_DESKTOP_BRIDGE__: true,
  __HYTALE_PERSISTENT_LOG__: {
    append: async (entries) => {
      persistedBatches.push(entries);
      return { ...nativeStatus, currentBytes: nativeStatus.currentBytes + JSON.stringify(entries).length };
    },
    status: async () => ({ ...nativeStatus }),
    clear: async () => { clearCount += 1; return { ...nativeStatus, currentBytes: 0 }; },
  },
  localStorage: {
    getItem: (key) => local.get(key) ?? null,
    setItem: (key, value) => local.set(key, value),
    removeItem: (key) => local.delete(key),
  },
};
const built = await import(pathToFileURL(path.join(tmp, 'runtimeDiagnostics.js')).href + `?v=${Date.now()}`);

built.recordRuntimeEvent('graph.camera.pan', { durationMs: 0.4, data: { path: 'Server/Generators/ShouldNotPersist.json' } });
built.recordRuntimeEvent('project.open.completed', { data: { path: 'Server/Generators/Example.json', root: 'C:\\Users\\Tester\\Project' } });
built.recordRuntimeEvent('runtime.window-error', { level: 'error', message: 'Failed at C:\\Users\\Tester\\Project\\Server\\Secret.json', data: { paths: ['Server/Secret.json'] } });
await built.flushPersistentRuntimeLog();
let persisted = persistedBatches.flat();
assert.equal(persisted.some((entry) => entry.event === 'graph.camera.pan'), false, 'high-volume info is not persisted by default');
assert.equal(persisted.some((entry) => entry.event === 'project.open.completed'), true);
assert.equal(persisted.some((entry) => entry.event === 'runtime.window-error'), true);
const serializedDefault = JSON.stringify(persisted);
assert.equal(serializedDefault.includes('Server/Generators/Example.json'), false, 'project-relative path must be redacted in persistent sink');
assert.equal(serializedDefault.includes('C:\\\\Users\\\\Tester'), false, 'absolute path must be redacted in persistent sink');
assert.match(serializedDefault, /project-path-redacted|local-path/);

built.persistDetailedLogging(true);
built.recordRuntimeEvent('graph.camera.pan', { durationMs: 0.3 });
await built.flushPersistentRuntimeLog();
persisted = persistedBatches.flat();
assert.equal(persisted.some((entry) => entry.event === 'graph.camera.pan'), true, 'detailed logging widens the persistent sink');

await built.clearPersistentRuntimeLogs();
assert.equal(clearCount, 1);
const snapshot = built.persistentLogSupportSnapshot();
assert.equal(snapshot.currentBytes, 0);
assert.equal(snapshot.droppedEvents, 0);
assert.equal(snapshot.privacy, 'paths-always-redacted');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('v0.11.18 Persistent Structured Logging source/runtime contract passed');
