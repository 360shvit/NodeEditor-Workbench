import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const runtime = read('src/support/runtimeDiagnostics.ts');
const settings = read('src/components/WorkbenchSettings.tsx');
const boundary = read('src/components/AppErrorBoundary.tsx');
const app = read('src/App.tsx');
const store = read('src/store.ts');
const rust = read('src-tauri/src/main.rs');
const tauriRuntime = read('tauri-ui/tauri-runtime.js');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(read('src-tauri/Cargo.toml'), new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.') }"`, 'm'));
assert.equal(read('BUILD_ID.txt').trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);

assert.match(runtime, /const MAX_EVENTS = 500/);
assert.match(runtime, /DETAILED_LOGGING_KEY/);
assert.match(runtime, /projectContentsIncluded: false/);
assert.match(runtime, /automaticUpload: false/);
assert.match(runtime, /includeProjectPaths/);
assert.match(runtime, /<project-path-redacted>/);
assert.match(read('src/support/diagnosticPrivacy.ts'), /scrubAbsolutePaths/);
assert.match(runtime, /runtime\.unhandled-rejection/);
assert.match(runtime, /runtime\.window-error/);
assert.doesNotMatch(runtime, /fetch\(/, 'support module must not upload reports');

assert.match(settings, /Detailed logging/);
assert.match(settings, /Include project-relative paths/);
assert.match(settings, /useState\(false\)/, 'project paths must default off');
assert.match(settings, /Save diagnostic JSON/);
assert.match(settings, /Copy report/);
assert.match(settings, /never uploaded automatically/i);

assert.match(boundary, /Save diagnostic report/);
assert.match(boundary, /runtime\.react-error-boundary/);
assert.match(app, /project\.watcher\.reload/);
assert.match(store, /project\.model\.build/);
assert.match(store, /support\.detailed-logging\.changed/);

assert.match(rust, /select_support_report_target/);
assert.match(rust, /Diagnostic report target must use the \.json extension/);
assert.match(rust, /select_save_target/);
assert.match(rust, /ZIP export target must use the \.zip extension/);
assert.match(tauriRuntime, /select_support_report_target/);
assert.match(tauriRuntime, /endsWith\('\.json'\)/);


console.log('v0.11.0 Diagnostics & Support Infrastructure checks passed');
