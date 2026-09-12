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
const graphView = read('src/features/project-graph/ProjectGraphView.tsx');
const graphSidebar = read('src/features/project-graph/ProjectGraphSidebar.tsx');
const css = read('src/styles.css');
const embeddedApp = read('tauri-ui/app.js');
const embeddedCss = read('tauri-ui/styles.css');
const compat = read('tauri-ui/compat-modules.js');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(cargo, new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.')}"`, 'm'));
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(runtime, /RELEASE_DISPLAY_VERSION/);
assert.match(runtime, /REPORT_SCHEMA_VERSION = 8/);
assert.match(buildId, /v0\.11\.[0-9]+-r[0-9]+-[a-z0-9-]+/);
assert.match(pkg.scripts['test:project-graph-vector-viewport'], /test-project-graph-vector-viewport-v0\.11\.12\.mjs/);


// One vector viewport owns camera, edges, nodes and text. No rasterized HTML graph world remains.
assert.match(graphView, /<svg[\s\S]*?className="project-graph-svg"/);
assert.match(graphView, /<g className="project-graph-camera" transform=\{`translate\(\$\{camera\.panX\} \$\{camera\.panY\}\) scale\(\$\{camera\.zoom\}\)`\}>/);
assert.match(graphView, /<g className="project-graph-edges"/);
assert.match(graphView, /<path key=\{edge\.id\} className=\{`project-graph-edge/);
assert.match(graphView, /className=\{`project-graph-node graph-node-/);
assert.match(graphView, /<rect className="project-graph-node-bg"/);
assert.match(graphView, /<text className="project-graph-node-kind"/);
assert.match(graphView, /<text className="project-graph-node-label"/);
assert.match(graphView, /<text className="project-graph-node-subtitle"/);
assert.doesNotMatch(graphView, /className="project-graph-world"/);
assert.doesNotMatch(graphView, /className="project-graph-canvas"/);
assert.doesNotMatch(graphView, /style=\{\{ left: node\.x, top: node\.y/);

// Replacing HTML buttons must preserve click and keyboard activation.
assert.match(graphView, /role="button"/);
assert.match(graphView, /tabIndex=\{0\}/);
assert.match(graphView, /onKeyDown=\{\(event\) => onNodeKeyDown\(event, node\)\}/);
assert.match(graphView, /event\.key !== 'Enter' && event\.key !== ' '/);
assert.match(graphView, /onClick=\{\(\) => openNode\(node\)\}/);

// Vector precision is explicit and edge/node strokes stay crisp under camera scaling.
assert.match(css, /\.project-graph-svg[\s\S]*?shape-rendering: geometricPrecision;[\s\S]*?text-rendering: geometricPrecision;/);
assert.match(css, /\.project-graph-edge[\s\S]*?vector-effect: non-scaling-stroke;/);
assert.match(css, /\.project-graph-node-bg[\s\S]*?vector-effect: non-scaling-stroke;/);
assert.match(css, /\.project-graph-node:focus-visible \.project-graph-node-bg/);
assert.doesNotMatch(css, /\.project-graph-world[\s\S]*?will-change: transform;/);

// Camera telemetry now separates real update-to-commit latency from the user's gesture duration.
assert.match(graphView, /useLayoutEffect\(\(\) =>/);
assert.match(graphView, /graph\.render\.commit/);
assert.match(graphView, /`graph\.camera\.\$\{pending\.reason\}`/);
assert.match(graphView, /graph\.camera\.pan\.gesture-duration/);
assert.match(graphView, /graph\.camera\.zoom\.gesture-duration/);
assert.match(graphView, /CAMERA_UPDATE_THRESHOLDS = \{ noteworthyMs: 16\.7, slowMs: 50, verySlowMs: 120 \}/);
assert.match(graphView, /GESTURE_DURATION_THRESHOLDS = \{ noteworthyMs: 5000, slowMs: 10000, verySlowMs: 30000 \}/);
assert.doesNotMatch(graphView, /recordPerformanceDuration\('graph\.camera\.zoom', performance\.now\(\) - zoomStarted/);
assert.doesNotMatch(graphView, /recordPerformanceDuration\('graph\.camera\.pan', performance\.now\(\) - panStarted/);

// Semantic graph, project state, sidebar and native security/window-state boundaries remain the proven v0.11.11 versions.
assert.equal(hashFile('src/core/projectGraph.ts'), '002bf3e91f9b1ada8db13ee9a8ec84152bcde42c0f9a59e6b6506a245eed1997');
assert.equal(hashFile('src/projects/projectPersistence.ts'), '497c6791bfc3eadc6b664db607f6664235aecf8b25bf5b4985063c46f1b2ed0b');
assert.match(graphSidebar, /Open as new graph/);
assert.match(graphSidebar, /openProjectGraphAsNew/);
const nativeMain = read('src-tauri/src/main.rs');
assert.match(nativeMain, /metadata_is_reparse_point/);
assert.match(nativeMain, /pending_change_count/);
assert.equal(hashFile('src-tauri/capabilities/default.json'), '5042c8d799a75be8248b9877ea2c59aabca2c6fccaed0082c2cdd438c6e345a4');
const tauriRuntime = read('tauri-ui/tauri-runtime.js');
assert.match(tauriRuntime, /app-close-requested/);
assert.match(tauriRuntime, /project-files-changed/);

// The packaged offline frontend must contain the same vector renderer and CSS contract.
assert.match(embeddedApp, /project-graph-svg/);
assert.match(embeddedApp, /graph\.camera\.zoom\.gesture-duration/);
assert.match(embeddedApp, /graph\.render\.commit/);
assert.equal(embeddedCss, css);
assert.match(compat, /function useLayoutEffect\(effect, deps\)/);
assert.match(compat, /useLayoutEffect: useLayoutEffect/);


console.log('v0.11.12 Project Graph Vector Viewport source checks passed');
