import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const cargo = read('src-tauri/Cargo.toml');
const runtime = read('src/support/runtimeDiagnostics.ts');
const embedded = read('tauri-ui/app.js');
const readme = read('README.md');
const product = read('docs/PRODUCT_GUIDE.md');
const architecture = read('docs/ARCHITECTURE.md');
const limits = read('docs/KNOWN_LIMITS.md');
const build = read('docs/BUILD_PLAN.md');
const validation = read('docs/VALIDATION.md');
const native = read('src-tauri/src/main.rs');
const worldgen = read('src/features/worldgen-performance/WorldgenPerformanceTab.tsx');
const appearance = read('src/workbench/appearancePreferences.ts');
const layout = read('src/workbench/workbenchLayoutPreferences.ts');
const contract = JSON.parse(read('release-spec/release-contract.json'));
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

assert.equal(pkg.version, contract.version.semver);
assert.equal(tauri.version, contract.version.semver);
assert.match(cargo, new RegExp(`^version = \"${escape(contract.version.semver)}\"`, 'm'));
assert.equal(read('BUILD_ID.txt').trim(), contract.version.buildId);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.match(runtime, /milestone: RELEASE_MILESTONE/);
assert.match(runtime, /profile: RELEASE_VALIDATION_PROFILE/);
assert.match(embedded, new RegExp(`exports\\.RELEASE_DISPLAY_VERSION = '${escape(contract.version.display)}'`));
assert.match(embedded, new RegExp(escape(contract.validation.profile)));
assert.match(embedded, new RegExp(`exports\\.RELEASE_MILESTONE = '${escape(contract.version.milestone)}'`));
assert.match(embedded, new RegExp(`exports\\.RELEASE_MILESTONE_NAME = '${escape(contract.version.milestoneName)}'`));

for (const doc of ['docs/PRODUCT_GUIDE.md','docs/ARCHITECTURE.md','docs/KNOWN_LIMITS.md','docs/BUILD_PLAN.md','docs/VALIDATION.md','docs/CHANGELOG.md']) {
  assert.match(readme, new RegExp(doc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(fs.existsSync(doc), `${doc} must exist`);
}
assert.equal(fs.existsSync('docs/history'), false, 'internal engineering history must not be public');
assert.match(build, /Document type:\*\* living documentation/);
assert.match(validation, /Document type:\*\* living documentation/);
assert.doesNotMatch(validation, /# Validation — v0\.4/);

// Selected current behavior/limit contracts must agree with code.
for (const [source, sourcePattern, docPattern] of [
  [native, /const MAX_PROJECT_ENTRIES: usize = 100_000;/, /100,000 files\/directories/],
  [native, /const MAX_JSON_FILES: usize = 50_000;/, /50,000/],
  [native, /const MAX_JSON_FILE_BYTES: u64 = 64 \* 1024 \* 1024;/, /64 MiB/],
  [native, /const MAX_TOTAL_JSON_BYTES: u64 = 512 \* 1024 \* 1024;/, /512 MiB/],
  [native, /const MAX_JSON_NESTING: usize = 512;/, /512/],
  [native, /const MAX_APPLY_FILES: usize = 10_000;/, /10,000/],
  [native, /const WORLDGEN_LOG_SCAN_CHUNK_BYTES: u64 = 1024 \* 1024;/, /1 MiB chunks/],
]) {
  assert.match(source, sourcePattern);
  assert.match(limits, docPattern);
}
assert.match(native, /fs::read_dir\(folder\)/);
assert.match(native, /modified > \*best_modified/);
assert.match(product, /lexicographically newest regular top-level `\.log` filename/);
assert.match(product, /There is no artificial total-byte\/line scan cutoff/);
assert.match(worldgen, /REFRESH_INTERVAL_MS = 60_000/);
assert.match(product, /every 60 seconds/);
assert.match(appearance, /WORKBENCH_UI_SCALE_STEPS = \[0\.8, 0\.9, 1, 1\.1, 1\.25\]/);
assert.match(limits, /80, 90, 100, 110, 125%/);
assert.match(layout, /WORKBENCH_SIDEBAR_MIN_WIDTH = 220/);
assert.match(layout, /WORKBENCH_SIDEBAR_MAX_WIDTH = 520/);
assert.match(layout, /WORKBENCH_SPLIT_MIN_RATIO = 0\.25/);
assert.match(layout, /WORKBENCH_SPLIT_MAX_RATIO = 0\.75/);
assert.match(limits, /220–520 px/);
assert.match(limits, /25–75%/);
assert.match(architecture, /frontendDist/);
assert.match(architecture, /recovery journal/);
assert.match(product, /Export Changes ZIP/);
assert.match(product, /Apply to Opened Project/);

console.log('v0.11.32 documentation-to-code contract: PASS');
