import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execTypeScript } from './typescript-cli.mjs';

execTypeScript(['-p', 'tsconfig.core.json', '--pretty', 'false'], { stdio: 'inherit' });
const core = await import('../.core-build/index.js');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const config = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const store = fs.readFileSync('src/store.ts', 'utf8');
const persistence = fs.readFileSync('src/projects/projectPersistence.ts', 'utf8');
const graphView = fs.readFileSync('src/features/project-graph/ProjectGraphView.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');

assert.equal(pkg.version, JSON.parse(fs.readFileSync('release-spec/release-contract.json', 'utf8')).version.semver);
assert.equal(config.version, JSON.parse(fs.readFileSync('release-spec/release-contract.json', 'utf8')).version.semver);
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);

// Project Graph semantic/view controls are meaningful project-session choices. v0.11.7 may use local render state for active camera gestures, but persisted authority remains in projectGraphSettings.
assert.match(store, /export interface ProjectGraphViewSettings/);
assert.match(store, /selectedRootPath\?: string/);
assert.match(store, /projectGraphSettings: ProjectGraphViewSettings/);
assert.match(store, /setProjectGraphSettings/);
assert.match(store, /defaultProjectGraphSettings/);
assert.match(store, /viewport\?: ProjectGraphViewportState/);
assert.match(persistence, /viewport:/);
assert.match(graphView, /roots\.find\(\(root\) => root\.path === graphSettings\.selectedRootPath\)/);
assert.match(graphView, /setGraphSettings\(\{ selectedRootPath: nextPath, viewport: undefined \}\)/);
assert.match(graphView, /graphSettings\.densityDepth/);
assert.match(graphView, /graphSettings\.includeResources/);

// Per-project persistence stores only bounded UI context; destructive/edit state remains absent.
assert.match(persistence, /projectGraphSettings\?: ProjectGraphViewSettings/);
assert.match(persistence, /selectedRootPath/);
assert.match(persistence, /densityDepth/);
assert.match(persistence, /includeResources/);
const writer = persistence.slice(persistence.indexOf('export function writeProjectSession'));
assert.match(writer, /projectGraphSettings: cleanProjectGraphSettings\(session\.projectGraphSettings\)/);
assert.doesNotMatch(writer, /changeSet\s*:/i);
assert.doesNotMatch(writer, /changePast\s*:/i);
assert.doesNotMatch(writer, /changeFuture\s*:/i);
assert.doesNotMatch(writer, /editing\s*:/i);

// ProjectFile ids are parse-order based, so rebuild-safe UI ownership must use paths.
const first = core.buildProject([
  { path: 'Server/HytaleGenerator/A.json', text: '{}' },
  { path: 'Server/HytaleGenerator/B.json', text: '{}' },
]);
const reordered = core.buildProject([
  { path: 'Server/HytaleGenerator/B.json', text: '{}' },
  { path: 'Server/HytaleGenerator/A.json', text: '{}' },
]);
const oldA = first.files.find((file) => file.path.endsWith('/A.json'));
const nextA = reordered.files.find((file) => file.path.endsWith('/A.json'));
assert.ok(oldA && nextA);
assert.notEqual(oldA.id, nextA.id, 'parse-order file ids should demonstrate why path remapping is required');
assert.equal(oldA.path, nextA.path);

const commitWorkspaceStart = store.indexOf('commitWorkspace: (workspace) => set((state) => {');
const commitWorkspace = store.slice(commitWorkspaceStart, store.indexOf('applyExternalWorkspaceReload: (workspace, changedPaths) => set((state) => {', commitWorkspaceStart));
assert.match(commitWorkspace, /previousProject/);
assert.match(commitWorkspace, /nextByPath/);
assert.match(commitWorkspace, /normalizedProjectPath/);
assert.match(commitWorkspace, /fileNavigationTab\(workspace, file\)/);
assert.match(commitWorkspace, /remapLocation/);
assert.match(commitWorkspace, /snapshot: tracedSearchProjectNodes\(project, tab\.query, empty\)/);
assert.match(commitWorkspace, /referenceSnapshot\(project, empty/);
assert.match(commitWorkspace, /resourceReferenceSnapshot\(project, empty/);
assert.match(commitWorkspace, /validExplorerWorkspaceId\(project, state\.explorerWorkspace\)/);
assert.match(commitWorkspace, /validProjectWorkspaceId\(project, state\.filters\.workspace\)/);

const externalReloadStart = store.indexOf('applyExternalWorkspaceReload: (workspace, changedPaths) => set((state) => {');
const externalReload = store.slice(externalReloadStart, store.indexOf('clearExternalChangeNotice: () =>', externalReloadStart));
assert.match(externalReload, /validExplorerWorkspaceId\(project, state\.explorerWorkspace\)/);
assert.match(externalReload, /validProjectWorkspaceId\(project, state\.filters\.workspace\)/);

console.log('v0.10.9 State / Reset Audit checks passed');
