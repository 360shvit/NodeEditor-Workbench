import assert from 'node:assert/strict';
import {
  buildAuthorNormalizeLayoutProposal,
  buildProject,
  snapshotLayoutFile,
} from '../.core-build/index.js';

const settings = {
  strategy: 'author-normalize',
  horizontalGap: 600,
  verticalGap: 70,
  alignmentTolerance: 72,
  includeLive: true,
  floaterMode: 'ignore',
};

function constant(id, value = 1, inputs = []) {
  return { $NodeId: id, Type: 'Constant', ExportAs: '', Skip: false, Value: value, Inputs: inputs };
}
function projectFile(path, root) {
  return buildProject([{ path, text: JSON.stringify(root) }]).files[0];
}

// 1) A proposal-induced group expansion must be rescued before it becomes a
// false whole-file block. The authored section stays distinct from its neighbor.
{
  const ids = {
    root: 'Constant.Density-a1000000-0000-0000-0000-000000000001',
    a: 'Constant.Density-a1000000-0000-0000-0000-000000000002',
    b: 'Constant.Density-a1000000-0000-0000-0000-000000000003',
  };
  const fixture = constant(ids.root, 1, [constant(ids.a, 2), constant(ids.b, 3)]);
  fixture.$NodeEditorMetadata = {
    $Nodes: {
      [ids.root]: { $Position: { $x: 100, $y: 100 }, $Title: 'Root' },
      [ids.a]: { $Position: { $x: 750, $y: 100 }, $Title: 'A' },
      [ids.b]: { $Position: { $x: 750, $y: 500 }, $Title: 'B' },
    },
    $FloatingNodes: [], $Links: [],
    $Groups: [
      { $Position: { $x: 700, $y: 50 }, $width: 900, $height: 900, $name: 'Author section' },
      { $Position: { $x: 1750, $y: 50 }, $width: 600, $height: 900, $name: 'Neighbor' },
    ],
    $Comments: [], $WorkspaceID: 'Density',
  };
  const proposal = buildAuthorNormalizeLayoutProposal([projectFile('HytaleGenerator/Density/GroupAnchorRescue.json', fixture)], settings);
  const metrics = proposal.files[0].metrics;
  assert.equal(proposal.blocked, false, 'safe group-anchor rescue should avoid a false whole-file block');
  assert.equal(metrics.newGroupOverlaps.length, 0, 'no new group relation may remain after rescue');
  assert.equal(metrics.nodeOverlapsAfter, 0, 'rescue must preserve node collision safety');
  assert.equal(metrics.edgeNodeIntersectionsAfter, 0, 'rescue must re-audit flow routing safety');
  assert.ok(metrics.groupAnchorRescues >= 1 && metrics.groupAnchorRescuedNodes >= 1, 'rescue diagnostics must identify affected sections and nodes');
  assert.deepEqual(metrics.blockReasons, [], 'a rescued safe proposal must have no hard block reasons');
}

// 2) Full-bounds containment remains authoritative, but a center-point fallback
// resolves a node that is visually inside a group while slightly crossing its edge.
{
  const rootId = 'Constant.Density-a2000000-0000-0000-0000-000000000001';
  const childId = 'Constant.Density-a2000000-0000-0000-0000-000000000002';
  const fixture = constant(rootId, 1, [constant(childId, 2)]);
  fixture.$NodeEditorMetadata = {
    $Nodes: {
      [rootId]: { $Position: { $x: 100, $y: 100 } },
      [childId]: { $Position: { $x: 650, $y: 300 } },
    },
    $FloatingNodes: [], $Links: [],
    $Groups: [{ $Position: { $x: 700, $y: 200 }, $width: 600, $height: 500, $name: 'Near-edge section' }],
    $Comments: [], $WorkspaceID: 'Density',
  };
  const snapshot = snapshotLayoutFile(projectFile('HytaleGenerator/Density/GroupCenterFallback.json', fixture));
  assert.equal(snapshot.groupResolution.assignedByCenter, 1, 'center fallback should recover the near-edge visual membership');
  assert.equal(snapshot.groupResolution.ambiguous.length, 0);
  assert.equal(snapshot.groups[0].memberNodeIds[0], childId);
}

// 3) Overlapping sibling groups are not guessed. If the same node belongs to
// multiple non-nested candidates, Author Normalize blocks with a precise reason.
{
  const rootId = 'Constant.Density-a3000000-0000-0000-0000-000000000001';
  const childId = 'Constant.Density-a3000000-0000-0000-0000-000000000002';
  const fixture = constant(rootId, 1, [constant(childId, 2)]);
  fixture.$NodeEditorMetadata = {
    $Nodes: {
      [rootId]: { $Position: { $x: 0, $y: 0 } },
      [childId]: { $Position: { $x: 800, $y: 300 } },
    },
    $FloatingNodes: [], $Links: [],
    $Groups: [
      { $Position: { $x: 700, $y: 150 }, $width: 900, $height: 700, $name: 'Sibling A' },
      { $Position: { $x: 750, $y: 150 }, $width: 900, $height: 700, $name: 'Sibling B' },
    ],
    $Comments: [], $WorkspaceID: 'Density',
  };
  const file = projectFile('HytaleGenerator/Density/GroupAmbiguous.json', fixture);
  const snapshot = snapshotLayoutFile(file);
  assert.equal(snapshot.groupResolution.ambiguous.length, 1, 'non-nested group membership must be recorded as ambiguous');
  const proposal = buildAuthorNormalizeLayoutProposal([file], { ...settings, horizontalGap: 10 });
  const metrics = proposal.files[0].metrics;
  assert.equal(proposal.blocked, true);
  assert.equal(metrics.groupMembershipAmbiguous, 1);
  assert.ok(metrics.blockReasons.some((reason) => reason.code === 'ambiguous-group-membership' && reason.count === 1));
}


// 4) Group hierarchy itself is also fail-closed. A child section that is fully
// contained by two overlapping non-nested parents must not be assigned arbitrarily.
{
  const rootId = 'Constant.Density-a3500000-0000-0000-0000-000000000001';
  const fixture = constant(rootId, 1, []);
  fixture.$NodeEditorMetadata = {
    $Nodes: { [rootId]: { $Position: { $x: 0, $y: 0 } } },
    $FloatingNodes: [], $Links: [],
    $Groups: [
      { $Position: { $x: 100, $y: 100 }, $width: 1000, $height: 1000, $name: 'Parent A' },
      { $Position: { $x: 150, $y: 100 }, $width: 1000, $height: 1000, $name: 'Parent B' },
      { $Position: { $x: 300, $y: 300 }, $width: 300, $height: 300, $name: 'Child' },
    ],
    $Comments: [], $WorkspaceID: 'Density',
  };
  const file = projectFile('HytaleGenerator/Density/GroupParentAmbiguous.json', fixture);
  const snapshot = snapshotLayoutFile(file);
  assert.equal(snapshot.groupResolution.ambiguousParents.length, 1, 'non-nested parent hierarchy must be recorded as ambiguous');
  const proposal = buildAuthorNormalizeLayoutProposal([file], { ...settings, horizontalGap: 10 });
  const metrics = proposal.files[0].metrics;
  assert.equal(proposal.blocked, true);
  assert.equal(metrics.groupParentAmbiguous, 1);
  assert.ok(metrics.blockReasons.some((reason) => reason.code === 'ambiguous-group-parentage' && reason.count === 1));
}

// 5) Incomplete group bounds stay fail-closed and now explain why.
{
  const rootId = 'Constant.Density-a4000000-0000-0000-0000-000000000001';
  const fixture = constant(rootId, 1, []);
  fixture.$NodeEditorMetadata = {
    $Nodes: { [rootId]: { $Position: { $x: 0, $y: 0 } } },
    $FloatingNodes: [], $Links: [],
    $Groups: [{ $Position: { $x: 20, $y: 20 }, $height: 300, $name: 'Missing width' }],
    $Comments: [], $WorkspaceID: 'Density',
  };
  const proposal = buildAuthorNormalizeLayoutProposal([projectFile('HytaleGenerator/Density/UnsupportedGroup.json', fixture)], { ...settings, horizontalGap: 10 });
  assert.equal(proposal.blocked, true);
  assert.ok(proposal.files[0].metrics.blockReasons.some((reason) => reason.code === 'unsupported-group-metadata'));
}

console.log('v0.11.22 Author Rebuild reliability regression passed.');
