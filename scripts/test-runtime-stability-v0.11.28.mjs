import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const appSource = read('src/App.tsx');
const worldgenView = read('src/features/worldgen-performance/WorldgenPerformanceTab.tsx');
const native = read('src-tauri/src/main.rs');
const sourceStyles = read('src/styles.css');
const embeddedStyles = read('tauri-ui/styles.css');
const embedded = read('tauri-ui/app.js');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(read('BUILD_ID.txt').trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);
assert.match(appSource, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(embedded, /exports\.RELEASE_MILESTONE = 'v[^']+'/);
assert.match(embedded, /exports\.RELEASE_MILESTONE_NAME = '[^']+'/);
assert.equal(sourceStyles, embeddedStyles, 'packaged CSS must stay byte-identical to source CSS');

// WorldGen polling hardening: reverse-scan reads, no watcher, no duplicate same-token refresh,
// and stale results from a previous selection cannot replace the current selection.
assert.match(worldgenView, /const REFRESH_INTERVAL_MS = 60_000/);
assert.doesNotMatch(worldgenView, /subscribeDesktopProjectChanges|FileSystemWatcher/);
assert.match(worldgenView, /inFlightSelectionKeyRef\.current === key/);
assert.match(worldgenView, /activeSelectionKeyRef\.current !== key/);
assert.match(worldgenView, /if \(inFlightSelectionKeyRef\.current === key\) inFlightSelectionKeyRef\.current = undefined/);
assert.match(native, /const WORLDGEN_LOG_SCAN_CHUNK_BYTES: u64 = 1024 \* 1024;/);
assert.match(native, /read_worldgen_performance_log/);
assert.doesNotMatch(native, /WORLDGEN_LOG_MAX_TAIL_BYTES|WORLDGEN_LOG_MAX_TAIL_LINES/);
assert.match(native, /ignores_incomplete_newest_worldgen_performance_report/);
assert.match(native, /parses_client_wrapped_worldgen_performance_report/);
assert.match(native, /parses_complete_reference_worldgen_report_block/);
assert.match(native, /worldgen_reverse_scan_has_no_legacy_tail_limit/);
assert.match(native, /worldgen_folder_always_resolves_newest_log_and_ignores_lock_file/);

// Native compile-safety contract: the public Tauri command and its internal tail reader
// must have distinct names. This catches the v0.11.27-r1 Rust E0428 collision.
assert.equal((native.match(/^fn read_worldgen_performance_log\(/gm) ?? []).length, 1);
assert.equal((native.match(/^async fn read_worldgen_performance\(/gm) ?? []).length, 1);
assert.doesNotMatch(native, /^fn read_worldgen_performance\(path: &Path\)/m);

// Reflow matrix remains bounded to the supported scale set and responsive pane breakpoints.
assert.match(sourceStyles, /@container workbench-pane \(max-width: 620px\)/);
assert.match(sourceStyles, /@container workbench-pane \(max-width: 390px\)/);
assert.match(sourceStyles, /@media \(max-width: 980px\)/);

const context = vm.createContext({
  console,
  globalThis: undefined,
  Promise, Set, Map, WeakMap, Object, Array, String, Number, Boolean, Symbol, Error, TypeError, Date, Math, JSON,
  TextEncoder, TextDecoder, Blob, URL, URLSearchParams, DOMException,
  performance: { now: () => 0 },
  MessageChannel: class { constructor() { this.port1 = { onmessage: null }; this.port2 = { postMessage: () => {} }; } },
  setTimeout, clearTimeout,
});
context.globalThis = context;
for (const name of ['amd-loader.js', 'preact-lite.js', 'compat-modules.js', 'app.js']) {
  vm.runInContext(read(`tauri-ui/${name}`), context, { filename: name });
}

const { useWorkbenchStore } = context.require('store');
const appearance = context.require('workbench/appearancePreferences');
const state = () => useWorkbenchStore.getState();

// UI-scale boundary and persistence behavior.
assert.deepEqual([...appearance.WORKBENCH_UI_SCALE_STEPS], [0.8, 0.9, 1, 1.1, 1.25]);
assert.equal(appearance.normalizeWorkbenchUiScale(0.8), 0.8);
assert.equal(appearance.normalizeWorkbenchUiScale(0.90001), 0.9);
assert.equal(appearance.normalizeWorkbenchUiScale(2), 1);
assert.equal(appearance.stepWorkbenchUiScale(0.8, -1), 0.8);
assert.equal(appearance.stepWorkbenchUiScale(1.25, 1), 1.25);
assert.equal(appearance.stepWorkbenchUiScale(1, 1), 1.1);
assert.equal(appearance.stepWorkbenchUiScale(1, -1), 0.9);

const storage = new Map();
context.window = context;
context.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
assert.equal(appearance.persistWorkbenchAppearancePreferences(1.25), true);
assert.equal(appearance.readWorkbenchAppearancePreferences().uiScale, 1.25);
assert.equal(appearance.resetWorkbenchAppearancePreferences().uiScale, 1);
assert.equal(appearance.readWorkbenchAppearancePreferences().uiScale, 1);

function assertStoreInvariants(label) {
  const s = state();
  const ids = s.tabs.map((tab) => tab.id);
  assert.equal(new Set(ids).size, ids.length, `${label}: global tab ids must be unique`);
  const pool = new Set(ids);
  for (const pane of ['primary', 'secondary']) {
    const refs = s.paneTabIds[pane];
    assert.equal(new Set(refs).size, refs.length, `${label}: ${pane} refs must be unique`);
    for (const id of refs) assert.ok(pool.has(id), `${label}: ${pane} ref ${id} must exist globally`);
    const active = s.paneActiveTabIds[pane];
    if (active !== undefined) assert.ok(refs.includes(active), `${label}: ${pane} active tab must be referenced by pane`);
  }
  assert.equal(s.activeTabId, s.paneActiveTabIds[s.activePane], `${label}: legacy activeTabId alias must follow active pane`);
  if (!s.splitViewEnabled) {
    assert.equal(s.activePane, 'primary', `${label}: single view must use primary pane`);
    assert.deepEqual([...s.paneTabIds.secondary], [], `${label}: secondary refs must be empty in single view`);
    assert.equal(s.paneActiveTabIds.secondary, undefined, `${label}: secondary active tab must be empty in single view`);
  }
}

const sourceA = { id: 'tab:source:a', kind: 'source', path: 'A.json' };
const sourceB = { id: 'tab:source:b', kind: 'source', path: 'B.json' };
const sourceC = { id: 'tab:source:c', kind: 'source', path: 'C.json' };

// A deterministic 250-cycle packaged-runtime soak. This repeatedly exercises the state transitions
// that previously caused the highest-risk pane/graph ownership bugs without needing a DOM renderer.
for (let cycle = 0; cycle < 250; cycle += 1) {
  state().closeProject();
  useWorkbenchStore.setState({
    project: {},
    tabs: [sourceA, sourceB, sourceC],
    paneTabIds: { primary: [sourceA.id, sourceB.id, sourceC.id], secondary: [] },
    paneActiveTabIds: { primary: sourceC.id, secondary: undefined },
    activePane: 'primary',
    activeTabId: sourceC.id,
    splitViewEnabled: false,
    projectGraphSerial: 0,
    projectGraphSettings: { selectedRootPath: 'RootA', densityDepth: 8, includeResources: false, viewport: undefined },
    projectGraphFitRequest: 0,
  });
  assertStoreInvariants(`cycle ${cycle} seed`);

  state().setSplitViewEnabled(true);
  assertStoreInvariants(`cycle ${cycle} split`);
  assert.equal(state().activePane, 'secondary');

  // WorldGen is transient: selection belongs to the tab object and must disappear after a full close.
  state().openWorldgenPerformanceTab();
  state().setWorldgenPerformanceLogSelection({ token: `token-${cycle}`, name: `world-${cycle}.log` });
  let perf = state().tabs.find((tab) => tab.kind === 'worldgen-performance');
  assert.equal(perf?.selection?.token, `token-${cycle}`);
  assert.equal(state().tabs.filter((tab) => tab.id === 'tab:worldgen-performance').length, 1);

  // Canonical graph can be shared by both panes but must remain one global object.
  state().setActivePane('primary');
  state().openProjectGraphTab();
  const canonicalId = 'tab:project-graph';
  const canonicalDepth = state().tabs.find((tab) => tab.id === canonicalId)?.settings?.densityDepth;
  state().setActivePane('secondary');
  state().openProjectGraphTab();
  assert.equal(state().tabs.filter((tab) => tab.id === canonicalId).length, 1);
  assert.ok(state().paneTabIds.primary.includes(canonicalId));
  assert.ok(state().paneTabIds.secondary.includes(canonicalId));

  // A non-canonical graph is independently stateful and can be opened/closed repeatedly.
  state().openProjectGraphAsNew(`Root/${cycle}`);
  const transientGraphId = state().activeTabId;
  assert.ok(transientGraphId?.startsWith('tab:project-graph:'));
  state().setProjectGraphSettings({ densityDepth: 4 + (cycle % 9), viewport: { panX: cycle, panY: -cycle, zoom: 1.25 } }, transientGraphId);
  const transientGraph = state().tabs.find((tab) => tab.id === transientGraphId);
  assert.equal(transientGraph?.canonical, false);
  assert.equal(transientGraph?.settings?.selectedRootPath, `Root/${cycle}`);
  assert.equal(state().tabs.find((tab) => tab.id === canonicalId)?.settings?.densityDepth, canonicalDepth, 'non-canonical graph must not mutate canonical graph settings');
  state().closeTab(transientGraphId, 'secondary');
  assert.ok(!state().tabs.some((tab) => tab.id === transientGraphId));

  // Fully close and reopen Performance: old token must not be retained.
  state().closeTab('tab:worldgen-performance', 'secondary');
  assert.ok(!state().tabs.some((tab) => tab.id === 'tab:worldgen-performance'));
  state().openWorldgenPerformanceTab();
  perf = state().tabs.find((tab) => tab.id === 'tab:worldgen-performance');
  assert.equal(perf?.selection, undefined);
  state().closeTab('tab:worldgen-performance', 'secondary');

  // Shared canonical close is pane-local first, then collapse merges only still-referenced global tabs.
  state().closeTab(canonicalId, 'secondary');
  assert.ok(state().paneTabIds.primary.includes(canonicalId));
  assert.ok(!state().paneTabIds.secondary.includes(canonicalId));
  assert.equal(state().tabs.filter((tab) => tab.id === canonicalId).length, 1);

  state().setSplitViewEnabled(false, cycle % 2 === 0 ? 'primary' : 'secondary');
  assertStoreInvariants(`cycle ${cycle} collapse`);

  state().closeProject();
  assert.equal(state().project, undefined);
  assert.equal(state().workspace, undefined);
  assert.equal(state().tabs.length, 0);
  assert.deepEqual([...state().paneTabIds.primary], []);
  assert.deepEqual([...state().paneTabIds.secondary], []);
  assert.equal(state().splitViewEnabled, false);
  assert.equal(state().projectGraphSerial, 0);
}

console.log('v0.11.31 runtime/stability packaged-bundle soak contract: PASS (250 cycles)');
