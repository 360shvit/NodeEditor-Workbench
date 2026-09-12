import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { buildProject, emptyChangeSet, jsonPathKey, stageFieldChange, renameSymbol, applyChangeSet, symbolKey, searchProject, buildProjectTree, workspaceFromSegment, compareDiagnostics, findMatchingFields, searchProjectNodes, parseSearchQuery, getScopedFieldStats, getFieldStatsForNodeRefs, getAdaptiveQuickFieldStats, defaultZipName, normalizeZipName, outputPaths, targetSupportsScope, buildEditorMetadataForFile, resolveNodeGeometry, summarizeGeometry, HYTALE_GENERATOR_JAVA_VISUAL_CATALOG_INFO, buildNormalizeLayoutProposal, buildAuthorNormalizeLayoutProposal, buildDagRebuildLayoutProposal, buildLayoutProposal, stageLayoutProposal, readLayoutGraphV2, snapshotLayoutFile, normalizeAuthorGrid, connectionPlaneTolerance, visualRowTolerance, authorGuideClusterTolerance, authorGuideShiftLimit, authorRowShiftLimit, pixelAlignmentTolerance, pixelAlignmentShiftLimit, dagSidePlacementReason, isLayoutBlocked, buildProjectGraph, projectGraphRoots, detectWorkspace, workspaceFromMetadata, workspaceFromNativeId } from '../.core-build/index.js';


assert.equal(defaultZipName('Ps-Ancient-Worlds', 'full'), 'Ps-Ancient-Worlds-Refactor.zip');
assert.equal(defaultZipName('Ps-Ancient-Worlds', 'changed'), 'Ps-Ancient-Worlds-Changed-Files.zip');
assert.equal(normalizeZipName('Custom Export', 'fallback.zip'), 'Custom Export.zip');
assert.deepEqual(outputPaths(['A.json', 'sub/B.json', 'asset.png'], ['sub/B.json'], 'full'), ['A.json', 'asset.png', 'sub/B.json']);
assert.deepEqual(outputPaths(['A.json', 'sub/B.json', 'asset.png'], ['sub/B.json'], 'changed'), ['sub/B.json']);
assert.equal(targetSupportsScope('original'), false, 'direct apply should never rewrite the unchanged project');
assert.equal(targetSupportsScope('zip'), true);


// Acceptance hardening: JSON path identity must preserve path structure and segment types.
assert.notEqual(jsonPathKey(['a.b', 'Value']), jsonPathKey(['a', 'b', 'Value']), 'literal dotted key must not collide with nested path');
assert.notEqual(jsonPathKey(['items', '0']), jsonPathKey(['items', 0]), 'object key "0" must not collide with array index 0');
let pathCollisionChanges = emptyChangeSet();
pathCollisionChanges = stageFieldChange(pathCollisionChanges, {
  fileId: 'file:path-collision', filePath: 'PathCollision.json', nodeId: 'node:path-collision', field: 'Value',
  jsonPath: ['a.b', 'Value'], oldValue: 1, newValue: 2, location: 'live',
});
pathCollisionChanges = stageFieldChange(pathCollisionChanges, {
  fileId: 'file:path-collision', filePath: 'PathCollision.json', nodeId: 'node:path-collision', field: 'Value',
  jsonPath: ['a', 'b', 'Value'], oldValue: 3, newValue: 4, location: 'live',
});
assert.equal(pathCollisionChanges.changes.length, 2, 'structurally different JSON paths must coexist in one ChangeSet');
assert.notEqual(pathCollisionChanges.changes[0].id, pathCollisionChanges.changes[1].id, 'change ids must be collision-free');
const fallbackNodeProject = buildProject([{
  path: 'PathIdentity.json',
  text: JSON.stringify({
    'a.b': { Type: 'Constant', Inputs: [], Value: 1 },
    a: { b: { Type: 'Constant', Inputs: [], Value: 2 } },
  }),
}]);
assert.equal(fallbackNodeProject.files[0].nodes.length, 2, 'fallback node discovery should keep both structurally distinct paths');
assert.equal(new Set(fallbackNodeProject.files[0].nodes.map((node) => node.id)).size, 2, 'fallback node ids must be collision-free');


const cleanupSettings = { strategy: 'author-normalize', horizontalGap: 10, verticalGap: 10, alignmentTolerance: 100, includeLive: true, floaterMode: 'ignore' };
assert.equal(connectionPlaneTolerance(cleanupSettings), 100, 'connection-plane tolerance should stay explicit');
assert.equal(visualRowTolerance(cleanupSettings), 24, 'visual-row tolerance should keep the v0.7.2 capped formula');
assert.equal(authorGuideClusterTolerance(cleanupSettings), 28, 'Author Grid cluster tolerance should keep the v0.7.2 capped formula');
assert.equal(authorGuideShiftLimit(cleanupSettings), 140);
assert.equal(authorRowShiftLimit(cleanupSettings), 72);
assert.equal(pixelAlignmentTolerance(cleanupSettings), 45);
assert.equal(pixelAlignmentShiftLimit(cleanupSettings), 64);
assert.equal(dagSidePlacementReason('type', true, 'up'), 'dag-side-density-up');
assert.equal(dagSidePlacementReason('type', false, 'down'), 'dag-side-other-down');
assert.equal(dagSidePlacementReason('auto', false, 'up'), 'dag-side-auto-up');
assert.equal(isLayoutBlocked({ missingRoot: false, nodeOverlaps: 0, flowEdgeNodeIntersections: 0 }), false);
assert.equal(isLayoutBlocked({ missingRoot: false, nodeOverlaps: 1 }), true);
assert.equal(isLayoutBlocked({ missingRoot: false, newGroupOverlaps: 1 }), true, 'an unresolved new group overlap remains a hard safety block');


assert.equal(HYTALE_GENERATOR_JAVA_VISUAL_CATALOG_INFO.nodeTypeCount, 341, 'bundled visual catalog should cover the shipped HytaleGenerator Java workspace');
const geometryProject = buildProject([{
  path: 'HytaleGenerator/Density/Geometry.json',
  text: JSON.stringify({
    $NodeId: 'Constant.Density-00000000-0000-0000-0000-000000000001',
    Type: 'Constant',
    ExportAs: '',
    Skip: false,
    Value: 1,
    $NodeEditorMetadata: {
      $Nodes: {
        'Constant.Density-00000000-0000-0000-0000-000000000001': {
          $Position: { $x: 120, $y: -45 },
          $Title: 'Constant Density',
        },
      },
      $FloatingNodes: [],
      $Links: [],
      $Groups: [],
      $Comments: [],
      $WorkspaceID: 'Density',
    },
  }),
}]);
const geometryFile = geometryProject.files[0];
const geometryNode = geometryFile.nodes[0];
const editorMetadata = buildEditorMetadataForFile(geometryFile);
const editorNode = editorMetadata.nodes.get(geometryNode.id);
assert.deepEqual(editorNode?.position && { x: editorNode.position.x, y: editorNode.position.y }, { x: 120, y: -45 }, 'editor metadata index should resolve saved node position');
assert.deepEqual(editorNode?.position?.xPath, ['$NodeEditorMetadata', '$Nodes', geometryNode.id, '$Position', '$x'], 'editor position should retain a writer-safe scalar JSON path');
const geometry = resolveNodeGeometry(geometryFile, geometryNode, editorNode);
assert.equal(geometry.source, 'hytale-normal-profile');
assert.equal(geometry.height, 171, 'Constant.Density fixed-height geometry should be derived from ContentNode + 3 fixed field rows');
assert.equal(geometry.heightConfidence, 'exact');
assert.equal(geometry.widthConfidence, 'derived', 'width remains explicit about font/pin metric derivation');
const geometrySummary = summarizeGeometry([geometryFile], true, false);
assert.equal(geometrySummary.nodes, 1);
assert.equal(geometrySummary.known, 1);
assert.equal(geometrySummary.positioned, 1);
assert.equal(geometrySummary.fallback, 0);



// Reader v2 regression: typed attachments must not be conflated with same-domain flow forks.
const readerRootId = 'CurveMapper.Density-30000000-0000-0000-0000-000000000001';
const readerCurveId = 'Manual.Curve-30000000-0000-0000-0000-000000000002';
const readerPointAId = 'CurvePoint.Curve-30000000-0000-0000-0000-000000000003';
const readerPointBId = 'CurvePoint.Curve-30000000-0000-0000-0000-000000000004';
const readerInputId = 'Imported.Density-30000000-0000-0000-0000-000000000005';
const readerFixture = {
  $NodeId: readerRootId, Type: 'CurveMapper', Skip: false,
  Curve: {
    $NodeId: readerCurveId, Type: 'Manual',
    Points: [
      { $NodeId: readerPointAId, In: 0, Out: 0 },
      { $NodeId: readerPointBId, In: 1, Out: 1 },
    ],
  },
  Inputs: [{ $NodeId: readerInputId, Type: 'Imported', Skip: false, Name: 'Reader-Test' }],
  $NodeEditorMetadata: {
    $Nodes: {
      [readerRootId]: { $Position: { $x: 0, $y: 0 } },
      [readerCurveId]: { $Position: { $x: 600, $y: -200 } },
      [readerPointAId]: { $Position: { $x: 1200, $y: -300 } },
      [readerPointBId]: { $Position: { $x: 1200, $y: -100 } },
      [readerInputId]: { $Position: { $x: 600, $y: 0 } },
    },
    $FloatingNodes: [], $Links: [], $Groups: [], $Comments: [], $WorkspaceID: 'Density',
  },
};
const readerProject = buildProject([{ path: 'HytaleGenerator/Density/ReaderV2.json', text: JSON.stringify(readerFixture) }]);
const readerGraph = readLayoutGraphV2(readerProject.files[0], 'live');
assert.equal(readerGraph.stats.structuralForks, 2, 'structural ownership sees Curve + Inputs plus the Manual Points collection as forks');
assert.equal(readerGraph.stats.flowForks, 0, 'Reader v2 must not call a single Density input plus Curve attachment a flow fork');
assert.equal(readerGraph.stats.flowEdges, 1, 'Density Inputs should stay a same-domain flow edge');
assert.equal(readerGraph.stats.attachmentEdges, 1, 'Curve should be a typed attachment edge');
assert.equal(readerGraph.stats.orderedAttachmentEdges, 2, 'Manual Curve Points should be ordered typed attachments');
assert.equal(readerGraph.stats.mixedParents, 1, 'CurveMapper should be surfaced as mixed flow/attachment parent');
assert.equal(readerGraph.stats.structuralEdges, 0, 'all reader fixture relations should resolve through the visual catalog');
const readerLayoutProposal = buildAuthorNormalizeLayoutProposal([readerProject.files[0]], {
  strategy: 'author-normalize', horizontalGap: 10, verticalGap: 70, alignmentTolerance: 72, includeLive: true, floaterMode: 'ignore',
});
assert.equal(readerLayoutProposal.files[0].metrics.forks, 0, 'typed Curve/Points attachments must not create solver flow forks');
assert.equal(readerLayoutProposal.files[0].metrics.semanticStructuralForks, 2, 'proposal must retain the structural-fork baseline for A/B diagnostics');
assert.equal(readerLayoutProposal.files[0].metrics.semanticFlowForks, 0, 'proposal semantic flow-fork count must match Reader v2');

const readerDispatchedProposal = buildLayoutProposal([readerProject.files[0]], {
  strategy: 'author-normalize', horizontalGap: 10, verticalGap: 70, alignmentTolerance: 72, includeLive: true, floaterMode: 'ignore',
});
assert.deepEqual(readerDispatchedProposal.files, readerLayoutProposal.files, 'strategy registry dispatch must preserve per-file Author Normalize output');
assert.deepEqual(readerDispatchedProposal.patches, readerLayoutProposal.patches, 'strategy registry dispatch must preserve patch order/content');
assert.equal(readerDispatchedProposal.blocked, readerLayoutProposal.blocked);
assert.deepEqual(readerDispatchedProposal.warnings, readerLayoutProposal.warnings);

// Reader v2 alias regression: JSON field names may differ from visual pin labels,
// but an unambiguous connection-type match still resolves the semantic edge.
const readerAliasRootId = 'NoiseThickness.Layer.SpaceAndDepth.MaterialProvider-31000000-0000-0000-0000-000000000001';
const readerAliasChildId = 'CurveMapper.Density-31000000-0000-0000-0000-000000000002';
const readerAliasFixture = {
  $NodeId: readerAliasRootId, Type: 'NoiseThickness',
  ThicknessFunctionXZ: {
    $NodeId: readerAliasChildId, Type: 'CurveMapper', Skip: false,
  },
  $NodeEditorMetadata: {
    $Nodes: {
      [readerAliasRootId]: { $Position: { $x: 0, $y: 0 } },
      [readerAliasChildId]: { $Position: { $x: 700, $y: 0 } },
    },
    $FloatingNodes: [], $Links: [], $Groups: [], $Comments: [], $WorkspaceID: 'MaterialProvider',
  },
};
const readerAliasProject = buildProject([{ path: 'HytaleGenerator/MaterialProvider/ReaderAlias.json', text: JSON.stringify(readerAliasFixture) }]);
const readerAliasGraph = readLayoutGraphV2(readerAliasProject.files[0], 'live');
assert.equal(readerAliasGraph.stats.structuralEdges, 0, 'Reader v2 must resolve alias fields through a unique catalog connection type');
assert.equal(readerAliasGraph.stats.attachmentEdges, 1, 'ThicknessFunctionXZ should resolve as a Density attachment on the Layer provider');
assert.equal(readerAliasGraph.edges[0]?.parentPortId, 'DensityPin', 'alias resolution should retain the unique matched catalog pin');


const layoutRootId = 'Constant.Density-10000000-0000-0000-0000-000000000001';
const layoutChildAId = 'Constant.Density-10000000-0000-0000-0000-000000000002';
const layoutChildBId = 'Constant.Density-10000000-0000-0000-0000-000000000003';
const layoutFixture = {
  $NodeId: layoutRootId,
  Type: 'Constant',
  ExportAs: '',
  Skip: false,
  Value: 1,
  Inputs: [
    { $NodeId: layoutChildAId, Type: 'Constant', ExportAs: '', Skip: false, Value: 2 },
    { $NodeId: layoutChildBId, Type: 'Constant', ExportAs: '', Skip: false, Value: 3 },
  ],
  $NodeEditorMetadata: {
    $Nodes: {
      [layoutRootId]: { $Position: { $x: 100, $y: 100 }, $Title: 'Root' },
      [layoutChildAId]: { $Position: { $x: 505, $y: 105 }, $Title: 'A' },
      [layoutChildBId]: { $Position: { $x: 512, $y: 230 }, $Title: 'B' },
    },
    $FloatingNodes: [],
    $Links: [],
    $Groups: [
      { $Position: { $x: 470, $y: 70 }, $width: 620, $height: 420, $name: 'Chain' },
      { $Position: { $x: 1300, $y: 70 }, $width: 400, $height: 400, $name: 'Separate' },
    ],
    $Comments: [
      { $Position: { $x: 80, $y: 50 }, $width: 250, $height: 150, $name: 'Comment', $text: 'test' },
    ],
    $WorkspaceID: 'Density',
  },
};
const layoutProject = buildProject([{ path: 'HytaleGenerator/Density/Layout.json', text: JSON.stringify(layoutFixture) }]);
const layoutFile = layoutProject.files[0];
const originOnlyProposal = buildNormalizeLayoutProposal([layoutFile], {
  strategy: 'normalize', horizontalGap: 999, verticalGap: 999, alignmentTolerance: 1, includeLive: true, floaterMode: 'ignore',
});
assert.equal(originOnlyProposal.strategy, 'normalize', 'Normalize should now mean origin-only translation');
assert.equal(originOnlyProposal.blocked, false, 'origin-only Normalize should be stageable whenever a positioned root exists');
assert.deepEqual(originOnlyProposal.files[0].metrics.originOffset, { x: -100, y: -100 });
assert.equal(originOnlyProposal.files[0].metrics.normalizedNodes, 0, 'origin-only Normalize must not report structural normalization');
const originChildX = originOnlyProposal.patches.find((patch) => patch.entityId === layoutChildAId && patch.field === '$Position.$x');
const originChildY = originOnlyProposal.patches.find((patch) => patch.entityId === layoutChildAId && patch.field === '$Position.$y');
assert.equal(originChildX?.newValue, 405, 'every node must receive exactly the root X translation');
assert.equal(originChildY?.newValue, 5, 'every node must receive exactly the root Y translation');
const originGroupWidth = originOnlyProposal.patches.find((patch) => patch.entityKind === 'group' && patch.field === '$width');
assert.equal(originGroupWidth, undefined, 'origin-only Normalize must never resize groups');
const originCommentX = originOnlyProposal.patches.find((patch) => patch.entityKind === 'comment' && patch.field === '$Position.$x');
assert.equal(originCommentX?.newValue, -20, 'comments must move rigidly with the same origin offset');

const layoutProposal = buildAuthorNormalizeLayoutProposal([layoutFile], {
  strategy: 'author-normalize', horizontalGap: 10, verticalGap: 70, alignmentTolerance: 72, includeLive: true, floaterMode: 'ignore',
});
assert.equal(layoutProposal.blocked, false, 'normalize proposal should be valid for supported group metadata');
assert.deepEqual(layoutProposal.files[0].metrics.originOffset, { x: -100, y: -100 }, 'root origin should become the canonical translation offset');
const rootXPatch = layoutProposal.patches.find((patch) => patch.entityId === layoutRootId && patch.field === '$Position.$x');
const rootYPatch = layoutProposal.patches.find((patch) => patch.entityId === layoutRootId && patch.field === '$Position.$y');
assert.equal(rootXPatch?.newValue, 0, 'normalize must persist root x=0');
assert.equal(rootYPatch?.newValue, 0, 'normalize must persist root y=0');
const commentXPatch = layoutProposal.patches.find((patch) => patch.entityKind === 'comment' && patch.field === '$Position.$x');
assert.equal(commentXPatch?.newValue, -20, 'comments should receive the same canonical origin translation');
assert.equal(layoutProposal.files[0].groups[0].memberNodeIds.length, 2, 'group membership should be snapshotted from original bounds');
assert.equal(layoutProposal.files[0].metrics.newGroupOverlaps.length, 0, 'normalize must not introduce new group overlap in the safe fixture');
assert.equal(layoutProposal.files[0].metrics.forks, 1, 'the root with two structural children should be detected as a fork');
assert.equal(layoutProposal.files[0].metrics.branchClusters, 2, 'each fork child should become a branch cluster');
assert.equal(layoutProposal.files[0].metrics.clusterCollisionsResolved, 1, 'overlapping sibling branch contours should be resolved bottom-up');

const overlapFixture = JSON.parse(JSON.stringify(layoutFixture));
overlapFixture.Inputs[0].$NodeId = 'Constant.Density-20000000-0000-0000-0000-000000000002';
overlapFixture.Inputs[1].$NodeId = 'Constant.Density-20000000-0000-0000-0000-000000000003';
overlapFixture.$NodeEditorMetadata.$Nodes = {
  [layoutRootId]: { $Position: { $x: 100, $y: 100 }, $Title: 'Root' },
  [overlapFixture.Inputs[0].$NodeId]: { $Position: { $x: 300, $y: 100 }, $Title: 'A' },
  [overlapFixture.Inputs[1].$NodeId]: { $Position: { $x: 300, $y: 310 }, $Title: 'B' },
};
overlapFixture.$NodeEditorMetadata.$Groups = [
  { $Position: { $x: 70, $y: 60 }, $width: 800, $height: 500, $name: 'Expandable' },
  { $Position: { $x: 950, $y: 60 }, $width: 400, $height: 500, $name: 'Neighbor' },
];
const overlapProject = buildProject([{ path: 'HytaleGenerator/Density/OverlapGuard.json', text: JSON.stringify(overlapFixture) }]);
const guardedProposal = buildAuthorNormalizeLayoutProposal([overlapProject.files[0]], {
  strategy: 'author-normalize', horizontalGap: 600, verticalGap: 70, alignmentTolerance: 72, includeLive: true, floaterMode: 'ignore',
});
assert.equal(guardedProposal.blocked, true, 'new group overlap must block staging');
assert.equal(guardedProposal.files[0].metrics.newGroupOverlaps.length, 0, 'group-anchor rescue should remove the proposal-induced group overlap before the final block decision');
assert.ok(guardedProposal.files[0].metrics.groupAnchorRescuedNodes > 0, 'group-anchor rescue should report the nodes it constrained');
assert.ok(guardedProposal.files[0].metrics.blockReasons.some((reason) => reason.code === 'node-overlap'), 'the fixture should remain blocked only for its pre-existing node geometry overlap');

// Tree-Normalize branch-cluster regression: sibling branches are allowed to reuse
// the same X lanes. Only real rectangle collisions may separate them in Y.
const clusterIds = {
  root: 'Sum.Density-30000000-0000-0000-0000-000000000001',
  p1: 'Constant.Density-30000000-0000-0000-0000-000000000002',
  p2: 'Constant.Density-30000000-0000-0000-0000-000000000003',
  c1: 'Constant.Density-30000000-0000-0000-0000-000000000004',
  c2: 'Constant.Density-30000000-0000-0000-0000-000000000005',
};
const clusterFixture = {
  $NodeId: clusterIds.root, Type: 'Sum', ExportAs: '', Skip: false,
  Inputs: [
    { $NodeId: clusterIds.p1, Type: 'Constant', ExportAs: '', Skip: false, Value: 1, Inputs: [{ $NodeId: clusterIds.c1, Type: 'Constant', ExportAs: '', Skip: false, Value: 11 }] },
    { $NodeId: clusterIds.p2, Type: 'Constant', ExportAs: '', Skip: false, Value: 2, Inputs: [{ $NodeId: clusterIds.c2, Type: 'Constant', ExportAs: '', Skip: false, Value: 22 }] },
  ],
  $NodeEditorMetadata: {
    $Nodes: {
      [clusterIds.root]: { $Position: { $x: 100, $y: 300 } },
      [clusterIds.p1]: { $Position: { $x: 650, $y: 100 } },
      [clusterIds.p2]: { $Position: { $x: 650, $y: 700 } },
      [clusterIds.c1]: { $Position: { $x: 1200, $y: 100 } },
      [clusterIds.c2]: { $Position: { $x: 1200, $y: 700 } },
    }, $FloatingNodes: [], $Links: [], $Groups: [], $Comments: [], $WorkspaceID: 'Density',
  },
};
const clusterProject = buildProject([{ path: 'HytaleGenerator/Density/Cluster.json', text: JSON.stringify(clusterFixture) }]);
const clusterProposal = buildAuthorNormalizeLayoutProposal([clusterProject.files[0]], {
  strategy: 'author-normalize', horizontalGap: 10, verticalGap: 70, alignmentTolerance: 72, includeLive: true, floaterMode: 'ignore',
});
assert.equal(clusterProposal.blocked, false);
const clusterApplied = applyChangeSet(clusterProject, stageLayoutProposal(emptyChangeSet(), clusterProposal)).project.files[0];
const clusterMeta = buildEditorMetadataForFile(clusterApplied);
assert.equal(clusterMeta.nodes.get(clusterIds.p1)?.position?.x, clusterMeta.nodes.get(clusterIds.p2)?.position?.x,
  'fork sibling clusters should intentionally share the same first X lane');
assert.equal(clusterMeta.nodes.get(clusterIds.c1)?.position?.x, clusterMeta.nodes.get(clusterIds.c2)?.position?.x,
  'parallel single-child chains in different branch clusters should reuse downstream X lanes');
assert.equal(clusterProposal.files[0].metrics.nodeOverlapsAfter, 0, 'overlapping X lanes are valid when branch contours do not collide in Y');

// Flow-Normalize regression: one fork child is an immediate branch while the
// other is deliberately authored several X depths later as the visual main
// continuation. Normalize must preserve that local depth relationship and put
// straight-chain connector centers on a shared horizontal plane.
const flowIds = {
  root: 'Mix.Density-40000000-0000-0000-0000-000000000001',
  upper: 'Max.Density-40000000-0000-0000-0000-000000000002',
  deep: 'Sum.Density-40000000-0000-0000-0000-000000000003',
  tail: 'Constant.Density-40000000-0000-0000-0000-000000000004',
};
const flowFixture = {
  $NodeId: flowIds.root, Type: 'Mix', Skip: false,
  Inputs: [
    { $NodeId: flowIds.upper, Type: 'Max', Skip: false, Inputs: [] },
    { $NodeId: flowIds.deep, Type: 'Sum', Skip: false, Inputs: [
      { $NodeId: flowIds.tail, Type: 'Constant', ExportAs: '', Skip: false, Value: 1 },
    ] },
  ],
  $NodeEditorMetadata: {
    $Nodes: {
      [flowIds.root]: { $Position: { $x: 100, $y: 100 } },
      [flowIds.upper]: { $Position: { $x: 710, $y: -900 } },
      [flowIds.deep]: { $Position: { $x: 3700, $y: 100 } },
      [flowIds.tail]: { $Position: { $x: 4310, $y: 100 } },
    }, $FloatingNodes: [], $Links: [], $Groups: [], $Comments: [], $WorkspaceID: 'Density',
  },
};
const flowProject = buildProject([{ path: 'HytaleGenerator/Density/Flow.json', text: JSON.stringify(flowFixture) }]);
const flowProposal = buildAuthorNormalizeLayoutProposal([flowProject.files[0]], {
  strategy: 'author-normalize', horizontalGap: 10, verticalGap: 70, alignmentTolerance: 72, includeLive: true, floaterMode: 'ignore',
});
assert.equal(flowProposal.blocked, false);
const flowApplied = applyChangeSet(flowProject, stageLayoutProposal(emptyChangeSet(), flowProposal)).project.files[0];
const flowMeta = buildEditorMetadataForFile(flowApplied);
const flowRoot = flowMeta.nodes.get(flowIds.root)?.position;
const flowUpper = flowMeta.nodes.get(flowIds.upper)?.position;
const flowDeep = flowMeta.nodes.get(flowIds.deep)?.position;
const flowTail = flowMeta.nodes.get(flowIds.tail)?.position;
assert.ok(flowRoot && flowUpper && flowDeep && flowTail);
assert.equal(flowRoot.y, flowDeep.y, 'the best matching fork continuation should align real connector centers onto the parent plane');
assert.equal(flowDeep.y, flowTail.y, 'a single-child continuation should stay on the same connector plane');
assert.ok(flowDeep.x > flowUpper.x + 1000, 'a clearly deep fork child must stay behind the immediate author branch rather than collapse to the same X lane');
assert.ok(flowProposal.files[0].metrics.deepBranchStarts > 0, 'deep fork intent should be surfaced in metrics');
assert.ok(flowProposal.files[0].metrics.laneSnaps >= 1, 'visual/connector lane normalization should be exercised by the flow fixture');
assert.ok(flowProposal.files[0].metrics.flowLanes >= 1 && flowProposal.files[0].metrics.flowLaneEdges >= 2, 'author-inline Flow edges should be promoted into explicit lane diagnostics');
assert.equal(flowProposal.files[0].metrics.maxConnectionPlaneDeviationAfter, 0, 'already-clean Flow lanes should remain exactly on their intended connector planes');


// Full DAG regression: author X/Y is discarded. Siblings of the same parent
// share one depth column, while a single-child continuation advances exactly
// one DAG column and keeps a straight visible row.
const dagProposal = buildDagRebuildLayoutProposal([flowProject.files[0]], {
  strategy: 'dag-rebuild', horizontalGap: 10, verticalGap: 10, alignmentTolerance: 100, includeLive: true, floaterMode: 'ignore',
});
assert.equal(dagProposal.strategy, 'dag-rebuild');
assert.equal(dagProposal.blocked, false, 'simple Flow DAG should rebuild without geometry or routing conflicts');
assert.ok(dagProposal.files[0].metrics.dagLevels >= 3, 'DAG rebuild should expose depth columns');
const dagApplied = applyChangeSet(flowProject, stageLayoutProposal(emptyChangeSet(), dagProposal)).project.files[0];
const dagMeta = buildEditorMetadataForFile(dagApplied);
assert.deepEqual({
  x: dagMeta.nodes.get(flowIds.root)?.position?.x,
  y: dagMeta.nodes.get(flowIds.root)?.position?.y,
}, { x: 0, y: 0 }, 'DAG root must persist at 0,0');
assert.equal(dagMeta.nodes.get(flowIds.upper)?.position?.x, dagMeta.nodes.get(flowIds.deep)?.position?.x,
  'all direct children of a DAG parent should occupy the same X depth column');
assert.ok((dagMeta.nodes.get(flowIds.tail)?.position?.x ?? 0) > (dagMeta.nodes.get(flowIds.deep)?.position?.x ?? 0),
  'single-child continuation should advance to the next DAG depth column');
assert.equal(dagMeta.nodes.get(flowIds.deep)?.position?.y, dagMeta.nodes.get(flowIds.root)?.position?.y,
  'chain-first DAG should keep the longest Flow continuation on the exact parent Y lane');
assert.ok((dagMeta.nodes.get(flowIds.upper)?.position?.y ?? 0) > (dagMeta.nodes.get(flowIds.root)?.position?.y ?? 0),
  'Auto DAG should place the remaining side branch on one side of the main lane');
assert.equal(dagMeta.nodes.get(flowIds.tail)?.position?.y, dagMeta.nodes.get(flowIds.deep)?.position?.y,
  'single-child chain continuation should remain on the same visible Y lane');

const dagUp = buildDagRebuildLayoutProposal([flowProject.files[0]], {
  strategy: 'dag-rebuild', horizontalGap: 10, verticalGap: 10, alignmentTolerance: 100, dagBranchDirection: 'up', includeLive: true, floaterMode: 'ignore',
});
const dagUpApplied = applyChangeSet(flowProject, stageLayoutProposal(emptyChangeSet(), dagUp)).project.files[0];
const dagUpMeta = buildEditorMetadataForFile(dagUpApplied);
assert.equal(dagUpMeta.nodes.get(flowIds.deep)?.position?.y, dagUpMeta.nodes.get(flowIds.root)?.position?.y,
  'Up mode must preserve the main child on the parent lane');
assert.ok((dagUpMeta.nodes.get(flowIds.upper)?.position?.y ?? 0) < (dagUpMeta.nodes.get(flowIds.root)?.position?.y ?? 0),
  'Up mode must place side branches only above the main lane');

const dagDown = buildDagRebuildLayoutProposal([flowProject.files[0]], {
  strategy: 'dag-rebuild', horizontalGap: 10, verticalGap: 10, alignmentTolerance: 100, dagBranchDirection: 'down', includeLive: true, floaterMode: 'ignore',
});
const dagDownApplied = applyChangeSet(flowProject, stageLayoutProposal(emptyChangeSet(), dagDown)).project.files[0];
const dagDownMeta = buildEditorMetadataForFile(dagDownApplied);
assert.equal(dagDownMeta.nodes.get(flowIds.deep)?.position?.y, dagDownMeta.nodes.get(flowIds.root)?.position?.y,
  'Down mode must preserve the main child on the parent lane');
assert.ok((dagDownMeta.nodes.get(flowIds.upper)?.position?.y ?? 0) > (dagDownMeta.nodes.get(flowIds.root)?.position?.y ?? 0),
  'Down mode must place side branches only below the main lane');

const dagTypeDensity = buildDagRebuildLayoutProposal([flowProject.files[0]], {
  strategy: 'dag-rebuild', horizontalGap: 10, verticalGap: 10, alignmentTolerance: 100, dagBranchDirection: 'type', includeLive: true, floaterMode: 'ignore',
});
const dagTypeDensityApplied = applyChangeSet(flowProject, stageLayoutProposal(emptyChangeSet(), dagTypeDensity)).project.files[0];
const dagTypeDensityMeta = buildEditorMetadataForFile(dagTypeDensityApplied);
assert.equal(dagTypeDensityMeta.nodes.get(flowIds.deep)?.position?.y, dagTypeDensityMeta.nodes.get(flowIds.root)?.position?.y,
  'Type mode must preserve the selected main child on the parent lane');
assert.ok((dagTypeDensityMeta.nodes.get(flowIds.upper)?.position?.y ?? 0) < (dagTypeDensityMeta.nodes.get(flowIds.root)?.position?.y ?? 0),
  'Type mode must place a Density side branch above the main lane');

const materialDagIds = {
  root: 'Queue.MaterialProvider-51000000-0000-0000-0000-000000000001',
  main: 'Constant.MaterialProvider-51000000-0000-0000-0000-000000000002',
  side: 'Constant.MaterialProvider-51000000-0000-0000-0000-000000000003',
};
const materialDagFixture = {
  $NodeId: materialDagIds.root, Type: 'Queue', Skip: false,
  Queue: [
    { $NodeId: materialDagIds.main, Type: 'Constant', Skip: false },
    { $NodeId: materialDagIds.side, Type: 'Constant', Skip: false },
  ],
  $NodeEditorMetadata: {
    $Nodes: {
      [materialDagIds.root]: { $Position: { $x: 100, $y: 100 } },
      [materialDagIds.main]: { $Position: { $x: 900, $y: 100 } },
      [materialDagIds.side]: { $Position: { $x: 900, $y: 500 } },
    }, $FloatingNodes: [], $Links: [], $Groups: [], $Comments: [], $WorkspaceID: 'MaterialProvider',
  },
};
const materialDagProject = buildProject([{ path: 'HytaleGenerator/MaterialProvider/TypeDag.json', text: JSON.stringify(materialDagFixture) }]);
const dagTypeMaterial = buildDagRebuildLayoutProposal([materialDagProject.files[0]], {
  strategy: 'dag-rebuild', horizontalGap: 10, verticalGap: 10, alignmentTolerance: 100, dagBranchDirection: 'type', includeLive: true, floaterMode: 'ignore',
});
const dagTypeMaterialApplied = applyChangeSet(materialDagProject, stageLayoutProposal(emptyChangeSet(), dagTypeMaterial)).project.files[0];
const dagTypeMaterialMeta = buildEditorMetadataForFile(dagTypeMaterialApplied);
assert.equal(dagTypeMaterialMeta.nodes.get(materialDagIds.main)?.position?.y, dagTypeMaterialMeta.nodes.get(materialDagIds.root)?.position?.y,
  'Type mode must preserve a Material main child on the parent lane');
assert.ok((dagTypeMaterialMeta.nodes.get(materialDagIds.side)?.position?.y ?? 0) > (dagTypeMaterialMeta.nodes.get(materialDagIds.root)?.position?.y ?? 0),
  'Type mode must place non-Density/MaterialProvider side branches below the main lane');
assert.equal(dagTypeMaterial.files[0].metrics.nodeOverlapsAfter, 0, 'Type Material fixture must stay overlap-free');
assert.equal(dagTypeMaterial.files[0].metrics.edgeNodeIntersectionsAfter, 0, 'Type Material fixture must keep routed flow edges out of nodes');

assert.equal(dagProposal.files[0].metrics.nodeOverlapsAfter, 0, 'DAG rebuild must not create node overlaps');
assert.equal(dagProposal.files[0].metrics.edgeNodeIntersectionsAfter, 0, 'DAG rebuild must keep Flow wires out of foreign nodes');

const flowFixtureDifferentAuthor = JSON.parse(JSON.stringify(flowFixture));
flowFixtureDifferentAuthor.$NodeEditorMetadata.$Nodes[flowIds.root].$Position = { $x: -9000, $y: 4000 };
flowFixtureDifferentAuthor.$NodeEditorMetadata.$Nodes[flowIds.upper].$Position = { $x: 12000, $y: -7000 };
flowFixtureDifferentAuthor.$NodeEditorMetadata.$Nodes[flowIds.deep].$Position = { $x: 22000, $y: 8000 };
flowFixtureDifferentAuthor.$NodeEditorMetadata.$Nodes[flowIds.tail].$Position = { $x: 31000, $y: 15000 };
const flowDifferentProject = buildProject([{ path: 'HytaleGenerator/Density/FlowDifferentAuthor.json', text: JSON.stringify(flowFixtureDifferentAuthor) }]);
const dagDifferent = buildDagRebuildLayoutProposal([flowDifferentProject.files[0]], {
  strategy: 'dag-rebuild', horizontalGap: 10, verticalGap: 10, alignmentTolerance: 100, includeLive: true, floaterMode: 'ignore',
});
const dagDifferentApplied = applyChangeSet(flowDifferentProject, stageLayoutProposal(emptyChangeSet(), dagDifferent)).project.files[0];
const dagDifferentMeta = buildEditorMetadataForFile(dagDifferentApplied);
for (const id of Object.values(flowIds)) {
  assert.deepEqual(
    dagDifferentMeta.nodes.get(id)?.position && { x: dagDifferentMeta.nodes.get(id).position.x, y: dagDifferentMeta.nodes.get(id).position.y },
    dagMeta.nodes.get(id)?.position && { x: dagMeta.nodes.get(id).position.x, y: dagMeta.nodes.get(id).position.y },
    `DAG target for ${id} must be independent of authored X/Y`,
  );
}

// Multi-input inline regression: the immediate child sits just outside the base
// 72px tolerance while a deeper child is slightly closer to the shared Inputs
// port. Fork-only adaptive range should still consider the immediate branch, and
// the depth bias should win this near-tie without preventing clearly inline deep
// continuations (covered by the flow fixture above).
const multiInlineIds = {
  root: 'Mix.Density-50000000-0000-0000-0000-000000000001',
  direct: 'Max.Density-50000000-0000-0000-0000-000000000002',
  deep: 'Sum.Density-50000000-0000-0000-0000-000000000003',
};
const multiInlineFixture = {
  $NodeId: multiInlineIds.root, Type: 'Mix', Skip: false,
  Inputs: [
    { $NodeId: multiInlineIds.direct, Type: 'Max', Skip: false, Inputs: [] },
    { $NodeId: multiInlineIds.deep, Type: 'Sum', Skip: false, Inputs: [] },
  ],
  $NodeEditorMetadata: {
    $Nodes: {
      [multiInlineIds.root]: { $Position: { $x: 100, $y: 100 } },
      [multiInlineIds.direct]: { $Position: { $x: 710, $y: 180 } },
      [multiInlineIds.deep]: { $Position: { $x: 3700, $y: 160 } },
    }, $FloatingNodes: [], $Links: [], $Groups: [], $Comments: [], $WorkspaceID: 'Density',
  },
};
const multiInlineProject = buildProject([{ path: 'HytaleGenerator/Density/MultiInline.json', text: JSON.stringify(multiInlineFixture) }]);
const multiInlineProposal = buildAuthorNormalizeLayoutProposal([multiInlineProject.files[0]], {
  strategy: 'author-normalize', horizontalGap: 10, verticalGap: 70, alignmentTolerance: 72, includeLive: true, floaterMode: 'ignore',
});
assert.equal(multiInlineProposal.blocked, false);
const multiInlineApplied = applyChangeSet(multiInlineProject, stageLayoutProposal(emptyChangeSet(), multiInlineProposal)).project.files[0];
const multiInlineMeta = buildEditorMetadataForFile(multiInlineApplied);
const multiInlineRoot = multiInlineMeta.nodes.get(multiInlineIds.root)?.position;
const multiInlineDirect = multiInlineMeta.nodes.get(multiInlineIds.direct)?.position;
const multiInlineDeep = multiInlineMeta.nodes.get(multiInlineIds.deep)?.position;
assert.ok(multiInlineRoot && multiInlineDirect && multiInlineDeep);
assert.equal(multiInlineDirect.y - multiInlineRoot.y, 80, 'fork inline classification must preserve the immediate child author offset instead of hard-snapping a multi-input lane');
assert.equal(multiInlineDeep.y - multiInlineRoot.y, 60, 'non-main multi-input branches must preserve their author offset as well');
assert.equal(multiInlineProposal.files[0].metrics.maxConnectionPlaneDeviationAfter, 0, 'fork lane normalization must measure deviation from the preserved author lane offset, not force a zero-offset hard snap');
assert.ok(multiInlineDeep.x > multiInlineDirect.x + 1000, 'multi-input scoring must preserve author-depth bands');


// Visual-row regression: tiny author top-Y jitter is a visible row, not a
// semantic branch offset. Normalize should make the stored node Y values exact
// when the rigid child subtree can move without creating node/wire conflicts.
const visualRowIds = {
  root: 'Sum.Density-51000000-0000-0000-0000-000000000001',
  child: 'Inverter.Density-51000000-0000-0000-0000-000000000002',
  tail: 'YValue.Density-51000000-0000-0000-0000-000000000003',
};
const visualRowFixture = {
  $NodeId: visualRowIds.root, Type: 'Sum', Skip: false, Inputs: [{
    $NodeId: visualRowIds.child, Type: 'Inverter', Skip: false, Inputs: [{
      $NodeId: visualRowIds.tail, Type: 'YValue', Skip: false,
    }],
  }],
  $NodeEditorMetadata: {
    $Nodes: {
      [visualRowIds.root]: { $Position: { $x: 100, $y: 100 } },
      [visualRowIds.child]: { $Position: { $x: 710, $y: 107 } },
      [visualRowIds.tail]: { $Position: { $x: 1320, $y: 111 } },
    }, $FloatingNodes: [], $Links: [], $Groups: [], $Comments: [], $WorkspaceID: 'Density',
  },
};
const visualRowProject = buildProject([{ path: 'HytaleGenerator/Density/VisualRow.json', text: JSON.stringify(visualRowFixture) }]);
const visualRowProposal = buildAuthorNormalizeLayoutProposal([visualRowProject.files[0]], {
  strategy: 'author-normalize', horizontalGap: 10, verticalGap: 70, alignmentTolerance: 72, includeLive: true, floaterMode: 'ignore',
});
assert.equal(visualRowProposal.blocked, false);
const visualRowApplied = applyChangeSet(visualRowProject, stageLayoutProposal(emptyChangeSet(), visualRowProposal)).project.files[0];
const visualRowMeta = buildEditorMetadataForFile(visualRowApplied);
const visualRowRoot = visualRowMeta.nodes.get(visualRowIds.root)?.position;
const visualRowChild = visualRowMeta.nodes.get(visualRowIds.child)?.position;
const visualRowTail = visualRowMeta.nodes.get(visualRowIds.tail)?.position;
assert.ok(visualRowRoot && visualRowChild && visualRowTail);
assert.equal(visualRowRoot.y, visualRowChild.y, 'small author Y jitter should normalize to one exact visible row');
assert.equal(visualRowChild.y, visualRowTail.y, 'a continuation with small author Y jitter should remain on the same exact visible row');
assert.ok(visualRowProposal.files[0].metrics.visualRowEdges >= 2, 'visual-row candidates should be surfaced in proposal metrics');
assert.equal(visualRowProposal.files[0].metrics.visualRowMisalignedAfter, 0, 'safe visual rows should finish with exact node-top Y values');



// Author Grid regression: disconnected visual modules can intentionally share
// author rows/columns even though no direct edge joins them. The final grid
// pass must recover those guides without moving the canonical root or creating
// node/wire conflicts.
const authorGridIds = {
  root: 'Sum.Density-70000000-0000-0000-0000-000000000001',
  a: 'Inverter.Density-70000000-0000-0000-0000-000000000002',
  aTail: 'YValue.Density-70000000-0000-0000-0000-000000000003',
  b: 'Inverter.Density-70000000-0000-0000-0000-000000000004',
  bTail: 'YValue.Density-70000000-0000-0000-0000-000000000005',
  c: 'Inverter.Density-70000000-0000-0000-0000-000000000006',
  cTail: 'YValue.Density-70000000-0000-0000-0000-000000000007',
};
const authorGridFixture = {
  $NodeId: authorGridIds.root, Type: 'Sum', Skip: false, Inputs: [
    { $NodeId: authorGridIds.a, Type: 'Inverter', Skip: false, Inputs: [{ $NodeId: authorGridIds.aTail, Type: 'YValue', Skip: false }] },
    { $NodeId: authorGridIds.b, Type: 'Inverter', Skip: false, Inputs: [{ $NodeId: authorGridIds.bTail, Type: 'YValue', Skip: false }] },
    { $NodeId: authorGridIds.c, Type: 'Inverter', Skip: false, Inputs: [{ $NodeId: authorGridIds.cTail, Type: 'YValue', Skip: false }] },
  ],
  $NodeEditorMetadata: {
    $Nodes: {
      [authorGridIds.root]: { $Position: { $x: 0, $y: 0 } },
      [authorGridIds.a]: { $Position: { $x: 700, $y: 900 } },
      [authorGridIds.aTail]: { $Position: { $x: 1320, $y: 900 } },
      [authorGridIds.b]: { $Position: { $x: 3000, $y: 900 } },
      [authorGridIds.bTail]: { $Position: { $x: 3620, $y: 900 } },
      [authorGridIds.c]: { $Position: { $x: 700, $y: 1800 } },
      [authorGridIds.cTail]: { $Position: { $x: 1320, $y: 1800 } },
    }, $FloatingNodes: [], $Links: [], $Groups: [], $Comments: [], $WorkspaceID: 'Density',
  },
};
const authorGridProject = buildProject([{ path: 'HytaleGenerator/Density/AuthorGrid.json', text: JSON.stringify(authorGridFixture) }]);
const authorGridFile = authorGridProject.files[0];
const authorGridSnapshot = snapshotLayoutFile(authorGridFile);
const authorGridGraph = readLayoutGraphV2(authorGridFile, 'live', { positionedOnly: true });
const authorGridTargets = new Map([...authorGridSnapshot.nodes.entries()].map(([id, entry]) => [id, { source: entry, rect: { ...entry.canonicalRect } }]));
// Simulate later packing/routing leaving two modules slightly off their authored
// shared guides. The grid pass should restore B to A's row and C to A's column.
for (const id of [authorGridIds.b, authorGridIds.bTail]) authorGridTargets.get(id).rect.y += 18;
for (const id of [authorGridIds.c, authorGridIds.cTail]) authorGridTargets.get(id).rect.x += 18;
const authorGridLocalEdges = authorGridGraph.edges.filter((edge) => [authorGridIds.aTail, authorGridIds.bTail, authorGridIds.cTail].includes(edge.childId));
const authorGridStats = normalizeAuthorGrid(authorGridTargets, authorGridLocalEdges, {
  strategy: 'author-normalize', horizontalGap: 10, verticalGap: 70, alignmentTolerance: 72, includeLive: true, floaterMode: 'ignore',
}, authorGridIds.root);
assert.ok(authorGridStats.flowVisualGroups >= 3, 'independent local chains should become separate visual Flow modules');
assert.ok(authorGridStats.authorRowGuides >= 1, 'two disconnected modules sharing author Y should create a row guide');
assert.ok(authorGridStats.authorColumnGuides >= 1, 'two disconnected modules sharing author X should create a column guide');
assert.ok(authorGridStats.rowGuideRealignments >= 1, 'row guide should safely restore the disconnected B module');
assert.ok(authorGridStats.columnGuideRealignments >= 1, 'column guide should safely restore the disconnected C module');
assert.equal(authorGridTargets.get(authorGridIds.a).rect.y, authorGridTargets.get(authorGridIds.b).rect.y, 'pink-style disconnected row guide must end on exact Y');
assert.equal(authorGridTargets.get(authorGridIds.a).rect.x, authorGridTargets.get(authorGridIds.c).rect.x, 'red-style module column guide must end on exact X');
assert.equal(authorGridStats.edgeNodeIntersectionsAfter, 0, 'Author Grid must not trade visual guides for Flow wire/node hits');
assert.equal(authorGridStats.edgeEdgeCrossingsAfter, 0, 'Author Grid must not create unrelated connection crossings');

// Pixel-alignment polish regression: typed attachment chains and ordered
// leaf/value collections carry obvious visual rows/columns in the author
// sketch even though they are not Flow lanes. The final Author Grid pass should
// make these coordinates exact without changing semantic packing or safety.
const pixelRowIds = {
  delimiter: 'Delimiter.FieldFunction.MaterialProvider-81000000-0000-0000-0000-000000000001',
  constant: 'Constant.MaterialProvider-81000000-0000-0000-0000-000000000002',
  material: 'Material-81000000-0000-0000-0000-000000000003',
};
const pixelRowFixture = {
  $NodeId: pixelRowIds.delimiter, From: 0, To: 1,
  Material: {
    $NodeId: pixelRowIds.constant, Type: 'Constant', Skip: false,
    Material: { $NodeId: pixelRowIds.material, Solid: 'Rock_Stone', SolidBottomUp: false },
  },
  $NodeEditorMetadata: {
    $Nodes: {
      [pixelRowIds.delimiter]: { $Position: { $x: 100, $y: 100 } },
      [pixelRowIds.constant]: { $Position: { $x: 700, $y: 106 } },
      [pixelRowIds.material]: { $Position: { $x: 1400, $y: 113 } },
    }, $FloatingNodes: [], $Links: [], $Groups: [], $Comments: [], $WorkspaceID: 'MaterialProvider',
  },
};
const pixelRowProject = buildProject([{ path: 'HytaleGenerator/MaterialProvider/PixelRow.json', text: JSON.stringify(pixelRowFixture) }]);
const pixelRowFile = pixelRowProject.files[0];
const pixelRowSnapshot = snapshotLayoutFile(pixelRowFile);
const pixelRowGraph = readLayoutGraphV2(pixelRowFile, 'live', { positionedOnly: true });
const pixelRowTargets = new Map([...pixelRowSnapshot.nodes.entries()].map(([id, entry]) => [id, { source: entry, rect: { ...entry.canonicalRect } }]));
const pixelRowStats = normalizeAuthorGrid(pixelRowTargets, pixelRowGraph.edges, {
  strategy: 'author-normalize', horizontalGap: 10, verticalGap: 10, alignmentTolerance: 100, includeLive: true, floaterMode: 'ignore',
}, pixelRowIds.delimiter);
assert.ok(pixelRowStats.attachmentPixelRows >= 1, 'typed material/value chain should be recognized as a pixel row');
assert.equal(pixelRowTargets.get(pixelRowIds.delimiter).rect.y, pixelRowTargets.get(pixelRowIds.constant).rect.y, 'attachment-chain node tops should finish on exact Y');
assert.equal(pixelRowTargets.get(pixelRowIds.constant).rect.y, pixelRowTargets.get(pixelRowIds.material).rect.y, 'attachment-chain continuation should finish on exact Y');
assert.equal(pixelRowStats.attachmentPixelRowsMisalignedAfter, 0, 'safe typed attachment pixel rows should finish exact');

const pixelColumnIds = {
  mapper: 'CurveMapper.Density-82000000-0000-0000-0000-000000000001',
  manual: 'Manual.Curve-82000000-0000-0000-0000-000000000002',
  a: 'CurvePoint.Curve-82000000-0000-0000-0000-000000000003',
  b: 'CurvePoint.Curve-82000000-0000-0000-0000-000000000004',
  c: 'CurvePoint.Curve-82000000-0000-0000-0000-000000000005',
  y: 'YValue.Density-82000000-0000-0000-0000-000000000006',
};
const pixelColumnFixture = {
  $NodeId: pixelColumnIds.mapper, Type: 'CurveMapper', Skip: false,
  Curve: {
    $NodeId: pixelColumnIds.manual, Type: 'Manual', Points: [
      { $NodeId: pixelColumnIds.a, In: 0, Out: 0 },
      { $NodeId: pixelColumnIds.b, In: 1, Out: 1 },
      { $NodeId: pixelColumnIds.c, In: 2, Out: 0 },
    ],
  },
  Inputs: [{ $NodeId: pixelColumnIds.y, Type: 'YValue', Skip: false }],
  $NodeEditorMetadata: {
    $Nodes: {
      [pixelColumnIds.mapper]: { $Position: { $x: 100, $y: 100 } },
      [pixelColumnIds.manual]: { $Position: { $x: 700, $y: 300 } },
      [pixelColumnIds.a]: { $Position: { $x: 1400, $y: 100 } },
      [pixelColumnIds.b]: { $Position: { $x: 1424, $y: 250 } },
      [pixelColumnIds.c]: { $Position: { $x: 1388, $y: 400 } },
      [pixelColumnIds.y]: { $Position: { $x: 800, $y: 100 } },
    }, $FloatingNodes: [], $Links: [], $Groups: [], $Comments: [], $WorkspaceID: 'Density',
  },
};
const pixelColumnProject = buildProject([{ path: 'HytaleGenerator/Density/PixelColumn.json', text: JSON.stringify(pixelColumnFixture) }]);
const pixelColumnFile = pixelColumnProject.files[0];
const pixelColumnSnapshot = snapshotLayoutFile(pixelColumnFile);
const pixelColumnGraph = readLayoutGraphV2(pixelColumnFile, 'live', { positionedOnly: true });
const pixelColumnTargets = new Map([...pixelColumnSnapshot.nodes.entries()].map(([id, entry]) => [id, { source: entry, rect: { ...entry.canonicalRect } }]));
const pixelColumnStats = normalizeAuthorGrid(pixelColumnTargets, pixelColumnGraph.edges, {
  strategy: 'author-normalize', horizontalGap: 10, verticalGap: 10, alignmentTolerance: 100, includeLive: true, floaterMode: 'ignore',
}, pixelColumnIds.mapper);
assert.ok(pixelColumnStats.orderedAttachmentColumns >= 1, 'Curve Points should be recognized as an ordered pixel column');
const pointX = [pixelColumnIds.a, pixelColumnIds.b, pixelColumnIds.c].map((id) => pixelColumnTargets.get(id).rect.x);
assert.equal(new Set(pointX).size, 1, 'ordered Curve Points should finish on one exact X column');
assert.equal(pixelColumnStats.orderedAttachmentColumnsMisalignedAfter, 0, 'safe ordered attachment pixel columns should finish exact');
assert.equal(pixelColumnStats.edgeNodeIntersectionsAfter, 0, 'pixel polish must not introduce Flow wire/node hits');

// Contour-padding regression: an inline main fork sits close below a wider leaf.
// Its next Inputs band only nicks the leaf's X projection, so Normalize should
// keep the author Y lanes and add a tiny local X pad instead of throwing the
// entire main subtree downward.
const contourIds = {
  root: 'Max.Density-60000000-0000-0000-0000-000000000001',
  upper: 'Imported.Density-60000000-0000-0000-0000-000000000002',
  main: 'Sum.Density-60000000-0000-0000-0000-000000000003',
  a: 'Mix.Density-60000000-0000-0000-0000-000000000004',
  b: 'Exported.Density-60000000-0000-0000-0000-000000000005',
};
const contourFixture = {
  $NodeId: contourIds.root, Type: 'Max', Skip: false,
  Inputs: [
    { $NodeId: contourIds.upper, Type: 'Imported', Skip: false, Name: 'Upper' },
    { $NodeId: contourIds.main, Type: 'Sum', Skip: false, Inputs: [
      { $NodeId: contourIds.a, Type: 'Mix', Skip: false, Inputs: [] },
      { $NodeId: contourIds.b, Type: 'Exported', ExportAs: 'B', SingleInstance: true, Skip: false, Inputs: [] },
    ] },
  ],
  $NodeEditorMetadata: {
    $Nodes: {
      [contourIds.root]: { $Position: { $x: 100, $y: 100 } },
      [contourIds.upper]: { $Position: { $x: 710, $y: -65 } },
      [contourIds.main]: { $Position: { $x: 709, $y: 105 } },
      [contourIds.a]: { $Position: { $x: 1321, $y: -500 } },
      [contourIds.b]: { $Position: { $x: 1321, $y: 300 } },
    }, $FloatingNodes: [], $Links: [], $Groups: [], $Comments: [], $WorkspaceID: 'Density',
  },
};
const contourProject = buildProject([{ path: 'HytaleGenerator/Density/ContourPadding.json', text: JSON.stringify(contourFixture) }]);
const contourProposal = buildAuthorNormalizeLayoutProposal([contourProject.files[0]], {
  strategy: 'author-normalize', horizontalGap: 10, verticalGap: 70, alignmentTolerance: 72, includeLive: true, floaterMode: 'ignore',
});
assert.equal(contourProposal.blocked, false);
const contourApplied = applyChangeSet(contourProject, stageLayoutProposal(emptyChangeSet(), contourProposal)).project.files[0];
const contourMeta = buildEditorMetadataForFile(contourApplied);
const contourRoot = contourMeta.nodes.get(contourIds.root)?.position;
const contourUpper = contourMeta.nodes.get(contourIds.upper)?.position;
const contourMain = contourMeta.nodes.get(contourIds.main)?.position;
const contourA = contourMeta.nodes.get(contourIds.a)?.position;
const contourB = contourMeta.nodes.get(contourIds.b)?.position;
assert.ok(contourRoot && contourUpper && contourMain && contourA && contourB);
assert.equal(contourUpper.y - contourRoot.y, -165, 'upper side branch must retain its author Y offset');
assert.equal(contourMain.y - contourRoot.y, 0, 'small inline author Y jitter should normalize to the exact visual row');
assert.equal(contourA.x, contourB.x, 'the rescued direct Inputs band must stay column-aligned');
assert.ok(contourA.x - contourMain.x > 630, 'near-touching sibling contour should receive a small local X padding rescue');
assert.ok(contourProposal.files[0].metrics.contourXRescues >= 1, 'contour padding rescue should be surfaced in metrics');
assert.equal(contourProposal.files[0].metrics.nodeOverlapsAfter, 0);

// Edge-corridor regression: the author's rear Empty branch arcs above a Solid
// sibling, but compact node-only packing makes that incoming Bezier cut through
// the Queue node. Routing-aware repair must restore only as much X corridor as
// the actual wire geometry needs and leave the graph stageable.
const edgeCorridorIds = {
  root: 'Solidity.MaterialProvider-70000000-0000-0000-0000-000000000001',
  solid: 'Queue.MaterialProvider-70000000-0000-0000-0000-000000000002',
  solidLeaf: 'Constant.MaterialProvider-70000000-0000-0000-0000-000000000003',
  empty: 'SimpleHorizontal.MaterialProvider-70000000-0000-0000-0000-000000000004',
  emptyLeaf: 'Constant.MaterialProvider-70000000-0000-0000-0000-000000000005',
};
const edgeCorridorFixture = {
  $NodeId: edgeCorridorIds.root, Type: 'Solidity', Skip: false,
  Solid: {
    $NodeId: edgeCorridorIds.solid, Type: 'Queue', Skip: false,
    Queue: [{
      $NodeId: edgeCorridorIds.solidLeaf, Type: 'Constant', Skip: false,
      Material: { $NodeId: 'Material-70000000-0000-0000-0000-000000000006', Solid: 'Rock_Stone', SolidBottomUp: false },
    }],
  },
  Empty: {
    $NodeId: edgeCorridorIds.empty, Type: 'SimpleHorizontal', Skip: false,
    TopY: 200, TopBaseHeight: 'base', BottomY: 199, BottomBaseHeight: 'base',
    Material: {
      $NodeId: edgeCorridorIds.emptyLeaf, Type: 'Constant', Skip: false,
      Material: { $NodeId: 'Material-70000000-0000-0000-0000-000000000007', Solid: 'Rock_Stone', SolidBottomUp: false },
    },
  },
  $NodeEditorMetadata: {
    $Nodes: {
      [edgeCorridorIds.root]: { $Position: { $x: 100, $y: 100 } },
      [edgeCorridorIds.solid]: { $Position: { $x: 704, $y: 82 } },
      [edgeCorridorIds.solidLeaf]: { $Position: { $x: 1310, $y: 82 } },
      [edgeCorridorIds.empty]: { $Position: { $x: 2097, $y: -853 } },
      [edgeCorridorIds.emptyLeaf]: { $Position: { $x: 2714, $y: -853 } },
    }, $FloatingNodes: [], $Links: [], $Groups: [], $Comments: [], $WorkspaceID: 'MaterialProvider',
  },
};
const edgeCorridorProject = buildProject([{ path: 'HytaleGenerator/MaterialProvider/EdgeCorridor.json', text: JSON.stringify(edgeCorridorFixture) }]);
const edgeCorridorProposal = buildAuthorNormalizeLayoutProposal([edgeCorridorProject.files[0]], {
  strategy: 'author-normalize', horizontalGap: 10, verticalGap: 70, alignmentTolerance: 72, includeLive: true, floaterMode: 'ignore',
});
assert.equal(edgeCorridorProposal.blocked, false, 'routing-aware fixture should remain stageable after repair');
const edgeCorridorMetrics = edgeCorridorProposal.files[0].metrics;
assert.equal(edgeCorridorMetrics.edgeNodeIntersectionsBefore, 1, 'fixture must prove the pre-repair flow wire/node collision');
assert.equal(edgeCorridorMetrics.edgeNodeIntersectionsAfter, 0, 'Edge Corridor Repair must remove the flow wire/node collision');
assert.equal(edgeCorridorMetrics.edgeCorridorRepairs, 1, 'fixture should need exactly one branch corridor repair');
assert.ok(edgeCorridorMetrics.maxEdgeCorridorShift > 100 && edgeCorridorMetrics.maxEdgeCorridorShift < 500,
  `fixture corridor shift should be geometry-derived and local (${edgeCorridorMetrics.maxEdgeCorridorShift})`);
assert.equal(edgeCorridorMetrics.edgeEdgeCrossingsAfter, 0, 'fixture should not introduce unrelated wire crossings');

const stagedLayout = stageLayoutProposal(emptyChangeSet(), layoutProposal);
assert.ok(stagedLayout.changes.length > 0 && stagedLayout.changes.every((change) => change.source === 'layout'), 'layout proposal should stage through normal ChangeSet with layout source');
const appliedLayout = applyChangeSet(layoutProject, stagedLayout).project.files[0];
const appliedLayoutMetadata = buildEditorMetadataForFile(appliedLayout);
assert.deepEqual(appliedLayoutMetadata.nodes.get(layoutRootId)?.position && {
  x: appliedLayoutMetadata.nodes.get(layoutRootId).position.x,
  y: appliedLayoutMetadata.nodes.get(layoutRootId).position.y,
}, { x: 0, y: 0 }, 'writer should persist canonical root coordinates through scalar patches');

const paths = ['fixtures/exporter.json', 'fixtures/consumer.json'];
const inputs = await Promise.all(paths.map(async (path) => ({ path, text: await fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8') })));
const project = buildProject(inputs);

assert.equal(project.files.length, 2);
assert.equal(project.files[0].nodes.filter((n) => n.location === 'floating').length, 1, 'floating node should be separated');

assert.equal(project.files[0].workspace.id, 'unknown', 'fixture without workspace path should remain unknown');
const workspaceProject = buildProject([
  { path: 'HytaleGenerator/Density/Ps_Base/Ps_Rocks.json', text: inputs[0].text },
  { path: 'HytaleGenerator/Biomes/Ps_Atlantis/Ocean/Test.json', text: inputs[1].text },
]);
assert.equal(workspaceProject.files[0].workspace.id, 'density');
assert.equal(workspaceProject.files[1].workspace.id, 'biome');
const hintedProject = buildProject([{ path: 'Ps_Base/Ps_Rocks.json', text: inputs[0].text, workspaceHint: workspaceFromSegment('Density') }]);
assert.equal(hintedProject.files[0].workspace.id, 'density', 'selected Density root should retain workspace context');
const hintedPreview = applyChangeSet(hintedProject, emptyChangeSet()).project;
assert.equal(hintedPreview.files[0].workspace.id, 'density', 'refactor preview should preserve selected-root workspace hints');

const extendedWorkspaceProject = buildProject([
  { path: 'Server/HytaleGenerator/Settings/Settings.json', text: '{\"Value\":1}' },
  { path: 'Server/HytaleGenerator/WorldStructures/Test.json', text: '{\"Value\":1}' },
  { path: 'Server/HytaleGenerator/FutureWorkspace/Test.json', text: '{\"Value\":1}' },
]);
assert.equal(extendedWorkspaceProject.files[0].workspace.id, 'settings');
assert.equal(extendedWorkspaceProject.files[1].workspace.id, 'worldstructure');
assert.equal(extendedWorkspaceProject.files[2].workspace.id, 'futureworkspace', 'unknown HytaleGenerator child should become a dynamic workspace');
assert.ok(extendedWorkspaceProject.workspaces.some((workspace) => workspace.id === 'futureworkspace'));

const metadataWorkspaceRaw = {
  $NodeId: 'Biome',
  Name: 'Metadata-Biome',
  $NodeEditorMetadata: { $WorkspaceID: 'HytaleGenerator - Biome', $Nodes: {}, $FloatingNodes: [], $Links: [], $Groups: [], $Comments: [] },
};
const metadataWorkspace = workspaceFromMetadata(metadataWorkspaceRaw);
assert.equal(metadataWorkspace?.id, 'biome', '$WorkspaceID should identify the native workspace independent of folder naming');
assert.equal(metadataWorkspace?.source, 'content');
assert.equal(workspaceFromNativeId('HytaleGenerator - Density').id, 'density', '_Workspace.json-style native labels should normalize the same way as file metadata');
assert.equal(detectWorkspace('SomeMod/CompletelyCustomFolder/Asset.json', metadataWorkspaceRaw).id, 'biome', 'content workspace should beat arbitrary mod-folder paths');
const metadataWorkspaceProject = buildProject([{ path: 'SomeMod/CompletelyCustomFolder/Asset.json', text: JSON.stringify(metadataWorkspaceRaw), workspaceHint: workspaceFromSegment('WrongFolder') }]);
assert.equal(metadataWorkspaceProject.files[0].workspace.id, 'biome', 'native $WorkspaceID should beat folder fallback hints');
const semanticFolderProject = buildProject([{ path: 'SomeMod/Assets/WorldStructure/Test.json', text: '{"$NodeId":"WorldStructure"}' }]);
assert.equal(semanticFolderProject.files[0].workspace.id, 'worldstructure', 'known semantic workspace folders should work outside HytaleGenerator');

const projectGraphFixture = buildProject([
  {
    path: 'Server/Instances/Atlantis_Test/instance.bson',
    text: JSON.stringify({ WorldGen: { Type: 'HytaleGenerator', WorldStructure: 'Atlantis' } }),
  },
  {
    path: 'MyMod/Worlds/Atlantis.json',
    text: JSON.stringify({
      $NodeId: 'WorldStructure',
      Name: 'Atlantis',
      Biomes: ['Hot', 'Cold'],
      $NodeEditorMetadata: { $WorkspaceID: 'HytaleGenerator - WorldStructure' },
    }),
  },
  {
    path: 'MyMod/Biomes/Hot.json',
    text: JSON.stringify({
      $NodeId: 'Biome', Name: 'Hot',
      Terrain: { $NodeId: 'Terrain.Biome', Density: { $NodeId: 'Imported.Density-10000000-0000-0000-0000-000000000001', Type: 'Imported', Name: 'Shared-Base' } },
      $NodeEditorMetadata: { $WorkspaceID: 'HytaleGenerator - Biome' },
    }),
  },
  {
    path: 'MyMod/Biomes/Cold.json',
    text: JSON.stringify({
      $NodeId: 'Biome', Name: 'Cold',
      Terrain: { $NodeId: 'Terrain.Biome', Density: { $NodeId: 'Imported.Density-10000000-0000-0000-0000-000000000002', Type: 'Imported', Name: 'Shared-Base' } },
      $NodeEditorMetadata: { $WorkspaceID: 'HytaleGenerator - Biome' },
    }),
  },
  {
    path: 'MyMod/Generators/Shared.json',
    text: JSON.stringify({
      $NodeId: 'Exported.Density-10000000-0000-0000-0000-000000000003', Type: 'Exported', ExportAs: 'Shared-Base',
      Inputs: [{ $NodeId: 'Imported.Density-10000000-0000-0000-0000-000000000004', Type: 'Imported', Name: 'Noise' }],
      $NodeEditorMetadata: { $WorkspaceID: 'HytaleGenerator - Density' },
    }),
  },
  {
    path: 'MyMod/Generators/Noise.json',
    text: JSON.stringify({
      $NodeId: 'Exported.Density-10000000-0000-0000-0000-000000000005', Type: 'Exported', ExportAs: 'Noise',
      Inputs: [{ $NodeId: 'Constant.Density-10000000-0000-0000-0000-000000000006', Type: 'Constant', Value: 1 }],
      $NodeEditorMetadata: { $WorkspaceID: 'HytaleGenerator - Density' },
    }),
  },
]);
const projectGraphRootList = projectGraphRoots(projectGraphFixture);
assert.equal(projectGraphRootList.length, 2, 'Project Graph should expose the Instance entrypoint and the direct WorldStructure root');
const directWorldRoot = projectGraphRootList.find((root) => root.kind === 'worldstructure');
const instanceRoot = projectGraphRootList.find((root) => root.kind === 'instance');
assert.ok(directWorldRoot && instanceRoot, 'Project Graph roots should distinguish Instance and WorldStructure roots');
const projectGraph = buildProjectGraph(projectGraphFixture, directWorldRoot.fileId, 8);
assert.equal(projectGraph.linkedBiomeCount, 2, 'WorldStructure should resolve both exact biome references');
assert.equal(projectGraph.unresolvedDensityCount, 0, 'shared density chain should fully resolve');
assert.deepEqual(projectGraph.nodes.map((node) => [node.kind, node.label, node.depth]), [
  ['worldstructure', 'Atlantis', 0],
  ['biome', 'Cold', 1],
  ['biome', 'Hot', 1],
  ['biome-density', 'Cold Density', 2],
  ['biome-density', 'Hot Density', 2],
  ['density-symbol', 'Shared-Base', 3],
  ['density-symbol', 'Noise', 4],
], 'Project Graph should form WorldStructure → Biome → Biome Density → shared Density dependencies');
assert.equal(projectGraph.edges.filter((edge) => edge.target === 'density:shared-base').length, 2, 'shared Density dependency should be merged into one graph node with two incoming biome edges');

const instanceGraph = buildProjectGraph(projectGraphFixture, instanceRoot.fileId, 8);
assert.equal(instanceGraph.linkedInstanceCount, 1, 'Instance.WorldGen.WorldStructure should resolve by exact WorldStructure identity');
assert.deepEqual(instanceGraph.nodes.slice(0, 2).map((node) => [node.kind, node.label, node.depth]), [
  ['instance', 'Atlantis_Test', 0],
  ['worldstructure', 'Atlantis', 1],
], 'Project Graph should place the Instance entrypoint before its WorldStructure');
assert.ok(instanceGraph.edges.some((edge) => edge.kind === 'instance-worldstructure'), 'Project Graph should expose the Instance → WorldStructure edge');
assert.equal(instanceGraph.linkedBiomeCount, 2, 'Instance-rooted graph should continue through the WorldStructure into exact Biome references');

const worldDensityProject = buildProject([
  {
    path: 'Server/HytaleGenerator/WorldStructures/Basic.json',
    text: JSON.stringify({ DefaultBiome: 'Basic', Density: { Type: 'Imported', Name: 'Biome-Map' }, Framework: {} }),
  },
  {
    path: 'Server/HytaleGenerator/Density/BiomeMap.json',
    text: JSON.stringify({ $NodeId: 'Exported.Density-test', Type: 'Exported', ExportAs: 'Biome-Map', $WorkspaceID: 'HytaleGenerator - Density' }),
  },
]);
const worldDensityRoot = projectGraphRoots(worldDensityProject).find((root) => root.kind === 'worldstructure');
assert.ok(worldDensityRoot, 'WorldStructure schema detector should expose a direct graph root without relying on a WorldStructure workspace marker');
const worldDensityGraph = buildProjectGraph(worldDensityProject, worldDensityRoot.fileId, 4);
assert.ok(worldDensityGraph.nodes.some((node) => node.kind === 'worldstructure-density'), 'WorldStructure.Density should appear as a distinct flow step');
assert.ok(worldDensityGraph.edges.some((edge) => edge.kind === 'density-dependency' && edge.target === 'density:biome-map'), 'WorldStructure imported Density should resolve through the Density symbol index');

assert.ok(searchProject(workspaceProject, 'Ps-Rocks').some((item) => item.kind === 'symbol'));
assert.ok(searchProject(workspaceProject, 'Seed').some((item) => item.kind === 'field'));

const parsedSearch = parseSearchQuery('field:Seed MeduimRiver1 workspace:Density');
assert.deepEqual(parsedSearch.fields, ['Seed']);
assert.deepEqual(parsedSearch.workspaces, ['Density']);
assert.deepEqual(parsedSearch.terms, ['MeduimRiver1']);
const nodeSearch = searchProjectNodes(workspaceProject, 'field:Seed MeduimRiver1');
assert.equal(nodeSearch.total, 1, 'field:Seed query should return the node containing the matching Seed');
assert.equal(nodeSearch.matches[0]?.matchedFieldPaths.length, 1);
assert.equal(searchProjectNodes(workspaceProject, 'location:floating Ps-Old-Floating').total, 1, 'location operator should restrict node search');
const quotedQuery = parseSearchQuery('field:Seed value:"MeduimRiver1"');
assert.deepEqual(quotedQuery.values, ['MeduimRiver1'], 'quoted operator values should stay intact');
assert.equal(searchProjectNodes(workspaceProject, 'field:Seed value:"MeduimRiver1"').total, 1, 'field + value should precisely match the Seed field');
assert.equal(searchProjectNodes(workspaceProject, 'value:900').total, 1, 'value operator should search field values without requiring a text term');
assert.equal(searchProjectNodes(workspaceProject, 'is:import').total, 2, 'is:import should match both live and floating import nodes in the project snapshot');
assert.equal(searchProjectNodes(workspaceProject, 'is:export Ps-Rocks').total, 1, 'is:export should constrain free text to export fields');
assert.equal(searchProjectNodes(workspaceProject, 'is:unresolved').total, 1, 'is:unresolved should map diagnostics back to the affected node');
assert.equal(searchProjectNodes(workspaceProject, 'is:floating').total, 1, 'is:floating should act as a query-level location predicate');
assert.equal(searchProjectNodes(workspaceProject, '"Shared-Name"').total, 2, 'quoted free-text terms should stay together');
assert.ok(parseSearchQuery('is:banana').unknownOperators.some((item) => item.name === 'is' && item.value === 'banana'), 'unsupported is values should be reported instead of silently accepted');

const fieldStatsProject = buildProject([0, 1, 2, 3].map((index) => ({
  path: `HytaleGenerator/Density/Stats${index}.json`,
  text: inputs[0].text,
})));
const densityStats = getScopedFieldStats(fieldStatsProject, { workspace: 'density', live: true, floating: false, hideEmpty: true });
const scaleStat = densityStats.find((item) => item.key === 'Scale');
assert.equal(scaleStat?.count, 4, 'adaptive field index should count present Scale values');
assert.equal(scaleStat?.common, true, 'repeated fields should become common by the adaptive heuristic');
assert.ok(fieldStatsProject.fieldIndex.has('Scale'), 'project should expose a presence-driven field index');
const quickRefs = fieldStatsProject.files[0].nodes.map((node) => ({ fileId: fieldStatsProject.files[0].id, nodeId: node.id, location: node.location }));
const quickStats = getFieldStatsForNodeRefs(fieldStatsProject, quickRefs);
assert.ok(quickStats.length > 0, 'quick common stats should be derivable from a stable file/search node set');
assert.equal(quickStats[0]?.key, 'Scale', 'the most frequent property should lead the presence-driven stats in this fixture');
assert.ok((scaleStat?.filterableNodeCount ?? 0) > 0, 'field stats should track the actual population of nodes with filterable values');

const uuid = (index) => `00000000-0000-0000-0000-${index.toString(16).padStart(12, '0')}`;
const materialNodes = Array.from({ length: 100 }, (_, index) => ({
  $NodeId: `Material.Density-${uuid(index + 1)}`,
  Type: 'Material',
  Material: `Stone-${index}`,
  Blend: index % 4,
  Strength: 1,
}));
const diverseNodes = Array.from({ length: 8 }, (_, index) => ({
  $NodeId: `Diverse${index}.Density-${uuid(index + 1001)}`,
  Type: `Diverse${index}`,
  Scale: 100 + index,
  Range: 0.5 + index,
  Weight: index + 1,
}));
const dominanceProject = buildProject([{
  path: 'HytaleGenerator/Density/Dominance.json',
  text: JSON.stringify({
    $NodeId: `Sum.Density-${uuid(9999)}`,
    Type: 'Sum',
    Inputs: [...materialNodes, ...diverseNodes],
  }),
}]);
const dominanceRefs = dominanceProject.files[0].nodes.map((node) => ({ fileId: dominanceProject.files[0].id, nodeId: node.id, location: node.location }));
const balancedQuick = getAdaptiveQuickFieldStats(dominanceProject, dominanceRefs);
const broadQuick = balancedQuick.filter((item) => item.quickRole === 'broad').map((item) => item.key);
const contextQuick = balancedQuick.filter((item) => item.quickRole === 'context').map((item) => item.key);
assert.ok(broadQuick.includes('Scale') && broadQuick.includes('Range'), 'broad slots should reward fields distributed across many node kinds even when one mass node type dominates raw counts');
assert.ok(contextQuick.some((key) => ['Material', 'Blend', 'Strength'].includes(key)), 'context slots should still surface fields that dominate the current node population');
assert.equal(new Set(balancedQuick.map((item) => item.key)).size, balancedQuick.length, 'broad/context quick slots must not duplicate fields');
const tree = buildProjectTree(workspaceProject.files);
assert.ok(tree.length > 0, 'folder tree should be built');
const densityTree = buildProjectTree(workspaceProject.files, 'density');
const densityTreeJson = JSON.stringify(densityTree);
assert.ok(densityTreeJson.includes('Ps_Rocks.json') && !densityTreeJson.includes('Test.json'), 'explorer workspace scope should affect only the built tree input');

const matchProject = buildProject([
  { path: 'HytaleGenerator/Density/A.json', text: inputs[0].text },
  { path: 'HytaleGenerator/Density/B.json', text: inputs[0].text },
]);
const sourceNode = matchProject.files[0].nodes.find((node) => node.fields.some((field) => field.key === 'Seed'));
const seedField = sourceNode?.fields.find((field) => field.key === 'Seed');
assert.ok(sourceNode && seedField);
assert.equal(findMatchingFields(matchProject, sourceNode, seedField).length, 1, 'literal match index should find the same Seed in another file');

const rocks = project.symbolIndex.get(symbolKey('Density', 'Ps-Rocks'));
assert.ok(rocks, 'Ps-Rocks symbol should exist');
assert.equal(rocks.definitions.length, 1);
assert.equal(rocks.references.length, 1);

assert.ok(project.diagnostics.some((d) => d.code === 'type-name-collision' && d.message.includes('Shared-Name')));
assert.ok(project.diagnostics.some((d) => d.code === 'unresolved-import' && d.symbol?.name === 'Ps-Old-Floating'));

let changes = emptyChangeSet();
changes = renameSymbol(project, changes, 'Density', 'Ps-Rocks', 'Ps-Generativ-Rocks');
assert.equal(changes.changes.length, 2, 'definition and live reference should be staged');
const stagedSearch = searchProjectNodes(project, 'Ps-Generativ-Rocks', changes);
assert.equal(stagedSearch.total, 2, 'refreshed search snapshots should see staged effective values');
assert.equal(searchProjectNodes(project, 'is:changed', changes).total, 2, 'is:changed should expose nodes touched by the current ChangeSet');
assert.equal(searchProjectNodes(project, 'is:changed value:Ps-Generativ-Rocks', changes).total, 2, 'value: should use staged effective values when combined with is:changed');
assert.equal(changes.rules.length, 1);
assert.ok(changes.changes.every((c) => c.newValue === 'Ps-Generativ-Rocks'));
assert.ok(!changes.changes.some((c) => c.field === 'Seed'), 'seed must never be propagated');

const appliedResult = applyChangeSet(project, changes);
const validation = compareDiagnostics(project, appliedResult.project);
assert.equal(validation.addedErrors.length, 0);
const applied = appliedResult.project;
const renamed = applied.symbolIndex.get(symbolKey('Density', 'Ps-Generativ-Rocks'));
assert.ok(renamed);
assert.equal(renamed.definitions.length, 1);
assert.equal(renamed.references.length, 1);
assert.equal(applied.symbolIndex.has(symbolKey('Density', 'Ps-Rocks')), false);

console.log(JSON.stringify({
  files: project.files.length,
  nodes: project.files.reduce((sum, file) => sum + file.nodes.length, 0),
  diagnostics: project.diagnostics.map((d) => d.code),
  stagedChanges: changes.changes.length,
  renameVerified: true,
  workspaceDetectionVerified: true,
  dynamicWorkspaceDetectionVerified: true,
  metadataWorkspaceDetectionVerified: true,
  projectGraphPrototypeVerified: true,
  validationDiffVerified: true,
  fieldMatchIndexVerified: true,
  searchVerified: true,
  searchTabsQueryEngineVerified: true,
  adaptiveFieldIndexVerified: true,
  stableQuickCommonStatsVerified: true,
  balancedBroadContextQuickFiltersVerified: true,
  explorerWorkspaceTreeScopeVerified: true,
  stagedSearchValuesVerified: true,
  queryIsOperatorsVerified: true,
  queryValueOperatorVerified: true,
  quotedQueryValuesVerified: true,
  outputNamingVerified: true,
  outputScopeVerified: true,
  visualCatalogVerified: true,
  editorMetadataIndexVerified: true,
  geometryResolverVerified: true,
  normalizeLayoutProposalVerified: true,
  canonicalRootOriginVerified: true,
  groupSnapshotVerified: true,
  groupOverlapGuardVerified: true,
  layoutStagingVerified: true,
  treeNormalizeClusterOverlapVerified: true,
  edgeCorridorRepairVerified: true
}, null, 2));
