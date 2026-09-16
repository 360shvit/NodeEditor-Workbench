import assert from 'node:assert/strict';
import fs from 'node:fs';
import { auditEdgeCorridors } from '../.core-build/index.js';

const read = (path) => fs.readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const cargo = read('src-tauri/Cargo.toml');
const rust = read('src-tauri/src/main.rs');
const edge = read('src/core/layout/edgeCorridor.ts');
const grid = read('src/core/layout/authorGrid.ts');
const tree = read('src/core/layout/treeNormalize.ts');
const windowsSafety = read('Test-Windows-Safety.cmd');

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.match(cargo, new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.')}"`, 'm'));
assert.equal(read('BUILD_ID.txt').trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);
assert.match(read('src/App.tsx'), /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(read('src/support/runtimeDiagnostics.ts'), /RELEASE_DISPLAY_VERSION/);

// Retain the validated v0.11.4 layout acceleration and exact safety machinery.
assert.match(grid, /function incrementalSafetyState/);
assert.match(grid, /incrementalEligible/);
assert.match(grid, /affectedEdgeKeys/);
assert.match(grid, /buildAuditRoutes/);
assert.match(grid, /routeIntersectsRect/);
assert.match(grid, /routesCross/);
assert.match(tree, /prepareXShiftSpacingIndex/);
assert.match(tree, /prepareRoutingBranchClear/);
assert.match(tree, /stationaryRoutes/);
assert.match(edge, /export function buildAuditRoutes/);
assert.match(edge, /export function routesCross/);

// v0.11.5 native contract: normal files take the fast path only after their
// parent directory has been canonicalized/root-contained. Reparse-backed files
// keep canonicalize + containment fallback.
const scanStart = rust.indexOf('fn scan_tree_traced');
const scanEnd = rust.indexOf('\nfn ', scanStart + 10);
const scan = rust.slice(scanStart, scanEnd);
assert.match(scan, /while let Some\(canonical_directory\) = stack\.pop\(\)/);
assert.match(scan, /canonical_directory\.starts_with\(&canonical_root\)/);
assert.match(scan, /metadata_is_reparse_point/);
assert.match(scan, /let inventory_path = if !is_reparse_point/);
assert.match(scan, /file_fast_path_used \+= 1/);
assert.match(scan, /fs::canonicalize\(&path\)/);
assert.match(scan, /canonical_file\.starts_with\(&canonical_root\)/);
assert.match(scan, /fastPathUsed/);
assert.match(scan, /canonicalizationChecks/);
assert.match(scan, /reparsePointEntries/);
assert.match(rust, /project_scan_rejects_external_junction_and_reports_reparse/);
assert.match(rust, /fastPathCandidates/);
assert.match(rust, /fastPathUsed/);
assert.match(rust, /mklink/);
assert.match(rust, /\/J/);
assert.match(windowsSafety, /project_scan_rejects_external_junction_and_reports_reparse/);
assert.match(windowsSafety, /regular files used the fast path/i);

// Existing exact corridor semantics/cache invalidation remain a release gate.
const geometry = { leftPorts: [{ id: 'in', type: 'flow', centerY: 20 }], rightPorts: [{ id: 'out', type: 'flow', centerY: 20 }] };
const target = (id, x, y) => ({ source: { node: { id }, geometry }, rect: { x, y, width: 80, height: 40 } });
const targets = new Map([
  ['a', target('a', 0, 0)],
  ['b', target('b', 300, 0)],
  ['obstacle', target('obstacle', 145, -10)],
]);
const edges = [{ parentId: 'a', childId: 'b', role: 'flow', connectionType: 'flow', parentPortId: 'out' }];
const first = auditEdgeCorridors(targets, edges, 0);
const second = auditEdgeCorridors(targets, edges, 0);
assert.deepEqual(second, first);
targets.get('obstacle').rect.y = 200;
assert.equal(auditEdgeCorridors(targets, edges, 0).edgeNodeIntersections, 0);

console.log('v0.11.5 Performance Optimization III checks passed');
