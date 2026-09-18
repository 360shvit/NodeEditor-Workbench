import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const hashFile = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const cargo = read('src-tauri/Cargo.toml');
const app = read('src/App.tsx');
const runtime = read('src/support/runtimeDiagnostics.ts');
const buildId = read('BUILD_ID.txt');
const store = read('src/store.ts');
const visibility = read('src/features/inspector/visibility.ts');
const filterBar = read('src/components/FilterBar.tsx');
const persistence = read('src/projects/projectPersistence.ts');
const embeddedApp = read('tauri-ui/app.js');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(cargo, new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.')}"`, 'm'));
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.match(runtime, /REPORT_SCHEMA_VERSION = 8/);
assert.equal(buildId.trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);
assert.match(pkg.scripts['test:unified-filter-all'], /test-unified-filter-all-v0\.11\.13\.mjs/);

// Additive state only: explicit values remain authoritative when All Values is off.
assert.match(store, /allValues: boolean/);
assert.match(store, /allValues: false/);
assert.match(store, /export const allInspectorFilters: InspectorFilters/);
assert.match(store, /imports: true,[\s\S]*?exports: true,[\s\S]*?seeds: true,[\s\S]*?allValues: true,[\s\S]*?live: true,[\s\S]*?floating: true,[\s\S]*?workspace: 'all'/);
assert.match(store, /export function filtersAreAll\(filters: InspectorFilters\)/);
assert.match(store, /filters\.allValues/);
assert.match(store, /if \(filters\.allValues === true\) next\.valueFields = \[\]/);
assert.match(store, /setValueFields:[\s\S]*?allValues: false/);
assert.match(store, /toggleValueField:[\s\S]*?allValues: false,[\s\S]*?state\.filters\.allValues[\s\S]*?\? \[field\]/);

// Visibility applies All Values without altering semantic categories or query matching ownership.
assert.match(visibility, /field\.category === 'import'\) return filters\.imports/);
assert.match(visibility, /field\.category === 'export'\) return filters\.exports/);
assert.match(visibility, /field\.category === 'seed'\) return filters\.seeds/);
assert.match(visibility, /field\.category === 'property'\) return filters\.allValues \|\| filters\.valueFields\.includes\(field\.key\)/);
assert.match(visibility, /filters\.workspace !== 'all'/);
assert.match(visibility, /searchMatchVisible/);

// One global ALL plus dimension-local no-restriction choices.
assert.match(filterBar, /label="ALL" active=\{allActive\}/);
assert.match(filterBar, /allActive \? resetFilters\(\) : setFilters\(allInspectorFilters\)/);
assert.match(filterBar, /All semantic/);
assert.match(filterBar, /imports: true, exports: true, seeds: true/);
assert.match(filterBar, /All locations/);
assert.match(filterBar, /live: true, floating: true/);
assert.match(filterBar, /All workspaces/);
assert.match(filterBar, /All values/);
assert.match(filterBar, /allValues: true, valueFields: \[\]/);
assert.match(filterBar, /All value fields visible/);
assert.doesNotMatch(filterBar, /second filter|queryFilters|searchFilters/i);

// Existing session v1 remains compatible: restored filters merge over new defaults.
assert.match(store, /restoredFilters = session\?\.filters[\s\S]*?\{ \.\.\.defaultFilters, \.\.\.session\.filters/);
assert.match(persistence, /version: 1/);
assert.match(persistence, /filters: InspectorFilters/);
assert.match(persistence, /filters: cleanInspectorFilters\(session\.filters\)/);

// v0.11.14 must not disturb graph/native/security/write authority while changing filters.
assert.match(read('src/features/project-graph/ProjectGraphView.tsx'), /project-graph-camera/);
assert.match(read('src/features/project-graph/ProjectGraphSidebar.tsx'), /Open as new graph/);
assert.equal(hashFile('src/core/projectGraph.ts'), '002bf3e91f9b1ada8db13ee9a8ec84152bcde42c0f9a59e6b6506a245eed1997');
assert.equal(hashFile('src/projects/projectPersistence.ts'), '7e6df70a194355682a7eab6bea8c1a9f05a38d3c2119bf6fc32fe17476ecb31f');
const nativeMain = read('src-tauri/src/main.rs');
assert.match(nativeMain, /metadata_is_reparse_point/);
assert.match(nativeMain, /pending_change_count/);
assert.equal(hashFile('src-tauri/capabilities/default.json'), '5042c8d799a75be8248b9877ea2c59aabca2c6fccaed0082c2cdd438c6e345a4');
const tauriRuntime = read('tauri-ui/tauri-runtime.js');
assert.match(tauriRuntime, /app-close-requested/);
assert.match(tauriRuntime, /project-files-changed/);

// Packaged frontend mirrors the source contract.
for (const marker of ['All semantic', 'All locations', 'All workspaces', 'All values', 'All value fields visible']) {
  assert.match(embeddedApp, new RegExp(marker));
}
assert.match(embeddedApp, /allValues/);
assert.match(embeddedApp, /Split Workview/);


console.log('v0.11.13 Unified Filter / ALL source checks passed');
