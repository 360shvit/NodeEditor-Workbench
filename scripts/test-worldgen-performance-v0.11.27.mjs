import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const cargo = read('src-tauri/Cargo.toml');
const native = read('src-tauri/src/main.rs');
const bridge = read('src/io/desktopBridge.ts');
const store = read('src/store.ts');
const rail = read('src/components/WorkbenchRail.tsx');
const tabs = read('src/components/FileTabs.tsx');
const view = read('src/features/worldgen-performance/WorldgenPerformanceTab.tsx');
const inspector = read('src/features/inspector/InspectorPane.tsx');
const runtime = read('tauri-ui/tauri-runtime.js');
const embedded = read('tauri-ui/app.js');
const embeddedStyles = read('tauri-ui/styles.css');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(cargo, new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.')}"`, 'm'));
assert.equal(read('BUILD_ID.txt').trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);

// Empty transient singleton tab + rail/tabpanel ownership.
assert.match(store, /kind: 'worldgen-performance'/);
assert.match(store, /const id = 'tab:worldgen-performance'/);
assert.match(store, /\[\.\.\.state\.tabs, \{ id, kind: 'worldgen-performance' \}\]/);
assert.match(store, /setWorldgenPerformanceLogSelection/);
assert.match(rail, /label="WorldGen Performance"/);
assert.match(tabs, /kindLabel: 'PERF'/);
assert.match(inspector, /<WorldgenPerformanceTab tab=\{activeTab\} \/>/);

// Polling contract: one minute, no project file-watcher subscription in this view.
assert.match(view, /const REFRESH_INTERVAL_MS = 60_000/);
assert.match(view, /window\.setInterval\(\(\) => void refresh\(\), REFRESH_INTERVAL_MS\)/);
assert.doesNotMatch(view, /subscribeDesktopProjectChanges|FileSystemWatcher/);
assert.match(view, /No log selected/);
assert.match(view, /Refresh now/);
assert.match(view, /No complete WorldGen performance report found/);
assert.match(view, /Access Init/);
assert.match(view, /Data Transfer/);
assert.match(view, /<h3>Memory Usage<\/h3>/);
assert.match(view, /<h3>Context Dependencies<\/h3>/);
assert.match(view, /<h3>Buffer Cache<\/h3>/);
assert.match(view, /report\.dataTransferTimings/);
assert.match(view, /report\.memoryGrids/);
assert.match(view, /report\.contextDependencies/);
assert.match(view, /aria-label="Current sample count"/);
assert.match(view, /Material \(Sum\)/);
assert.match(view, /BiomeStage/);
assert.match(view, /TerrainStage/);
assert.match(view, /PropStage/);
assert.match(view, /TintStage/);
assert.match(view, /worldgen-performance-collapsible/);
assert.doesNotMatch(view, /worldgen-performance-metric-details/);
assert.match(view, /\^Materials\? Section\\b\/i/);
assert.match(view, /materialTimings\.reduce\(\(sum, timing\) => sum \+ timing\.durationMs, 0\)/);

// Narrow native selection + unbounded reverse scan.
assert.match(native, /const WORLDGEN_LOG_SCAN_CHUNK_BYTES: u64 = 1024 \* 1024;/);
assert.match(native, /blocking_pick_file\(\)/);
assert.match(native, /add_filter\("Hytale logs", &\["log", "txt"\]\)/);
assert.match(native, /worldgen_logs: Mutex<HashMap<String, WorldgenLogSource>>/);
assert.match(native, /logs\.clear\(\);/);
assert.match(native, /read_worldgen_performance_log/);
assert.match(native, /read_worldgen_report_at/);
assert.match(native, /WORLDGEN_LOG_SCAN_CHUNK_BYTES/);
assert.doesNotMatch(native, /WORLDGEN_LOG_MAX_TAIL_LINES|WORLDGEN_LOG_MAX_TAIL_BYTES/);
assert.match(native, /Missed\/Total Ratio:/);
assert.match(native, /worldgen_payload_line/);
assert.match(native, /split_once\("\|SERVER - "\)/);
assert.match(native, /parses_client_wrapped_worldgen_performance_report/);
assert.match(native, /ignores_incomplete_newest_worldgen_performance_report/);
assert.match(native, /parses_complete_reference_worldgen_report_block/);
assert.match(native, /worldgen_reverse_scan_has_no_legacy_tail_limit/);
assert.match(native, /worldgen_folder_always_resolves_newest_log_and_ignores_lock_file/);
assert.match(native, /access_initialization_ms/);
assert.match(native, /data_transfer_timings/);
assert.match(native, /memory_grids/);
assert.match(native, /context_dependencies/);
assert.match(native, /parse_worldgen_grid_header/);
assert.match(native, /parse_worldgen_vector/);

// Frontend gets token/basename/result only, never a selected absolute path.
assert.match(bridge, /DesktopWorldgenLogSelection/);
assert.match(bridge, /\/api\/worldgen\/log\/select/);
assert.match(bridge, /\/api\/worldgen\/log\/folder\/select/);
assert.match(bridge, /\/api\/worldgen\/performance/);
assert.doesNotMatch(bridge.match(/export interface DesktopWorldgenLogSelection[\s\S]*?\n\}/)?.[0] ?? '', /path:/);

// Precompiled desktop UI must ship the same feature and bridge routes.
assert.match(runtime, /\/api\/worldgen\/log\/select/);
assert.match(runtime, /\/api\/worldgen\/log\/folder\/select/);
assert.match(runtime, /select_worldgen_log/);
assert.match(runtime, /read_worldgen_performance/);
assert.match(embedded, /WorldGen Performance/);
assert.match(embedded, /worldgen-performance/);
assert.match(embedded, /REFRESH_INTERVAL_MS = 60_000/);
assert.match(embedded, /Access Init/);
assert.match(embedded, /Memory Usage/);
assert.match(embedded, /Context Dependencies/);
assert.match(embedded, /Buffer Cache/);
assert.match(embedded, /Current sample count/i);
assert.match(embedded, /Material \(Sum\)/);
assert.match(embedded, /Content Generation/);
assert.match(embedded, /worldgen-performance-collapsible/);
assert.match(view, /Open log folder/);
assert.match(view, /newest top-level \.log/i);
assert.doesNotMatch(view, /Oldest|Select rule|Log type/);
assert.match(native, /select_worldgen_log_from_folder/);
assert.match(native, /let mut newest: Option<\(std::time::SystemTime, String, PathBuf\)> = None/);
assert.match(native, /if replace \{ newest = Some\(\(modified, sort_name, entry\.path\(\)\)\); \}/);
assert.doesNotMatch(native, /rule == \"oldest\"/);
assert.match(embedded, /Open log folder/);

console.log('v0.11.27 WorldGen Performance monitor contract: PASS');
