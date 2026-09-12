import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  applyChangeSet,
  buildEditorMetadataForFile,
  buildAuthorNormalizeLayoutProposal,
  buildProject,
  compareDiagnostics,
  emptyChangeSet,
  stageLayoutProposal,
} from '../.core-build/index.js';

const root = process.argv[2];
if (!root) throw new Error('Usage: node scripts/test-real-layout.mjs <HytaleGenerator-root>');
async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.name.toLowerCase().endsWith('.json')) out.push(full);
  }
  return out;
}
const inputs = await Promise.all((await walk(root)).map(async (full) => ({
  path: path.relative(root, full).split(path.sep).join('/'),
  text: await fs.readFile(full, 'utf8'),
})));
const project = buildProject(inputs);
const graphFiles = project.files.filter((file) => {
  const metadata = buildEditorMetadataForFile(file);
  return file.nodes.some((node) => metadata.nodes.get(node.id)?.position);
});
const gapResults = [];
const gapProposals = new Map();
let proposal;
for (const horizontalGap of [10, 20, 40, 70]) {
  const candidate = buildAuthorNormalizeLayoutProposal(graphFiles, {
    strategy: 'author-normalize', horizontalGap, verticalGap: 70, alignmentTolerance: 72, includeLive: true, floaterMode: 'ignore',
  });
  assert.equal(candidate.blocked, false, `real regression Normalize H${horizontalGap} proposal should not be blocked`);
  assert.ok(candidate.files.every((file) => file.metrics.nodeOverlapsAfter === 0), `Normalize H${horizontalGap} should remove active live-node overlaps`);
  const totalXSpan = candidate.files.reduce((sum, file) => sum + file.metrics.xSpanAfter, 0);
  gapResults.push({
    horizontalGap,
    patches: candidate.patches.length,
    normalizedNodes: candidate.files.reduce((sum, file) => sum + file.metrics.normalizedNodes, 0),
    xNormalizedNodes: candidate.files.reduce((sum, file) => sum + file.metrics.xNormalizedNodes, 0),
    totalXSpan,
    overlapsAfter: candidate.files.reduce((sum, file) => sum + file.metrics.nodeOverlapsAfter, 0),
  });
  gapProposals.set(horizontalGap, candidate);
  if (horizontalGap === 10) proposal = candidate;
}
assert.ok(proposal);
assert.ok(gapResults[0].totalXSpan < gapResults[1].totalXSpan && gapResults[1].totalXSpan < gapResults[2].totalXSpan,
  'H10/H20/H40 must produce strictly different increasing X spans');
const xTargets = (candidate) => new Map(candidate.patches
  .filter((patch) => patch.entityKind === 'node' && patch.field === '$Position.$x')
  .map((patch) => [`${patch.fileId}|${patch.entityId}`, patch.newValue]));
const x10 = xTargets(gapProposals.get(10));
const x20 = xTargets(gapProposals.get(20));
const x40 = xTargets(gapProposals.get(40));
const changedBetween = (a, b) => [...new Set([...a.keys(), ...b.keys()])].filter((key) => a.get(key) !== b.get(key)).length;
assert.ok(changedBetween(x10, x20) > 0, 'H10 and H20 must produce different node X targets');
assert.ok(changedBetween(x20, x40) > 0, 'H20 and H40 must produce different node X targets');

// Settings-output regression: vertical gap must also reach the actual staged
// metadata output, not only the proposal label. A larger V gap should produce
// different Y targets on the real graph while remaining stageable.
const vertical70 = gapProposals.get(10);
const vertical140 = buildAuthorNormalizeLayoutProposal(graphFiles, {
  strategy: 'author-normalize', horizontalGap: 10, verticalGap: 140, alignmentTolerance: 72, includeLive: true, floaterMode: 'ignore',
});
assert.equal(vertical140.blocked, false, 'real regression Normalize V140 proposal should not be blocked');
const yTargets = (candidate) => new Map(candidate.patches
  .filter((patch) => patch.entityKind === 'node' && patch.field === '$Position.$y')
  .map((patch) => [`${patch.fileId}|${patch.entityId}`, patch.newValue]));
const y70 = yTargets(vertical70);
const y140 = yTargets(vertical140);
assert.ok(changedBetween(y70, y140) > 0, 'V70 and V140 must produce different node Y targets');

const denseColdPath = 'Biomes/Ps_Atlantis/Ocean/Ps_Atlantis_City_Cold_Dense.json';
const denseColdH10 = gapProposals.get(10)?.files.find((file) => file.filePath === denseColdPath);
if (denseColdH10) {
  assert.equal(denseColdH10.metrics.nodeOverlapsAfter, 0, 'Dense Cold Flow Normalize must resolve all live-node overlaps');
  assert.ok(denseColdH10.metrics.xSpanAfter < denseColdH10.metrics.xSpanBefore * 1.25,
    `Dense Cold H10 must not reproduce global-band X inflation (${denseColdH10.metrics.xSpanBefore} -> ${denseColdH10.metrics.xSpanAfter})`);
  assert.ok(denseColdH10.metrics.ySpanAfter < denseColdH10.metrics.ySpanBefore * 1.1,
    `Dense Cold H10 must not explode vertically (${denseColdH10.metrics.ySpanBefore} -> ${denseColdH10.metrics.ySpanAfter})`);
  assert.ok(denseColdH10.metrics.forks > 0 && denseColdH10.metrics.branchClusters > 0, 'Dense Cold should exercise structural forks and branch clusters');
  assert.ok(denseColdH10.metrics.deepBranchStarts > 0 && denseColdH10.metrics.authorDepthBands > 0, 'Dense Cold should exercise local author-depth preservation');
  assert.ok(denseColdH10.metrics.connectionPlanesAligned > 0, 'Dense Cold should exercise connector-plane alignment');
  assert.ok(denseColdH10.metrics.clusterCollisionsResolved > 0, 'Dense Cold should exercise the bottom-up branch collision pass');
  assert.equal(denseColdH10.metrics.semanticStructuralEdges, 0, 'Dense Cold Reader v2 should resolve all positioned structural edges');
  assert.ok(denseColdH10.metrics.maxXRescueShift < 300, `Dense Cold H10 must keep local Flow X rescues bounded (${denseColdH10.metrics.maxXRescueShift})`);
  assert.ok(denseColdH10.metrics.maxAttachmentContourShift < 500, `Dense Cold H10 attachment contour repair must stay local (${denseColdH10.metrics.maxAttachmentContourShift})`);
  assert.ok(denseColdH10.metrics.clusterShiftedNodes < 100, `Dense Cold H10 should not move a large fraction of the graph with Flow clusters (${denseColdH10.metrics.clusterShiftedNodes})`);
  assert.ok(denseColdH10.metrics.edgeNodeIntersectionsBefore > 0, 'Dense Cold must exercise the Edge Corridor wire/node audit before repair');
  assert.equal(denseColdH10.metrics.edgeNodeIntersectionsAfter, 0, 'Dense Cold routing-aware repair must leave no same-domain flow wire crossing foreign node geometry');
  assert.ok(denseColdH10.metrics.edgeCorridorRepairs > 0, 'Dense Cold must exercise routing-aware branch corridor repair');
  assert.ok(denseColdH10.metrics.maxEdgeCorridorShift > 500 && denseColdH10.metrics.maxEdgeCorridorShift < 1400,
    `Dense Cold should restore the real rear-branch routing corridor instead of suppressing the former ~1k separation (${denseColdH10.metrics.maxEdgeCorridorShift})`);
  assert.ok(denseColdH10.metrics.flowLanes > 0 && denseColdH10.metrics.flowLaneEdges > denseColdH10.metrics.flowLanes, 'Dense Cold should expose multi-edge author Flow lanes');
  assert.ok(denseColdH10.metrics.laneRealignments > 0, 'Dense Cold should exercise the final safe Flow-lane relaxation after contour/routing repairs');
  assert.ok(denseColdH10.metrics.maxConnectionPlaneDeviationAfter <= denseColdH10.metrics.maxConnectionPlaneDeviationBefore, 'Flow Lane Normalize must never worsen maximum connector-plane deviation');
  assert.ok(denseColdH10.metrics.medianConnectionPlaneDeviationAfter <= denseColdH10.metrics.medianConnectionPlaneDeviationBefore, 'Flow Lane Normalize must never worsen median connector-plane deviation');
  assert.ok(denseColdH10.metrics.maxLaneShift <= 110, `Flow Lane Normalize should remain a local Y relaxation (${denseColdH10.metrics.maxLaneShift})`);
  assert.ok(denseColdH10.metrics.flowVisualGroups > 0 && denseColdH10.metrics.chainRows > 0, 'Dense Cold should expose Author Grid visual modules and local chain rows');
  assert.ok(denseColdH10.metrics.authorColumnGuides > 0, 'Dense Cold should recover repeated cross-module author columns');
  assert.ok(denseColdH10.metrics.chainRowRealignments + denseColdH10.metrics.rowGuideRealignments + denseColdH10.metrics.columnGuideRealignments > 0, 'Dense Cold should exercise at least one final Author Grid correction');
  assert.ok(denseColdH10.metrics.maxRowGuideDeviationAfter <= denseColdH10.metrics.maxRowGuideDeviationBefore, 'Author Grid must not worsen cross-module row-guide spread');
  assert.ok(denseColdH10.metrics.maxColumnGuideDeviationAfter <= denseColdH10.metrics.maxColumnGuideDeviationBefore, 'Author Grid must not worsen cross-module column-guide spread');
  assert.ok(denseColdH10.metrics.maxAuthorGridShiftX <= 140 && denseColdH10.metrics.maxAuthorGridShiftY <= 140, 'Author Grid corrections should remain bounded cosmetic/module relaxations');

  const deepSumId = 'Sum.Density-d19c3ff2-2dc6-4e7c-827b-dcaf3ef725be';
  const immediateMaxId = 'Max.Density-263015e2-608d-4ff7-bbe4-34636370f77c';
  const targetValue = (nodeId, field) => denseColdH10.patches.find((patch) => patch.entityId === nodeId && patch.field === field)?.newValue;
  const deepX = Number(targetValue(deepSumId, '$Position.$x'));
  const deepY = Number(targetValue(deepSumId, '$Position.$y'));
  const immediateX = Number(targetValue(immediateMaxId, '$Position.$x'));
  assert.ok(Number.isFinite(deepX) && Number.isFinite(deepY) && Number.isFinite(immediateX));
  assert.ok(deepX > immediateX + 1000, `Dense Cold deep Sum branch must stay visually behind the immediate Max branch (${immediateX} -> ${deepX})`);
  assert.ok(Math.abs(deepY) < 5000, `Dense Cold deep Sum branch must not be thrown to the former +20k Y region (${deepY})`);
}

const floaterResults = [];
for (const floaterMode of ['pack', 'quarantine']) {
  const candidate = buildAuthorNormalizeLayoutProposal(graphFiles, {
    strategy: 'author-normalize', horizontalGap: 20, verticalGap: 70, alignmentTolerance: 72, includeLive: true, floaterMode,
  });
  assert.equal(candidate.blocked, false, `${floaterMode} proposal should not be blocked on the real project`);
  const floatingNodes = candidate.files.reduce((sum, file) => sum + file.metrics.floatingNodes, 0);
  const handled = candidate.files.reduce((sum, file) => sum + file.metrics.floatersHandled, 0);
  const overlapsAfter = candidate.files.reduce((sum, file) => sum + file.metrics.floaterOverlapsAfter, 0);
  assert.ok(floatingNodes > 0, 'real regression project should expose floating nodes');
  assert.ok(handled > 0, `${floaterMode} should move at least one floater`);
  assert.equal(overlapsAfter, 0, `${floaterMode} should leave no floater overlaps`);
  floaterResults.push({ floaterMode, floatingNodes, handled, overlapsAfter });
}
const staged = stageLayoutProposal(emptyChangeSet(), proposal);
assert.equal(staged.changes.length, proposal.patches.length);
const replacementProposal = gapProposals.get(20);
const restaged = stageLayoutProposal(staged, replacementProposal);
assert.equal(restaged.changes.filter((change) => change.source === 'layout').length, replacementProposal.patches.length,
  're-staging H20 must replace H10 layout changes for the same file scope');
const representativeX20 = replacementProposal.patches.find((patch) => patch.entityKind === 'node' && patch.field === '$Position.$x');
assert.ok(representativeX20);
const restagedX = restaged.changes.find((change) => change.fileId === representativeX20.fileId
  && JSON.stringify(change.jsonPath) === JSON.stringify(representativeX20.jsonPath));
assert.equal(restagedX?.newValue, representativeX20.newValue, 'replacement staging must carry the new H20 X target');
const restagedVertical = stageLayoutProposal(restaged, vertical140);
const representativeY140 = vertical140.patches.find((patch) => patch.entityKind === 'node' && patch.field === '$Position.$y'
  && y70.get(`${patch.fileId}|${patch.entityId}`) !== patch.newValue);
assert.ok(representativeY140, 'V140 should expose at least one changed Y target for staging verification');
const restagedY = restagedVertical.changes.find((change) => change.fileId === representativeY140.fileId
  && JSON.stringify(change.jsonPath) === JSON.stringify(representativeY140.jsonPath));
assert.equal(restagedY?.newValue, representativeY140.newValue, 'replacement staging must carry the new V140 Y target');
const verticalPreview = applyChangeSet(project, restagedVertical).project;
const verticalPreviewFile = verticalPreview.fileMap.get(representativeY140.fileId);
assert.ok(verticalPreviewFile);
const verticalPreviewMeta = buildEditorMetadataForFile(verticalPreviewFile);
assert.equal(verticalPreviewMeta.nodes.get(representativeY140.entityId)?.position?.y, representativeY140.newValue,
  'staged V140 target must persist into the actual rebuilt project metadata');
const preview = applyChangeSet(project, staged).project;
const diff = compareDiagnostics(project, preview);
assert.equal(diff.addedErrors.length, 0, 'position-only layout should not introduce semantic errors');
for (const fileProposal of proposal.files) {
  const file = preview.fileMap.get(fileProposal.fileId);
  assert.ok(file);
  const metadata = buildEditorMetadataForFile(file);
  const rootMeta = fileProposal.metrics.rootNodeId ? metadata.nodes.get(fileProposal.metrics.rootNodeId) : undefined;
  assert.deepEqual(rootMeta?.position && { x: rootMeta.position.x, y: rootMeta.position.y }, { x: 0, y: 0 }, `${fileProposal.filePath}: root must persist at 0,0`);
}
console.log(JSON.stringify({
  graphFiles: graphFiles.length,
  patches: proposal.patches.length,
  normalizedNodes: proposal.files.reduce((sum, file) => sum + file.metrics.normalizedNodes, 0),
  overlapsBefore: proposal.files.reduce((sum, file) => sum + file.metrics.nodeOverlapsBefore, 0),
  overlapsAfter: proposal.files.reduce((sum, file) => sum + file.metrics.nodeOverlapsAfter, 0),
  commentsTranslated: proposal.files.reduce((sum, file) => sum + file.metrics.translatedComments, 0),
  groupsTranslated: proposal.files.reduce((sum, file) => sum + file.metrics.translatedGroups, 0),
  treeRoots: proposal.files.reduce((sum, file) => sum + file.metrics.treeRoots, 0),
  forks: proposal.files.reduce((sum, file) => sum + file.metrics.forks, 0),
  branchClusters: proposal.files.reduce((sum, file) => sum + file.metrics.branchClusters, 0),
  laneSnaps: proposal.files.reduce((sum, file) => sum + file.metrics.laneSnaps, 0),
  connectionPlanesAligned: proposal.files.reduce((sum, file) => sum + file.metrics.connectionPlanesAligned, 0),
  deepBranchStarts: proposal.files.reduce((sum, file) => sum + file.metrics.deepBranchStarts, 0),
  authorDepthBands: proposal.files.reduce((sum, file) => sum + file.metrics.authorDepthBands, 0),
  authorDepthXRescues: proposal.files.reduce((sum, file) => sum + file.metrics.authorDepthXRescues, 0),
  contourXRescues: proposal.files.reduce((sum, file) => sum + file.metrics.contourXRescues, 0),
  semanticStructuralEdges: proposal.files.reduce((sum, file) => sum + file.metrics.semanticStructuralEdges, 0),
  attachmentContourRescues: proposal.files.reduce((sum, file) => sum + file.metrics.attachmentContourRescues, 0),
  attachmentContourShiftedNodes: proposal.files.reduce((sum, file) => sum + file.metrics.attachmentContourShiftedNodes, 0),
  maxAttachmentContourShift: Math.max(...proposal.files.map((file) => file.metrics.maxAttachmentContourShift)),
  routedFlowEdges: proposal.files.reduce((sum, file) => sum + file.metrics.routedFlowEdges, 0),
  flowEdgeNodeIntersectionsBefore: proposal.files.reduce((sum, file) => sum + file.metrics.edgeNodeIntersectionsBefore, 0),
  flowEdgeNodeIntersectionsAfter: proposal.files.reduce((sum, file) => sum + file.metrics.edgeNodeIntersectionsAfter, 0),
  flowCorridorIntrusionsAfter: proposal.files.reduce((sum, file) => sum + file.metrics.edgeNodeCorridorIntrusionsAfter, 0),
  edgeCorridorRepairs: proposal.files.reduce((sum, file) => sum + file.metrics.edgeCorridorRepairs, 0),
  edgeCorridorShiftedNodes: proposal.files.reduce((sum, file) => sum + file.metrics.edgeCorridorShiftedNodes, 0),
  maxEdgeCorridorShift: Math.max(...proposal.files.map((file) => file.metrics.maxEdgeCorridorShift)),
  attachmentEdgeNodeAudit: proposal.files.reduce((sum, file) => sum + file.metrics.attachmentEdgeNodeIntersectionsAfter, 0),
  edgeEdgeCrossingsAfter: proposal.files.reduce((sum, file) => sum + file.metrics.edgeEdgeCrossingsAfter, 0),
  flowLanes: proposal.files.reduce((sum, file) => sum + file.metrics.flowLanes, 0),
  flowLaneEdges: proposal.files.reduce((sum, file) => sum + file.metrics.flowLaneEdges, 0),
  laneRealignments: proposal.files.reduce((sum, file) => sum + file.metrics.laneRealignments, 0),
  laneRealignedNodes: proposal.files.reduce((sum, file) => sum + file.metrics.laneRealignedNodes, 0),
  laneNormalizationBlocked: proposal.files.reduce((sum, file) => sum + file.metrics.laneNormalizationBlocked, 0),
  visualRowEdges: proposal.files.reduce((sum, file) => sum + file.metrics.visualRowEdges, 0),
  visualRowAuthorJitterEdges: proposal.files.reduce((sum, file) => sum + file.metrics.visualRowAuthorJitterEdges, 0),
  visualRowMisalignedBefore: proposal.files.reduce((sum, file) => sum + file.metrics.visualRowMisalignedBefore, 0),
  visualRowMisalignedAfter: proposal.files.reduce((sum, file) => sum + file.metrics.visualRowMisalignedAfter, 0),
  visualRowRealignments: proposal.files.reduce((sum, file) => sum + file.metrics.visualRowRealignments, 0),
  maxVisualRowDeviationBefore: Math.max(...proposal.files.map((file) => file.metrics.maxVisualRowDeviationBefore)),
  maxVisualRowDeviationAfter: Math.max(...proposal.files.map((file) => file.metrics.maxVisualRowDeviationAfter)),
  flowVisualGroups: proposal.files.reduce((sum, file) => sum + file.metrics.flowVisualGroups, 0),
  chainRows: proposal.files.reduce((sum, file) => sum + file.metrics.chainRows, 0),
  authorRowGuides: proposal.files.reduce((sum, file) => sum + file.metrics.authorRowGuides, 0),
  authorColumnGuides: proposal.files.reduce((sum, file) => sum + file.metrics.authorColumnGuides, 0),
  chainRowsMisalignedBefore: proposal.files.reduce((sum, file) => sum + file.metrics.chainRowsMisalignedBefore, 0),
  chainRowsMisalignedAfter: proposal.files.reduce((sum, file) => sum + file.metrics.chainRowsMisalignedAfter, 0),
  rowGuidesAlignedBefore: proposal.files.reduce((sum, file) => sum + file.metrics.rowGuidesAlignedBefore, 0),
  rowGuidesAlignedAfter: proposal.files.reduce((sum, file) => sum + file.metrics.rowGuidesAlignedAfter, 0),
  columnGuidesAlignedBefore: proposal.files.reduce((sum, file) => sum + file.metrics.columnGuidesAlignedBefore, 0),
  columnGuidesAlignedAfter: proposal.files.reduce((sum, file) => sum + file.metrics.columnGuidesAlignedAfter, 0),
  authorGridMovedNodes: proposal.files.reduce((sum, file) => sum + file.metrics.authorGridMovedNodes, 0),
  authorGridBlocked: proposal.files.reduce((sum, file) => sum + file.metrics.authorGridBlocked, 0),
  maxAuthorGridShiftX: Math.max(...proposal.files.map((file) => file.metrics.maxAuthorGridShiftX)),
  maxAuthorGridShiftY: Math.max(...proposal.files.map((file) => file.metrics.maxAuthorGridShiftY)),
  maxLaneShift: Math.max(...proposal.files.map((file) => file.metrics.maxLaneShift)),
  maxLanePlaneDeviationBefore: Math.max(...proposal.files.map((file) => file.metrics.maxConnectionPlaneDeviationBefore)),
  maxLanePlaneDeviationAfter: Math.max(...proposal.files.map((file) => file.metrics.maxConnectionPlaneDeviationAfter)),
  clusterShiftedNodes: proposal.files.reduce((sum, file) => sum + file.metrics.clusterShiftedNodes, 0),
  maxXRescueShift: Math.max(...proposal.files.map((file) => file.metrics.maxXRescueShift)),
  maxYClusterShift: Math.max(...proposal.files.map((file) => file.metrics.maxClusterShift)),
  clusterCollisionsResolved: proposal.files.reduce((sum, file) => sum + file.metrics.clusterCollisionsResolved, 0),
  addedErrors: diff.addedErrors.length,
  canonicalRootsVerified: proposal.files.length,
  gapResults,
  floaterResults,
}, null, 2));
