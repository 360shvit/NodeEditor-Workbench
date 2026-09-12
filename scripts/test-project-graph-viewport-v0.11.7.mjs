import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
// Historical v0.11.7 camera feature contract, updated to accept the v0.11.12 vector renderer.
const graphView = read('src/features/project-graph/ProjectGraphView.tsx');
const graphSidebar = read('src/features/project-graph/ProjectGraphSidebar.tsx');
const sidebar = read('src/components/WorkbenchSidebar.tsx');
const store = read('src/store.ts');
const persistence = read('src/projects/projectPersistence.ts');
const inspector = read('src/features/inspector/InspectorPane.tsx');
const css = read('src/styles.css');

// Tool-specific settings remain a dedicated contextual sidebar while Explorer/Search stay globally available.
assert.match(store, /export type SidebarView = 'explorer' \| 'search'/);
assert.match(store, /export type ToolSidebarView = 'project-graph' \| 'visual-layout'/);
assert.match(store, /toolSidebarOverride/);
assert.match(store, /tab\?\.kind === 'project-graph'/);
assert.match(sidebar, /activeTab\?\.kind === 'project-graph'/);
assert.match(sidebar, /<ProjectGraphSidebar \/>/);
assert.match(graphSidebar, /Flow root/);
assert.match(graphSidebar, /Density depth/);
assert.match(graphSidebar, /Resources/);
assert.match(graphSidebar, /Fit graph/);
assert.match(graphSidebar, /Reset 100%/);
assert.match(graphSidebar, /linked Instances/);
assert.match(graphSidebar, /WorldStructures/);
assert.match(graphSidebar, /linked Biomes/);
assert.match(graphSidebar, /Density assets/);
assert.match(graphSidebar, /graph\.notes/);

// Camera state is view-only and persisted separately from semantic/layout coordinates.
assert.match(store, /interface ProjectGraphViewportState/);
assert.match(store, /panX: number/);
assert.match(store, /panY: number/);
assert.match(store, /zoom: number/);
assert.match(store, /viewport\?: ProjectGraphViewportState/);
assert.match(persistence, /zoom: Math\.min\(2\.5, Math\.max\(0\.15/);
assert.match(store, /projectGraphFitRequest/);
assert.match(store, /requestProjectGraphFit/);

// Main tab remains one bounded viewport. v0.11.12 moves the camera into a single SVG coordinate space.
assert.match(inspector, /activeTab\?\.kind === 'project-graph' \? 'project-graph-content'/);
assert.match(graphView, /className=\{`project-graph-viewport/);
assert.match(graphView, /className="project-graph-svg"/);
assert.match(graphView, /className="project-graph-camera"/);
assert.match(graphView, /transform=\{`translate\(\$\{camera\.panX\} \$\{camera\.panY\}\) scale\(\$\{camera\.zoom\}\)`\}/);
assert.match(css, /\.inspector-content-scroll\.project-graph-content \{ overflow: hidden;/);
assert.match(css, /\.project-graph-svg[\s\S]*?overflow: hidden;/);
assert.match(css, /\.project-graph-viewport[\s\S]*?overflow: hidden;/);
assert.doesNotMatch(graphView, /project-graph-scroll/);
assert.doesNotMatch(graphView, /className="project-graph-world"/);

// Pan/zoom operate on camera state and never invoke layout/refactor generation.
assert.match(graphView, /onPointerDown=\{onPointerDown\}/);
assert.match(graphView, /onPointerMove=\{onPointerMove\}/);
assert.match(graphView, /onWheel=\{onWheel\}/);
assert.match(graphView, /target\.closest\('\.project-graph-overlay'\)/);
assert.match(graphView, /worldX = \(pointX - current\.panX\) \/ current\.zoom/);
assert.match(graphView, /pointX - worldX \* zoom/);
assert.match(graphView, /MIN_ZOOM = 0\.15/);
assert.match(graphView, /MAX_ZOOM = 2\.5/);
assert.doesNotMatch(graphView, /buildLayoutProposal|stageLayoutProposal|commitProject/);

// Legend and click hint are fixed HTML viewport overlays, not transformed with the SVG graph camera.
const cameraIndex = graphView.indexOf('className="project-graph-camera"');
const legendIndex = graphView.indexOf('project-graph-overlay project-graph-legend');
assert.ok(cameraIndex >= 0 && legendIndex > cameraIndex);
assert.match(graphView, /project-graph-overlay project-graph-hint/);
assert.match(css, /\.project-graph-overlay \{ position: absolute;/);
assert.match(css, /\.project-graph-viewport > \.project-graph-legend[\s\S]*?left: 12px;[\s\S]*?bottom: 12px;/);
assert.match(css, /\.project-graph-hint[\s\S]*?right: 12px;[\s\S]*?bottom: 12px;/);

console.log('v0.11.7 Project Graph Camera Viewport regression checks passed');
