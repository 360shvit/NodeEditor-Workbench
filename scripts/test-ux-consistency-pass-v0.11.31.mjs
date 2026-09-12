import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const source = read('src/features/worldgen-performance/WorldgenPerformanceTab.tsx');
const styles = read('src/styles.css');
const embeddedStyles = read('tauri-ui/styles.css');
const embedded = read('tauri-ui/app.js');
const app = read('src/App.tsx');
const diagnostics = read('src/support/runtimeDiagnostics.ts');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(read('BUILD_ID.txt').trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(diagnostics, /RELEASE_DISPLAY_VERSION/);
assert.match(diagnostics, /milestone: RELEASE_MILESTONE/);
assert.match(diagnostics, /profile: RELEASE_VALIDATION_PROFILE/);

// WorldGen should read as a compact Workbench tool, not an independent dashboard.
assert.match(source, /import \{ LucideIcon \} from '..\/..\/components\/LucideIcon'/);
assert.match(source, /className="worldgen-performance-report-bar"/);
assert.match(source, /aria-label="Current sample count"/);
for (const label of ['Total', 'Content Generation', 'Access Init', 'BiomeStage', 'TerrainStage', 'PropStage', 'TintStage', 'Data Transfer', 'Material (Sum)']) {
  assert.ok(source.includes(`>${label}<`) || source.includes(`>${label}</span>`), `missing WorldGen KPI ${label}`);
}
assert.match(source, /otherTransferTimings: report\.dataTransferTimings\.filter/);
assert.match(source, /<h3>Material Sections<\/h3>/);
assert.doesNotMatch(source, /worldgen-performance-metric-details/);
assert.doesNotMatch(source, /<details[^>]+open=/, 'WorldGen details must start collapsed');
for (const label of ['Content Generation', 'Material Sections', 'Data Transfer', 'Memory Usage', 'Context Dependencies', 'Buffer Cache', 'Raw Performance Report']) {
  assert.ok(source.includes(`<h3>${label}</h3>`), `missing collapsed WorldGen detail ${label}`);
}

// Split-view responsiveness must follow the pane, not only the global window.
assert.match(styles, /@container workbench-pane \(max-width: 760px\)[\s\S]*\.worldgen-performance-metrics/);
assert.match(styles, /@container workbench-pane \(max-width: 480px\)[\s\S]*\.worldgen-performance-report-bar \{ grid-template-columns: 1fr; \}/);
assert.doesNotMatch(styles, /@media \(max-width: 1100px\)[\s\S]{0,500}worldgen-performance/, 'legacy viewport-only WorldGen reflow must stay removed');

// Shared interaction polish discovered during the UX audit.
assert.match(styles, /button, input, select, textarea \{ font: inherit; \}/);
assert.match(styles, /button:hover:not\(:disabled\)/);
assert.match(styles, /button\.primary:hover:not\(:disabled\)/);
assert.match(styles, /summary:focus-visible/);
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
assert.equal(styles, embeddedStyles, 'packaged desktop CSS must remain byte-identical to source CSS');

// Packaged runtime must carry the same UX structure, not just the TypeScript source.
assert.match(embedded, /worldgen-performance-report-bar/);
assert.match(embedded, /Material Sections/);
assert.match(embedded, /worldgen-performance-details-stack/);
assert.doesNotMatch(embedded, /worldgen-performance-metric-details/);
assert.match(embedded, /exports\.RELEASE_MILESTONE = 'v[^']+'/);
assert.match(embedded, /exports\.RELEASE_MILESTONE_NAME = '[^']+'/);
assert.match(embedded, /exports\.RELEASE_VALIDATION_PROFILE = '[^']+'/);

console.log('v0.11.31 UX consistency pass contract: PASS');
