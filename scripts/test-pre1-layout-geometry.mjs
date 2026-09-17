import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAX_EDITOR_LAYOUT_SCALAR,
  MAX_LAYOUT_SETTING,
  applyChangeSet,
  buildEditorMetadataForFile,
  buildLayoutProposal,
  buildNormalizeLayoutProposal,
  buildProject,
  emptyChangeSet,
  isLayoutBlocked,
  layoutBlockReasons,
  overlapPairs,
  pairKey,
  rectContains,
  rectsOverlap,
  stageLayoutProposal,
  unionRects,
  validateLayoutEngineSettings,
} from '../.core-build/index.js';

function settings(strategy, overrides = {}) {
  return {
    strategy,
    horizontalGap: 50,
    verticalGap: 50,
    alignmentTolerance: 100,
    includeLive: true,
    floaterMode: 'ignore',
    ...(strategy === 'dag-rebuild' ? { dagBranchDirection: 'auto' } : {}),
    ...overrides,
  };
}

function canonicalProposal(proposal) {
  return { ...proposal, createdAt: 0 };
}

function targetMap(proposal, field) {
  return new Map(proposal.patches
    .filter((patch) => patch.entityKind === 'node' && patch.field === field)
    .map((patch) => [patch.entityId, patch.newValue]));
}

const rootId = 'Sum.Density-11111111-1111-4111-8111-111111111111';
const leftId = 'Constant.Density-22222222-2222-4222-8222-222222222222';
const branchId = 'Sum.Density-33333333-3333-4333-8333-333333333333';
const leafId = 'Constant.Density-44444444-4444-4444-8444-444444444444';
const fixture = {
  $NodeId: rootId,
  Type: 'Sum',
  Inputs: [
    { $NodeId: leftId, Type: 'Constant', Value: 1 },
    {
      $NodeId: branchId,
      Type: 'Sum',
      Inputs: [{ $NodeId: leafId, Type: 'Constant', Value: 2 }],
    },
  ],
  $NodeEditorMetadata: {
    $Nodes: {
      [rootId]: { $Position: { $x: 120, $y: 80 } },
      [leftId]: { $Position: { $x: 760, $y: 80 } },
      [branchId]: { $Position: { $x: 760, $y: 620 } },
      [leafId]: { $Position: { $x: 1460, $y: 620 } },
    },
    $Groups: [],
    $Comments: [],
  },
};
const project = buildProject([{ path: 'Server/HytaleGenerator/Audit/Layout.json', text: JSON.stringify(fixture, null, 2) }]);
const file = project.files[0];
assert.ok(file && file.nodes.length === 4, 'synthetic layout fixture should expose four live nodes');

// Primitive geometry invariants: containment, overlap edge semantics, canonical
// pair keys, negative coordinates and unions stay predictable.
assert.equal(rectContains({ x: 0, y: 0, width: 100, height: 100 }, { x: 10, y: 10, width: 20, height: 20 }), true);
assert.equal(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 }), false, 'touching edges are not overlaps');
assert.equal(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 9, y: 0, width: 10, height: 10 }), true);
assert.deepEqual(unionRects([{ x: -10, y: -20, width: 10, height: 20 }, { x: 5, y: 5, width: 5, height: 5 }]), { x: -10, y: -20, width: 20, height: 30 });
assert.equal(pairKey('b', 'a'), pairKey('a', 'b'));
assert.deepEqual(overlapPairs([
  { id: 'a', rect: { x: 0, y: 0, width: 10, height: 10 } },
  { id: 'b', rect: { x: 5, y: 5, width: 10, height: 10 } },
  { id: 'c', rect: { x: 30, y: 30, width: 5, height: 5 } },
]), [['a', 'b']]);

// Stable block-reason semantics are part of the staging safety contract.
const reasons = layoutBlockReasons({ missingRoot: true, nodeOverlaps: 2, blockOnFloaterOverlaps: true, floaterOverlaps: 1 });
assert.ok(reasons.some((reason) => reason.code === 'missing-root' && reason.count === 1));
assert.ok(reasons.some((reason) => reason.code === 'node-overlap' && reason.count === 2));
assert.ok(reasons.some((reason) => reason.code === 'floater-overlap' && reason.count === 1));
assert.equal(isLayoutBlocked({}), false);
assert.equal(isLayoutBlocked({ nodeOverlaps: 1 }), true);

// All three strategies must be deterministic apart from the intentional
// createdAt envelope field, unblocked on the representative fixture, and emit
// only safe finite numeric patches.
for (const strategy of ['normalize', 'author-normalize', 'dag-rebuild']) {
  const first = buildLayoutProposal([file], settings(strategy));
  const second = buildLayoutProposal([file], settings(strategy));
  assert.equal(first.blocked, false, `${strategy} should be stageable on the synthetic fixture`);
  assert.deepEqual(canonicalProposal(first), canonicalProposal(second), `${strategy} must be deterministic`);
  assert.ok(first.patches.length > 0, `${strategy} should produce a non-empty proposal`);
  for (const patch of first.patches) {
    for (const value of [patch.oldValue, patch.newValue]) {
      if (typeof value !== 'number') continue;
      assert.ok(Number.isFinite(value), `${strategy} emitted a non-finite patch`);
      assert.ok(Math.abs(value) <= MAX_EDITOR_LAYOUT_SCALAR, `${strategy} emitted an out-of-range patch`);
    }
  }
  assert.ok(first.files.every((entry) => entry.metrics.nodeOverlapsAfter === 0), `${strategy} should leave no live-node overlaps`);
}

// Normalize must persist the chosen root at the origin through staging/apply.
const normalize = buildNormalizeLayoutProposal([file], settings('normalize'));
const staged = stageLayoutProposal(emptyChangeSet(), normalize);
const preview = applyChangeSet(project, staged).project;
const previewMeta = buildEditorMetadataForFile(preview.files[0]);
assert.deepEqual(previewMeta.nodes.get(rootId)?.position && {
  x: previewMeta.nodes.get(rootId).position.x,
  y: previewMeta.nodes.get(rootId).position.y,
}, { x: 0, y: 0 });

// DAG spacing controls must reach actual node targets rather than only labels.
const dagCompact = buildLayoutProposal([file], settings('dag-rebuild', { horizontalGap: 20 }));
const dagWide = buildLayoutProposal([file], settings('dag-rebuild', { horizontalGap: 200 }));
const compactX = targetMap(dagCompact, '$Position.$x');
const wideX = targetMap(dagWide, '$Position.$x');
assert.ok([...new Set([...compactX.keys(), ...wideX.keys()])].some((id) => compactX.get(id) !== wideX.get(id)), 'DAG horizontalGap must change at least one X target');

// Settings are a core trust boundary: callers cannot bypass the UI with NaN,
// Infinity, negatives or absurdly large finite values.
assert.doesNotThrow(() => validateLayoutEngineSettings(settings('author-normalize', { horizontalGap: MAX_LAYOUT_SETTING })));
assert.throws(() => validateLayoutEngineSettings(settings('author-normalize', { horizontalGap: -1 })), /horizontalGap/);
assert.throws(() => validateLayoutEngineSettings(settings('author-normalize', { verticalGap: Number.POSITIVE_INFINITY })), /verticalGap/);
assert.throws(() => validateLayoutEngineSettings(settings('author-normalize', { alignmentTolerance: MAX_LAYOUT_SETTING + 1 })), /alignmentTolerance/);
assert.throws(() => validateLayoutEngineSettings({ ...settings('author-normalize'), floaterMode: 'invalid' }), /floater mode/);

// Persisted metadata has the same boundary. Oversized coordinates are treated
// as unsupported rather than entering geometry arithmetic.
const oversizedId = 'Constant.Density-55555555-5555-4555-8555-555555555555';
const oversizedRaw = {
  $NodeId: oversizedId,
  Type: 'Constant',
  Value: 1,
  $NodeEditorMetadata: { $Nodes: { [oversizedId]: { $Position: { $x: MAX_EDITOR_LAYOUT_SCALAR + 1, $y: 0 } } } },
};
const oversizedProject = buildProject([{ path: 'oversized.json', text: JSON.stringify(oversizedRaw) }]);
assert.equal(buildEditorMetadataForFile(oversizedProject.files[0]).nodes.get(oversizedId)?.position, undefined);
assert.equal(buildNormalizeLayoutProposal(oversizedProject.files, settings('normalize')).blocked, true, 'a file with no safe positioned root must stay blocked');

// Even individually safe endpoint coordinates can produce an unsafe translated
// result. The proposal envelope must fail closed before such a patch can stage.
const farRoot = 'Sum.Density-66666666-6666-4666-8666-666666666666';
const farChild = 'Constant.Density-77777777-7777-4777-8777-777777777777';
const farFixture = {
  $NodeId: farRoot,
  Type: 'Sum',
  Inputs: [{ $NodeId: farChild, Type: 'Constant', Value: 1 }],
  $NodeEditorMetadata: {
    $Nodes: {
      [farRoot]: { $Position: { $x: MAX_EDITOR_LAYOUT_SCALAR, $y: 0 } },
      [farChild]: { $Position: { $x: -MAX_EDITOR_LAYOUT_SCALAR, $y: 0 } },
    },
  },
};
const farProject = buildProject([{ path: 'far.json', text: JSON.stringify(farFixture) }]);
assert.throws(() => buildNormalizeLayoutProposal(farProject.files, settings('normalize')), /outside the safe editor range/);

// The historical v0.7.2 real-project golden remains preserved as manual
// evidence, while this suite is self-contained and therefore suitable for CI.
const baseline = JSON.parse(fs.readFileSync(new URL('./layout-baseline-v0.7.2.json', import.meta.url), 'utf8'));
assert.equal(Object.keys(baseline.fixtures).length, 2);
assert.equal(baseline.cases.length, 8);
const baselineRunner = fs.readFileSync(new URL('./compare-layout-baseline.mjs', import.meta.url), 'utf8');
assert.match(baselineRunner, /<fixture-root>/);

const sidebarSource = fs.readFileSync(new URL('../src/features/visual/VisualLayoutSidebar.tsx', import.meta.url), 'utf8');
assert.match(sidebarSource, /MAX_LAYOUT_SETTING/);
assert.equal((sidebarSource.match(/max=\{MAX_LAYOUT_SETTING\}/g) ?? []).length, 3, 'all three numeric layout controls must expose the core ceiling');

console.log('Pre-1.0 Audit 02 — Layout/Geometry: PASS');
