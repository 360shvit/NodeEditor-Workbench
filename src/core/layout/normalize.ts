import { buildEditorMetadataForFile } from '../graph/editorMetadata.js';
import type { ProjectFile } from '../types.js';
import { overlapPairs, pairKey, rectBottom, rectContains, rectRight, unionRects } from './geometry.js';
import { snapshotLayoutFile } from './snapshot.js';
import { readLayoutGraphV2 } from './readerV2.js';
import { normalizeAuthorGrid } from './authorGrid.js';
import { routingCorridorPadding } from './edgeCorridor.js';
import { normalizeAuthorTree, type TreeTargetNode } from './treeNormalize.js';
import { createLayoutFileMetrics } from './metrics.js';
import {
  auditFlowRoutingSafety,
  auditLayoutSafety,
  isHardDagSafetyClean,
  isLayoutBlocked,
  layoutBlockReasons,
} from './safety.js';
import { buildStrategyProposal, strategyRegistry, type LayoutStrategyDefinition } from './strategy.js';
import { PlacementReasonBook, dagSidePlacementReason } from './reasons.js';
import { floaterRowTolerance } from './tolerances.js';
import type {
  GroupSnapshot,
  LayoutEngineSettings,
  LayoutFileProposal,
  LayoutProposal,
  LayoutRect,
  LayoutScalarPatch,
} from './types.js';

type TargetNode = TreeTargetNode;

const STRATEGY_DEFINITIONS = strategyRegistry([
  { id: 'normalize', buildFileProposal: createOriginNormalizeFileProposal },
  { id: 'author-normalize', buildFileProposal: createAuthorNormalizeFileProposal },
  { id: 'dag-rebuild', buildFileProposal: createDagRebuildFileProposal },
] satisfies LayoutStrategyDefinition[]);

function buildRegisteredStrategyProposal(
  files: ProjectFile[],
  settings: LayoutEngineSettings,
  strategy: LayoutStrategyDefinition['id'],
): LayoutProposal {
  const definition = STRATEGY_DEFINITIONS.get(strategy);
  if (!definition) throw new Error(`Unknown layout strategy: ${strategy}`);
  return buildStrategyProposal(files, settings, definition);
}

function cleanNumber(value: number): number {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function packFloaters(entries: TargetNode[], settings: LayoutEngineSettings, anchorX: number, anchorY: number): void {
  if (!entries.length) return;
  const ordered = [...entries].sort((a, b) => {
    const dy = a.source.canonicalRect.y - b.source.canonicalRect.y;
    return Math.abs(dy) > floaterRowTolerance(settings) ? dy : a.source.canonicalRect.x - b.source.canonicalRect.x;
  });
  const totalArea = ordered.reduce((sum, entry) => sum + entry.rect.width * entry.rect.height, 0);
  const widest = Math.max(...ordered.map((entry) => entry.rect.width));
  const targetRowWidth = Math.max(widest, Math.sqrt(Math.max(totalArea, 1)) * 1.8);
  let x = anchorX;
  let y = anchorY;
  let rowHeight = 0;
  let rowHasItems = false;
  for (const entry of ordered) {
    const wouldOverflow = rowHasItems && (x - anchorX + entry.rect.width) > targetRowWidth;
    if (wouldOverflow) {
      x = anchorX;
      y += rowHeight + settings.verticalGap;
      rowHeight = 0;
      rowHasItems = false;
    }
    entry.rect.x = cleanNumber(x);
    entry.rect.y = cleanNumber(y);
    x += entry.rect.width + settings.horizontalGap;
    rowHeight = Math.max(rowHeight, entry.rect.height);
    rowHasItems = true;
  }
}

function applyFloaterMode(targets: Map<string, TargetNode>, settings: LayoutEngineSettings): { count: number; handled: number; overlapsBefore: number; overlapsAfter: number } {
  const floaters = [...targets.values()].filter((entry) => entry.source.node.location === 'floating');
  const before = overlapPairs(floaters.map((entry) => ({ id: entry.source.node.id, rect: entry.source.canonicalRect }))).length;
  if (!floaters.length || settings.floaterMode === 'ignore') {
    return { count: floaters.length, handled: 0, overlapsBefore: before, overlapsAfter: before };
  }
  const canonicalBounds = unionRects(floaters.map((entry) => entry.source.canonicalRect));
  if (!canonicalBounds) return { count: 0, handled: 0, overlapsBefore: 0, overlapsAfter: 0 };
  let anchorX = canonicalBounds.x;
  let anchorY = canonicalBounds.y;
  if (settings.floaterMode === 'quarantine') {
    const liveBounds = unionRects([...targets.values()]
      .filter((entry) => entry.source.node.location === 'live')
      .map((entry) => entry.rect));
    if (liveBounds) {
      anchorX = liveBounds.x;
      anchorY = rectBottom(liveBounds) + Math.max(300, settings.verticalGap * 4);
    } else {
      anchorX = 0;
      anchorY = Math.max(300, settings.verticalGap * 4);
    }
  }
  packFloaters(floaters, settings, anchorX, anchorY);
  const after = overlapPairs(floaters.map((entry) => ({ id: entry.source.node.id, rect: entry.rect }))).length;
  const handled = floaters.filter((entry) => entry.rect.x !== entry.source.canonicalRect.x || entry.rect.y !== entry.source.canonicalRect.y).length;
  return { count: floaters.length, handled, overlapsBefore: before, overlapsAfter: after };
}

function groupDepth(group: GroupSnapshot, byId: Map<string, GroupSnapshot>): number {
  let depth = 0;
  let current = group.parentGroupId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    depth++;
    current = byId.get(current)?.parentGroupId;
  }
  return depth;
}

function rebuildGroupBounds(groups: GroupSnapshot[], targets: Map<string, TargetNode>): Map<string, LayoutRect> {
  const byId = new Map(groups.map((group) => [group.id, group]));
  const result = new Map(groups.map((group) => [group.id, { ...group.canonicalBounds }]));
  const ordered = [...groups].sort((a, b) => groupDepth(b, byId) - groupDepth(a, byId));

  for (const group of ordered) {
    const base = result.get(group.id)!;
    const contentRects = [
      ...group.memberNodeIds.map((id) => targets.get(id)?.rect).filter((rect): rect is LayoutRect => Boolean(rect)),
      ...group.memberGroupIds.map((id) => result.get(id)).filter((rect): rect is LayoutRect => Boolean(rect)),
    ];
    if (!contentRects.length) continue;
    const requiredLeft = Math.min(...contentRects.map((rect) => rect.x - group.padding.left));
    const requiredTop = Math.min(...contentRects.map((rect) => rect.y - group.padding.top));
    const requiredRight = Math.max(...contentRects.map((rect) => rectRight(rect) + group.padding.right));
    const requiredBottom = Math.max(...contentRects.map((rect) => rectBottom(rect) + group.padding.bottom));
    const left = Math.min(base.x, requiredLeft);
    const top = Math.min(base.y, requiredTop);
    const right = Math.max(rectRight(base), requiredRight);
    const bottom = Math.max(rectBottom(base), requiredBottom);
    result.set(group.id, {
      x: cleanNumber(left),
      y: cleanNumber(top),
      width: cleanNumber(right - left),
      height: cleanNumber(bottom - top),
    });
  }
  return result;
}


interface GroupAnchorRescueStats {
  groups: number;
  nodes: number;
  iterations: number;
}

function collectGroupNodeIds(groupId: string, groupsById: Map<string, GroupSnapshot>, out = new Set<string>()): Set<string> {
  const group = groupsById.get(groupId);
  if (!group) return out;
  for (const nodeId of group.memberNodeIds) out.add(nodeId);
  for (const childId of group.memberGroupIds) collectGroupNodeIds(childId, groupsById, out);
  return out;
}

function groupAuthoredContentBounds(group: GroupSnapshot): LayoutRect {
  const x = group.canonicalBounds.x + group.padding.left;
  const y = group.canonicalBounds.y + group.padding.top;
  const width = Math.max(0, group.canonicalBounds.width - group.padding.left - group.padding.right);
  const height = Math.max(0, group.canonicalBounds.height - group.padding.top - group.padding.bottom);
  return { x, y, width, height };
}

/**
 * Author groups are anchors, not disposable collision envelopes. If a cleanup
 * would expand an authored section into a previously separate group, restore
 * only the moved members that escaped their authored group bounds and re-audit.
 * This deliberately prefers a partial cleanup over a false whole-file block.
 */
function rescueAuthorGroupAnchors(
  groups: GroupSnapshot[],
  targets: Map<string, TargetNode>,
  originalOverlapKeys: Set<string>,
): { groupTargets: Map<string, LayoutRect>; newOverlaps: Array<[string, string]>; stats: GroupAnchorRescueStats } {
  const byId = new Map(groups.map((group) => [group.id, group]));
  const rescuedGroups = new Set<string>();
  const rescuedNodes = new Set<string>();
  let iterations = 0;
  let groupTargets = rebuildGroupBounds(groups, targets);
  let newOverlaps = overlapPairs(groups.map((group) => ({ id: group.id, rect: groupTargets.get(group.id) ?? group.canonicalBounds })))
    .filter(([a, b]) => !originalOverlapKeys.has(pairKey(a, b)));

  while (newOverlaps.length && iterations < Math.max(1, groups.length + 1)) {
    iterations++;
    let changed = false;
    const involved = new Set(newOverlaps.flat());
    for (const groupId of involved) {
      const group = byId.get(groupId);
      if (!group) continue;
      const contentBounds = groupAuthoredContentBounds(group);
      const escaping = [...collectGroupNodeIds(groupId, byId)]
        .map((nodeId) => [nodeId, targets.get(nodeId)] as const)
        .filter((entry): entry is readonly [string, TargetNode] => Boolean(entry[1]) && !rectContains(contentBounds, entry[1]!.rect));
      if (!escaping.length) continue;

      const cluster = unionRects(escaping.map(([, target]) => target.rect));
      let moved = false;
      if (cluster && cluster.width <= contentBounds.width && cluster.height <= contentBounds.height) {
        let dx = 0;
        let dy = 0;
        if (cluster.x < contentBounds.x) dx = contentBounds.x - cluster.x;
        else if (rectRight(cluster) > rectRight(contentBounds)) dx = rectRight(contentBounds) - rectRight(cluster);
        if (cluster.y < contentBounds.y) dy = contentBounds.y - cluster.y;
        else if (rectBottom(cluster) > rectBottom(contentBounds)) dy = rectBottom(contentBounds) - rectBottom(cluster);
        if (dx !== 0 || dy !== 0) {
          for (const [nodeId, target] of escaping) {
            target.rect.x = cleanNumber(target.rect.x + dx);
            target.rect.y = cleanNumber(target.rect.y + dy);
            rescuedNodes.add(nodeId);
          }
          moved = true;
        }
      }

      if (!moved) {
        // If the rebuilt escaped cluster is wider/taller than its authored section,
        // the only deterministic safe fallback is the original canonical placement.
        for (const [nodeId, target] of escaping) {
          const canonical = target.source.canonicalRect;
          if (target.rect.x === canonical.x && target.rect.y === canonical.y) continue;
          target.rect.x = canonical.x;
          target.rect.y = canonical.y;
          rescuedNodes.add(nodeId);
          moved = true;
        }
      }
      if (moved) {
        rescuedGroups.add(groupId);
        changed = true;
      }
    }
    if (!changed) break;
    groupTargets = rebuildGroupBounds(groups, targets);
    newOverlaps = overlapPairs(groups.map((group) => ({ id: group.id, rect: groupTargets.get(group.id) ?? group.canonicalBounds })))
      .filter(([a, b]) => !originalOverlapKeys.has(pairKey(a, b)));
  }

  return {
    groupTargets,
    newOverlaps,
    stats: { groups: rescuedGroups.size, nodes: rescuedNodes.size, iterations },
  };
}

function makePatch(
  file: ProjectFile,
  entityId: string,
  entityKind: LayoutScalarPatch['entityKind'],
  location: LayoutScalarPatch['location'],
  field: string,
  path: Array<string | number>,
  oldValue: number,
  newValue: number,
): LayoutScalarPatch | undefined {
  const cleaned = cleanNumber(newValue);
  if (oldValue === cleaned) return undefined;
  return {
    fileId: file.id,
    filePath: file.path,
    entityId,
    entityKind,
    location,
    field,
    jsonPath: path,
    oldValue,
    newValue: cleaned,
  };
}


function createAuthorNormalizeFileProposal(file: ProjectFile, settings: LayoutEngineSettings): LayoutFileProposal {
  const snapshot = snapshotLayoutFile(file);
  const metadata = buildEditorMetadataForFile(file);
  const warnings: string[] = [];
  const patches: LayoutScalarPatch[] = [];
  if (!snapshot.root) warnings.push('No positioned live root node could be resolved; layout is blocked for this file.');
  if (snapshot.unsupportedGroups.length) warnings.push(`${snapshot.unsupportedGroups.length} group(s) do not expose complete $Position/$width/$height metadata.`);

  const targets = new Map<string, TargetNode>();
  for (const [nodeId, entry] of snapshot.nodes) targets.set(nodeId, { source: entry, rect: { ...entry.canonicalRect } });

  // Normalize the live author graph only. Explicit floating nodes are handled by
  // the independent floater policy below; they never get mixed into author columns.
  const liveEligibleIds = new Set([...targets.values()]
    .filter(({ source }) => source.node.location === 'live' && settings.includeLive)
    .map(({ source }) => source.node.id));

  // Structural JSON nesting still owns containment, but Reader v2 classifies
  // each relation before packing: same-domain flow edges drive branches while
  // typed attachments stay owner-bound and use local geometry padding.
  const liveEntries = [...liveEligibleIds]
    .map((nodeId) => targets.get(nodeId))
    .filter((entry): entry is TargetNode => Boolean(entry));
  const semanticGraph = readLayoutGraphV2(file, 'live', { positionedOnly: true });
  const treeStats = normalizeAuthorTree(liveEntries, settings, snapshot.root?.node.id, semanticGraph.edges);
  const liveTargetMap = new Map(liveEntries.map((entry) => [entry.source.node.id, entry]));
  const authorGridStats = normalizeAuthorGrid(liveTargetMap, semanticGraph.edges, settings, snapshot.root?.node.id);
  if (snapshot.root && targets.has(snapshot.root.node.id)) {
    targets.get(snapshot.root.node.id)!.rect.x = 0;
    targets.get(snapshot.root.node.id)!.rect.y = 0;
  }

  const floaterMetrics = applyFloaterMode(targets, settings);

  // Author groups are safety anchors. Repair proposal-induced group expansion
  // before materializing patches, then audit the actual rescued geometry.
  const groupRescue = rescueAuthorGroupAnchors(snapshot.groups, targets, snapshot.originalGroupOverlapKeys);
  const groupTargets = groupRescue.groupTargets;
  const originalGroupRects = snapshot.groups.map((group) => ({ id: group.id, rect: group.originalBounds }));
  const finalGroupRects = snapshot.groups.map((group) => ({ id: group.id, rect: groupTargets.get(group.id) ?? group.canonicalBounds }));
  const groupOverlapsBeforePairs = overlapPairs(originalGroupRects);
  const groupOverlapsAfterPairs = overlapPairs(finalGroupRects);
  const newGroupOverlaps = groupRescue.newOverlaps;
  const finalLiveTargets = new Map([...targets.entries()].filter(([id]) => liveEligibleIds.has(id)));
  const finalLiveEdges = semanticGraph.edges.filter((edge) => liveEligibleIds.has(edge.parentId) && liveEligibleIds.has(edge.childId));
  const finalSafety = auditLayoutSafety(finalLiveTargets, finalLiveEdges, routingCorridorPadding(settings.horizontalGap));

  // Overlap and span metrics describe the active live Author Normalize population only.
  // Floaters have separate metrics and never distort the author-graph measurement.
  const originalNodeRects = [...snapshot.nodes.values()]
    .filter((entry) => liveEligibleIds.has(entry.node.id))
    .map((entry) => ({ id: entry.node.id, rect: entry.rect }));
  const finalNodeRects = [...targets.entries()]
    .filter(([id]) => liveEligibleIds.has(id))
    .map(([id, entry]) => ({ id, rect: entry.rect }));
  const nodeOverlapsBefore = overlapPairs(originalNodeRects).length;
  const nodeOverlapsAfter = overlapPairs(finalNodeRects).length;
  const originalLiveBounds = unionRects(originalNodeRects.map((item) => item.rect));
  const finalLiveBounds = unionRects(finalNodeRects.map((item) => item.rect));
  const xSpanBefore = cleanNumber(originalLiveBounds?.width ?? 0);
  const xSpanAfter = cleanNumber(finalLiveBounds?.width ?? 0);
  const ySpanBefore = cleanNumber(originalLiveBounds?.height ?? 0);
  const ySpanAfter = cleanNumber(finalLiveBounds?.height ?? 0);

  let translatedNodes = 0;
  let normalizedNodes = 0;
  let xNormalizedNodes = 0;
  let yNormalizedNodes = 0;
  for (const [nodeId, target] of targets) {
    const source = target.source;
    if (source.rect.x !== source.canonicalRect.x || source.rect.y !== source.canonicalRect.y) translatedNodes++;
    if (target.rect.x !== source.canonicalRect.x || target.rect.y !== source.canonicalRect.y) normalizedNodes++;
    if (target.rect.x !== source.canonicalRect.x) xNormalizedNodes++;
    if (target.rect.y !== source.canonicalRect.y) yNormalizedNodes++;
    const xPatch = makePatch(file, nodeId, 'node', source.node.location, '$Position.$x', source.xPath, source.rect.x, target.rect.x);
    const yPatch = makePatch(file, nodeId, 'node', source.node.location, '$Position.$y', source.yPath, source.rect.y, target.rect.y);
    if (xPatch) patches.push(xPatch);
    if (yPatch) patches.push(yPatch);
  }

  let translatedGroups = 0;
  let resizedGroups = 0;
  for (const group of snapshot.groups) {
    const source = metadata.groups.find((item) => item.id === group.id);
    const target = groupTargets.get(group.id);
    if (!source?.position || source.width === undefined || source.height === undefined || !source.widthPath || !source.heightPath || !target) continue;
    if (source.position.x !== group.canonicalBounds.x || source.position.y !== group.canonicalBounds.y) translatedGroups++;
    if (target.width !== group.canonicalBounds.width || target.height !== group.canonicalBounds.height || target.x !== group.canonicalBounds.x || target.y !== group.canonicalBounds.y) resizedGroups++;
    for (const patch of [
      makePatch(file, group.id, 'group', 'live', '$Position.$x', source.position.xPath, source.position.x, target.x),
      makePatch(file, group.id, 'group', 'live', '$Position.$y', source.position.yPath, source.position.y, target.y),
      makePatch(file, group.id, 'group', 'live', '$width', source.widthPath, source.width, target.width),
      makePatch(file, group.id, 'group', 'live', '$height', source.heightPath, source.height, target.height),
    ]) if (patch) patches.push(patch);
  }

  let translatedComments = 0;
  for (const comment of metadata.comments) {
    if (!comment.position) continue;
    const targetX = comment.position.x + snapshot.originOffset.x;
    const targetY = comment.position.y + snapshot.originOffset.y;
    if (targetX !== comment.position.x || targetY !== comment.position.y) translatedComments++;
    const xPatch = makePatch(file, comment.id, 'comment', 'live', '$Position.$x', comment.position.xPath, comment.position.x, targetX);
    const yPatch = makePatch(file, comment.id, 'comment', 'live', '$Position.$y', comment.position.yPath, comment.position.y, targetY);
    if (xPatch) patches.push(xPatch);
    if (yPatch) patches.push(yPatch);
  }

  if (groupRescue.stats.nodes > 0) warnings.push(`${groupRescue.stats.nodes} moved node(s) in ${groupRescue.stats.groups} author group section(s) were constrained back inside their authored group bounds to avoid a new group overlap.`);
  if (snapshot.groupResolution.assignedByCenter > 0) warnings.push(`${snapshot.groupResolution.assignedByCenter} live node(s) were assigned to an author group by center-point fallback because their visual bounds slightly exceeded the group.`);
  if (snapshot.groupResolution.ambiguous.length > 0) warnings.push(`${snapshot.groupResolution.ambiguous.length} live node(s) fit multiple non-nested author groups; staging is blocked instead of guessing membership.`);
  if (snapshot.groupResolution.ambiguousParents.length > 0) warnings.push(`${snapshot.groupResolution.ambiguousParents.length} author group(s) fit multiple non-nested parent groups; staging is blocked instead of guessing hierarchy.`);
  if (newGroupOverlaps.length) warnings.push(`${newGroupOverlaps.length} new group overlap(s) remain after group-anchor rescue; staging is blocked.`);
  if (snapshot.unsupportedGroups.length) warnings.push('Group overlap validation is incomplete; staging is blocked until all group bounds are readable.');
  if (nodeOverlapsAfter > 0) warnings.push(`${nodeOverlapsAfter} live-node overlap(s) remain after Tree Normalize; staging is blocked.`);
  if (finalSafety.flow.edgeNodeIntersections > 0) warnings.push(`${finalSafety.flow.edgeNodeIntersections} flow connection(s) still intersect foreign node geometry after Author Grid / group-anchor rescue; staging is blocked.`);
  if (finalSafety.attachment.edgeNodeIntersections > 0) warnings.push(`${finalSafety.attachment.edgeNodeIntersections} typed attachment connection/node intersection(s) remain in the final routing audit; attachment routing is advisory in Author Normalize.`);
  if (treeStats.laneNormalizationBlocked > 0) warnings.push(`${treeStats.laneNormalizationBlocked} Flow-lane re-alignment(s) were kept off their target plane because the final safety audit rejected the Y relaxation; max remaining lane deviation ${Math.round(treeStats.maxConnectionPlaneDeviationAfter)} px.`);
  if (authorGridStats.authorGridBlocked > 0) warnings.push(`${authorGridStats.authorGridBlocked} Author Grid guide/row correction(s) were left off their authored visual guide because the bounded safety audit rejected the move.`);
  if (authorGridStats.pixelAlignmentBlocked > 0) warnings.push(`${authorGridStats.pixelAlignmentBlocked} typed attachment pixel-alignment set(s) were left off an exact row/column because the final safety audit rejected the move.`);
  if (finalSafety.all.edgeEdgeCrossings > 0) warnings.push(`${finalSafety.all.edgeEdgeCrossings} unrelated connection crossing(s) remain after Author Grid / group-anchor rescue.`);
  if (settings.floaterMode !== 'ignore' && floaterMetrics.overlapsAfter > 0) warnings.push(`${floaterMetrics.overlapsAfter} floating-node overlap(s) remain after ${settings.floaterMode}; staging is blocked.`);

  const blockState = {
    missingRoot: !snapshot.root,
    unsupportedGroups: snapshot.unsupportedGroups.length,
    ambiguousGroupMemberships: snapshot.groupResolution.ambiguous.length,
    ambiguousGroupParents: snapshot.groupResolution.ambiguousParents.length,
    newGroupOverlaps: newGroupOverlaps.length,
    nodeOverlaps: nodeOverlapsAfter,
    flowEdgeNodeIntersections: finalSafety.flow.edgeNodeIntersections,
    floaterOverlaps: floaterMetrics.overlapsAfter,
    blockOnFloaterOverlaps: settings.floaterMode !== 'ignore',
  };
  const blockReasons = layoutBlockReasons(blockState);
  const blocked = isLayoutBlocked(blockState);
  if (semanticGraph.stats.structuralForks > semanticGraph.stats.flowForks) {
    warnings.push(`Reader v2 sees ${semanticGraph.stats.flowForks} same-domain flow fork(s) vs ${semanticGraph.stats.structuralForks} structural fork(s); ${semanticGraph.stats.attachmentFamilies} parent family/families contain typed attachments.`);
  }
  for (const warning of semanticGraph.warnings) warnings.push(`Reader v2: ${warning}`);
  return {
    fileId: file.id,
    filePath: file.path,
    patches,
    groups: snapshot.groups,
    metrics: createLayoutFileMetrics(file, settings, snapshot.root?.node.id, snapshot.originOffset, {
      positionedNodes: targets.size,
      translatedNodes,
      normalizedNodes,
      xNormalizedNodes,
      yNormalizedNodes,
      treeNodes: treeStats.treeNodes,
      treeRoots: treeStats.treeRoots,
      treeMaxDepth: treeStats.maxDepth,
      forks: treeStats.forks,
      branchClusters: treeStats.branchClusters,
      semanticFlowEdges: semanticGraph.stats.flowEdges,
      semanticAttachmentEdges: semanticGraph.stats.attachmentEdges,
      semanticOrderedAttachmentEdges: semanticGraph.stats.orderedAttachmentEdges,
      semanticStructuralEdges: semanticGraph.stats.structuralEdges,
      semanticFlowForks: semanticGraph.stats.flowForks,
      semanticStructuralForks: semanticGraph.stats.structuralForks,
      semanticMixedParents: semanticGraph.stats.mixedParents,
      semanticAttachmentFamilies: semanticGraph.stats.attachmentFamilies,
      singleChildParents: treeStats.singleChildParents,
      laneSnaps: treeStats.laneSnaps,
      connectionPlanesAligned: treeStats.connectionPlanesAligned,
      portAlignmentFallbacks: treeStats.portAlignmentFallbacks,
      authorDepthBands: treeStats.authorDepthBands,
      deepBranchStarts: treeStats.deepBranchStarts,
      authorDepthXRescues: treeStats.authorDepthXRescues,
      contourXRescues: treeStats.contourXRescues,
      attachmentXAdjustments: treeStats.attachmentXAdjustments,
      maxAttachmentXAdjustment: treeStats.maxAttachmentXAdjustment,
      attachmentContourRescues: treeStats.attachmentContourRescues,
      attachmentContourShiftedNodes: treeStats.attachmentContourShiftedNodes,
      maxAttachmentContourShift: treeStats.maxAttachmentContourShift,
      routedFlowEdges: finalSafety.flow.routedEdges,
      edgeNodeIntersectionsBefore: treeStats.edgeNodeIntersectionsBefore,
      edgeNodeIntersectionsAfter: finalSafety.flow.edgeNodeIntersections,
      edgeNodeCorridorIntrusionsAfter: finalSafety.flow.edgeNodeCorridorIntrusions,
      edgeEdgeCrossingsAfter: finalSafety.all.edgeEdgeCrossings,
      attachmentEdgeNodeIntersectionsAfter: finalSafety.attachment.edgeNodeIntersections,
      edgeCorridorRepairs: treeStats.edgeCorridorRepairs,
      edgeCorridorShiftedNodes: treeStats.edgeCorridorShiftedNodes,
      maxEdgeCorridorShift: treeStats.maxEdgeCorridorShift,
      flowLanes: treeStats.flowLanes,
      flowLaneEdges: treeStats.flowLaneEdges,
      laneRealignments: treeStats.laneRealignments,
      laneRealignedNodes: treeStats.laneRealignedNodes,
      laneNormalizationBlocked: treeStats.laneNormalizationBlocked,
      visualRowEdges: treeStats.visualRowEdges,
      visualRowAuthorJitterEdges: treeStats.visualRowAuthorJitterEdges,
      visualRowMisalignedBefore: treeStats.visualRowMisalignedBefore,
      visualRowMisalignedAfter: treeStats.visualRowMisalignedAfter,
      visualRowRealignments: treeStats.visualRowRealignments,
      maxVisualRowDeviationBefore: treeStats.maxVisualRowDeviationBefore,
      maxVisualRowDeviationAfter: treeStats.maxVisualRowDeviationAfter,
      visualGroups: authorGridStats.visualGroups,
      flowVisualGroups: authorGridStats.flowVisualGroups,
      chainRows: authorGridStats.chainRows,
      chainRowEdges: authorGridStats.chainRowEdges,
      authorRowGuides: authorGridStats.authorRowGuides,
      authorColumnGuides: authorGridStats.authorColumnGuides,
      chainRowsMisalignedBefore: authorGridStats.chainRowsMisalignedBefore,
      chainRowsMisalignedAfter: authorGridStats.chainRowsMisalignedAfter,
      rowGuidesAlignedBefore: authorGridStats.rowGuidesAlignedBefore,
      rowGuidesAlignedAfter: authorGridStats.rowGuidesAlignedAfter,
      columnGuidesAlignedBefore: authorGridStats.columnGuidesAlignedBefore,
      columnGuidesAlignedAfter: authorGridStats.columnGuidesAlignedAfter,
      chainRowRealignments: authorGridStats.chainRowRealignments,
      rowGuideRealignments: authorGridStats.rowGuideRealignments,
      columnGuideRealignments: authorGridStats.columnGuideRealignments,
      authorGridMovedNodes: authorGridStats.authorGridMovedNodes,
      authorGridBlocked: authorGridStats.authorGridBlocked,
      maxAuthorGridShiftX: authorGridStats.maxAuthorGridShiftX,
      maxAuthorGridShiftY: authorGridStats.maxAuthorGridShiftY,
      maxRowGuideDeviationBefore: authorGridStats.maxRowGuideDeviationBefore,
      maxRowGuideDeviationAfter: authorGridStats.maxRowGuideDeviationAfter,
      maxColumnGuideDeviationBefore: authorGridStats.maxColumnGuideDeviationBefore,
      maxColumnGuideDeviationAfter: authorGridStats.maxColumnGuideDeviationAfter,
      attachmentPixelRows: authorGridStats.attachmentPixelRows,
      attachmentPixelRowsMisalignedBefore: authorGridStats.attachmentPixelRowsMisalignedBefore,
      attachmentPixelRowsMisalignedAfter: authorGridStats.attachmentPixelRowsMisalignedAfter,
      orderedAttachmentColumns: authorGridStats.orderedAttachmentColumns,
      orderedAttachmentColumnsMisalignedBefore: authorGridStats.orderedAttachmentColumnsMisalignedBefore,
      orderedAttachmentColumnsMisalignedAfter: authorGridStats.orderedAttachmentColumnsMisalignedAfter,
      pixelAlignmentRealignments: authorGridStats.pixelAlignmentRealignments,
      pixelAlignmentBlocked: authorGridStats.pixelAlignmentBlocked,
      maxPixelAlignmentShiftX: authorGridStats.maxPixelAlignmentShiftX,
      maxPixelAlignmentShiftY: authorGridStats.maxPixelAlignmentShiftY,
      maxLaneShift: treeStats.maxLaneShift,
      maxConnectionPlaneDeviationBefore: treeStats.maxConnectionPlaneDeviationBefore,
      medianConnectionPlaneDeviationBefore: treeStats.medianConnectionPlaneDeviationBefore,
      maxConnectionPlaneDeviationAfter: treeStats.maxConnectionPlaneDeviationAfter,
      medianConnectionPlaneDeviationAfter: treeStats.medianConnectionPlaneDeviationAfter,
      xRescueShiftedNodes: treeStats.xRescueShiftedNodes,
      maxXRescueShift: treeStats.maxXRescueShift,
      clusterCollisionsResolved: treeStats.clusterCollisionsResolved,
      clusterShiftedNodes: treeStats.clusterShiftedNodes,
      maxClusterShift: treeStats.maxClusterShift,
      xSpanBefore,
      xSpanAfter,
      ySpanBefore,
      ySpanAfter,
      translatedComments,
      translatedGroups,
      resizedGroups,
      nodeOverlapsBefore,
      nodeOverlapsAfter,
      floatingNodes: floaterMetrics.count,
      floatersHandled: floaterMetrics.handled,
      floaterOverlapsBefore: floaterMetrics.overlapsBefore,
      floaterOverlapsAfter: floaterMetrics.overlapsAfter,
      groupOverlapsBefore: groupOverlapsBeforePairs.length,
      groupOverlapsAfter: groupOverlapsAfterPairs.length,
      newGroupOverlaps,
      groupMembershipByBounds: snapshot.groupResolution.assignedByBounds,
      groupMembershipByCenter: snapshot.groupResolution.assignedByCenter,
      groupMembershipAmbiguous: snapshot.groupResolution.ambiguous.length,
      groupParentAmbiguous: snapshot.groupResolution.ambiguousParents.length,
      groupAnchorRescues: groupRescue.stats.groups,
      groupAnchorRescuedNodes: groupRescue.stats.nodes,
      blockReasons,
      warnings,
      blocked,
    }),
  };
}

export function buildAuthorNormalizeLayoutProposal(files: ProjectFile[], settings: LayoutEngineSettings): LayoutProposal {
  return buildRegisteredStrategyProposal(files, settings, 'author-normalize');
}

function createOriginNormalizeFileProposal(file: ProjectFile, settings: LayoutEngineSettings): LayoutFileProposal {
  const snapshot = snapshotLayoutFile(file);
  const metadata = buildEditorMetadataForFile(file);
  const warnings: string[] = [];
  const patches: LayoutScalarPatch[] = [];
  if (!snapshot.root) warnings.push('No positioned live root node could be resolved; origin Normalize is blocked for this file.');

  let translatedNodes = 0;
  for (const [nodeId, source] of snapshot.nodes) {
    const target = source.canonicalRect;
    if (source.rect.x !== target.x || source.rect.y !== target.y) translatedNodes++;
    const xPatch = makePatch(file, nodeId, 'node', source.node.location, '$Position.$x', source.xPath, source.rect.x, target.x);
    const yPatch = makePatch(file, nodeId, 'node', source.node.location, '$Position.$y', source.yPath, source.rect.y, target.y);
    if (xPatch) patches.push(xPatch);
    if (yPatch) patches.push(yPatch);
  }

  let translatedGroups = 0;
  for (const group of metadata.groups) {
    if (!group.position) continue;
    const targetX = group.position.x + snapshot.originOffset.x;
    const targetY = group.position.y + snapshot.originOffset.y;
    if (targetX !== group.position.x || targetY !== group.position.y) translatedGroups++;
    const xPatch = makePatch(file, group.id, 'group', 'live', '$Position.$x', group.position.xPath, group.position.x, targetX);
    const yPatch = makePatch(file, group.id, 'group', 'live', '$Position.$y', group.position.yPath, group.position.y, targetY);
    if (xPatch) patches.push(xPatch);
    if (yPatch) patches.push(yPatch);
  }

  let translatedComments = 0;
  for (const comment of metadata.comments) {
    if (!comment.position) continue;
    const targetX = comment.position.x + snapshot.originOffset.x;
    const targetY = comment.position.y + snapshot.originOffset.y;
    if (targetX !== comment.position.x || targetY !== comment.position.y) translatedComments++;
    const xPatch = makePatch(file, comment.id, 'comment', 'live', '$Position.$x', comment.position.xPath, comment.position.x, targetX);
    const yPatch = makePatch(file, comment.id, 'comment', 'live', '$Position.$y', comment.position.yPath, comment.position.y, targetY);
    if (xPatch) patches.push(xPatch);
    if (yPatch) patches.push(yPatch);
  }

  const liveOriginal = [...snapshot.nodes.values()]
    .filter((entry) => entry.node.location === 'live')
    .map((entry) => ({ id: entry.node.id, rect: entry.rect }));
  const liveCanonical = [...snapshot.nodes.values()]
    .filter((entry) => entry.node.location === 'live')
    .map((entry) => ({ id: entry.node.id, rect: entry.canonicalRect }));
  const originalBounds = unionRects(liveOriginal.map((item) => item.rect));
  const canonicalBounds = unionRects(liveCanonical.map((item) => item.rect));
  const nodeOverlaps = overlapPairs(liveOriginal).length;
  const floaters = [...snapshot.nodes.values()].filter((entry) => entry.node.location === 'floating');
  const floaterOverlaps = overlapPairs(floaters.map((entry) => ({ id: entry.node.id, rect: entry.rect }))).length;
  const groupRects = snapshot.groups.map((group) => ({ id: group.id, rect: group.originalBounds }));
  const groupOverlaps = overlapPairs(groupRects).length;

  return {
    fileId: file.id,
    filePath: file.path,
    patches,
    groups: snapshot.groups,
    metrics: createLayoutFileMetrics(file, settings, snapshot.root?.node.id, snapshot.originOffset, {
      positionedNodes: snapshot.nodes.size,
      translatedNodes,
      // Pure Normalize performs no structural/layout normalization beyond the rigid origin translation.
      normalizedNodes: 0,
      xNormalizedNodes: 0,
      yNormalizedNodes: 0,
      xSpanBefore: cleanNumber(originalBounds?.width ?? 0),
      xSpanAfter: cleanNumber(canonicalBounds?.width ?? 0),
      ySpanBefore: cleanNumber(originalBounds?.height ?? 0),
      ySpanAfter: cleanNumber(canonicalBounds?.height ?? 0),
      translatedComments,
      translatedGroups,
      nodeOverlapsBefore: nodeOverlaps,
      nodeOverlapsAfter: nodeOverlaps,
      floatingNodes: floaters.length,
      floatersHandled: floaters.filter((entry) => entry.rect.x !== entry.canonicalRect.x || entry.rect.y !== entry.canonicalRect.y).length,
      floaterOverlapsBefore: floaterOverlaps,
      floaterOverlapsAfter: floaterOverlaps,
      groupOverlapsBefore: groupOverlaps,
      groupOverlapsAfter: groupOverlaps,
      warnings,
      blocked: !snapshot.root,
      // Keep these counts available for diagnostics without implying extra layout work.
      dagLevels: 0,
      dagEffectiveVerticalGap: 0,
      dagSafetyPasses: 0,
    }),
  };
}

export function buildNormalizeLayoutProposal(files: ProjectFile[], settings: LayoutEngineSettings): LayoutProposal {
  return buildRegisteredStrategyProposal(files, settings, 'normalize');
}

function rebuildGroupBoundsTight(groups: GroupSnapshot[], targets: Map<string, TargetNode>): Map<string, LayoutRect> {
  const byId = new Map(groups.map((group) => [group.id, group]));
  const result = new Map<string, LayoutRect>();
  const ordered = [...groups].sort((a, b) => groupDepth(b, byId) - groupDepth(a, byId));
  for (const group of ordered) {
    const contentRects = [
      ...group.memberNodeIds.map((id) => targets.get(id)?.rect).filter((rect): rect is LayoutRect => Boolean(rect)),
      ...group.memberGroupIds.map((id) => result.get(id)).filter((rect): rect is LayoutRect => Boolean(rect)),
    ];
    if (!contentRects.length) {
      result.set(group.id, { ...group.canonicalBounds });
      continue;
    }
    const left = Math.min(...contentRects.map((rect) => rect.x)) - group.padding.left;
    const top = Math.min(...contentRects.map((rect) => rect.y)) - group.padding.top;
    const right = Math.max(...contentRects.map(rectRight)) + group.padding.right;
    const bottom = Math.max(...contentRects.map(rectBottom)) + group.padding.bottom;
    result.set(group.id, {
      x: cleanNumber(left),
      y: cleanNumber(top),
      width: cleanNumber(right - left),
      height: cleanNumber(bottom - top),
    });
  }
  return result;
}

function dagRolePriority(role: 'flow' | 'attachment' | 'ordered-attachment' | 'structural'): number {
  if (role === 'flow') return 0;
  if (role === 'attachment') return 1;
  if (role === 'ordered-attachment') return 2;
  return 3;
}

function dagEdgeOrder(a: ReturnType<typeof readLayoutGraphV2>['edges'][number], b: ReturnType<typeof readLayoutGraphV2>['edges'][number]): number {
  const role = dagRolePriority(a.role) - dagRolePriority(b.role);
  if (role) return role;
  const indexA = a.index ?? Number.MAX_SAFE_INTEGER;
  const indexB = b.index ?? Number.MAX_SAFE_INTEGER;
  if (indexA !== indexB) return indexA - indexB;
  const field = (a.field ?? '').localeCompare(b.field ?? '');
  if (field) return field;
  return a.childId.localeCompare(b.childId);
}

interface DagPlacementStats {
  roots: string[];
  maxDepth: number;
  levels: number;
  forks: number;
  branchClusters: number;
  singleChildParents: number;
  placementReasons: PlacementReasonBook;
}

function placeDag(
  targets: Map<string, TargetNode>,
  edges: ReturnType<typeof readLayoutGraphV2>['edges'],
  preferredRootId: string | undefined,
  horizontalGap: number,
  verticalGap: number,
  branchDirection: 'auto' | 'up' | 'down' | 'type' = 'auto',
): DagPlacementStats {
  if (!targets.size) return { roots: [], maxDepth: 0, levels: 0, forks: 0, branchClusters: 0, singleChildParents: 0, placementReasons: new PlacementReasonBook() };

  const placementReasons = new PlacementReasonBook();

  // X-depth is derived from the complete DAG. Y-placement uses a deterministic
  // primary-parent forest so a shared child is never positioned twice.
  const allChildrenByParent = new Map<string, typeof edges>();
  const incomingByChild = new Map<string, typeof edges>();
  for (const edge of edges) {
    if (!targets.has(edge.parentId) || !targets.has(edge.childId)) continue;
    allChildrenByParent.set(edge.parentId, [...(allChildrenByParent.get(edge.parentId) ?? []), edge]);
    incomingByChild.set(edge.childId, [...(incomingByChild.get(edge.childId) ?? []), edge]);
  }
  for (const [parentId, items] of allChildrenByParent) allChildrenByParent.set(parentId, [...items].sort(dagEdgeOrder));

  const parentByChild = new Map<string, string>();
  const childrenByParent = new Map<string, typeof edges>();
  for (const [childId, incoming] of incomingByChild) {
    const primary = [...incoming].sort((a, b) => {
      const semantic = dagEdgeOrder(a, b);
      if (semantic) return semantic;
      return a.parentId.localeCompare(b.parentId);
    })[0];
    if (!primary) continue;
    parentByChild.set(childId, primary.parentId);
    childrenByParent.set(primary.parentId, [...(childrenByParent.get(primary.parentId) ?? []), primary]);
  }
  for (const [parentId, items] of childrenByParent) childrenByParent.set(parentId, [...items].sort(dagEdgeOrder));

  const discoveredRoots = [...targets.keys()].filter((id) => !parentByChild.has(id)).sort((a, b) => a.localeCompare(b));
  const roots = preferredRootId && discoveredRoots.includes(preferredRootId)
    ? [preferredRootId, ...discoveredRoots.filter((id) => id !== preferredRootId)]
    : discoveredRoots;
  if (!roots.length && targets.size) roots.push(preferredRootId && targets.has(preferredRootId) ? preferredRootId : [...targets.keys()].sort()[0]);

  // Longest-path depth keeps all DAG edges forward even when a shared child is
  // owned by only one primary parent for Y placement.
  const depths = new Map<string, number>();
  const assignDepth = (nodeId: string, depth: number, stack = new Set<string>()) => {
    if (stack.has(nodeId)) return;
    const previous = depths.get(nodeId);
    if (previous !== undefined && previous >= depth) return;
    depths.set(nodeId, depth);
    const nextStack = new Set(stack).add(nodeId);
    for (const edge of allChildrenByParent.get(nodeId) ?? []) assignDepth(edge.childId, depth + 1, nextStack);
  };
  for (const root of roots) assignDepth(root, 0);
  for (const nodeId of targets.keys()) if (!depths.has(nodeId)) assignDepth(nodeId, 0);
  const maxDepth = Math.max(0, ...depths.values());

  const columnWidths = Array.from({ length: maxDepth + 1 }, () => 0);
  for (const [nodeId, depth] of depths) columnWidths[depth] = Math.max(columnWidths[depth], targets.get(nodeId)?.rect.width ?? 0);
  const columnX = Array.from({ length: maxDepth + 1 }, () => 0);
  for (let depth = 1; depth <= maxDepth; depth++) columnX[depth] = cleanNumber(columnX[depth - 1] + columnWidths[depth - 1] + horizontalGap);
  for (const [nodeId, depth] of depths) {
    targets.get(nodeId)!.rect.x = columnX[depth];
    placementReasons.add(nodeId, 'dag-depth-column');
  }

  // Chain-first main-child selection: semantic Flow wins over attachments; among
  // peers, prefer the child that continues through the longest straight 1->1
  // chain. This keeps the most readable continuation on the parent Y lane.
  const straightChainMemo = new Map<string, number>();
  const straightChainLength = (nodeId: string, stack = new Set<string>()): number => {
    const memo = straightChainMemo.get(nodeId);
    if (memo !== undefined) return memo;
    if (stack.has(nodeId)) return 1;
    const children = (childrenByParent.get(nodeId) ?? []).filter((edge) => targets.has(edge.childId));
    if (children.length !== 1) {
      straightChainMemo.set(nodeId, 1);
      return 1;
    }
    const length = 1 + straightChainLength(children[0].childId, new Set(stack).add(nodeId));
    straightChainMemo.set(nodeId, length);
    return length;
  };

  const chooseMainChild = (children: typeof edges): typeof edges[number] => {
    return [...children].sort((a, b) => {
      const role = dagRolePriority(a.role) - dagRolePriority(b.role);
      if (role) return role;
      const chain = straightChainLength(b.childId) - straightChainLength(a.childId);
      if (chain) return chain;
      return dagEdgeOrder(a, b);
    })[0];
  };

  const isDensityBranch = (edge: typeof edges[number]): boolean => {
    // Reader v2 connection semantics are the primary signal: Density inputs
    // always route upward in Type mode, regardless of the owning node domain.
    // The node-kind fallback keeps legacy/structural edges deterministic when
    // a catalog connection type could not be resolved.
    if ((edge.connectionType ?? '').toLowerCase() === 'density.connection') return true;
    const childKind = targets.get(edge.childId)?.source.node.nodeKind ?? '';
    return childKind.endsWith('.Density');
  };

  interface DagShape {
    positions: Map<string, number>;
    minY: number;
    maxY: number;
  }
  const shapeMemo = new Map<string, DagShape>();
  const mergeShape = (into: Map<string, number>, shape: DagShape, offset: number) => {
    for (const [id, y] of shape.positions) if (!into.has(id)) into.set(id, cleanNumber(y + offset));
  };

  const buildShape = (nodeId: string, stack = new Set<string>()): DagShape => {
    const cached = shapeMemo.get(nodeId);
    if (cached) return cached;
    const node = targets.get(nodeId);
    if (!node || stack.has(nodeId)) {
      const height = node?.rect.height ?? 0;
      return { positions: new Map(node ? [[nodeId, 0]] : []), minY: 0, maxY: height };
    }
    const children = (childrenByParent.get(nodeId) ?? []).filter((edge) => targets.has(edge.childId));
    const nextStack = new Set(stack).add(nodeId);
    if (!children.length) {
      const leaf = { positions: new Map([[nodeId, 0]]), minY: 0, maxY: node.rect.height };
      shapeMemo.set(nodeId, leaf);
      return leaf;
    }

    const mainEdge = children.length === 1 ? children[0] : chooseMainChild(children);
    placementReasons.add(mainEdge.childId, 'dag-main-chain');
    const mainShape = buildShape(mainEdge.childId, nextStack);
    const sideEdges = children.filter((edge) => edge !== mainEdge);
    const sideShapes = sideEdges.map((edge) => ({ edge, shape: buildShape(edge.childId, nextStack) }));

    const compose = (direction: 'up' | 'down'): DagShape => {
      const positions = new Map<string, number>([[nodeId, 0]]);
      mergeShape(positions, mainShape, 0);
      let minY = Math.min(0, mainShape.minY);
      let maxY = Math.max(node.rect.height, mainShape.maxY);
      if (direction === 'down') {
        let boundary = maxY;
        for (const { shape } of sideShapes) {
          const offset = cleanNumber(boundary + verticalGap - shape.minY);
          mergeShape(positions, shape, offset);
          minY = Math.min(minY, offset + shape.minY);
          maxY = Math.max(maxY, offset + shape.maxY);
          boundary = Math.max(boundary, offset + shape.maxY);
        }
      } else {
        let boundary = minY;
        for (const { shape } of sideShapes) {
          const offset = cleanNumber(boundary - verticalGap - shape.maxY);
          mergeShape(positions, shape, offset);
          minY = Math.min(minY, offset + shape.minY);
          maxY = Math.max(maxY, offset + shape.maxY);
          boundary = Math.min(boundary, offset + shape.minY);
        }
      }
      return { positions, minY: cleanNumber(minY), maxY: cleanNumber(maxY) };
    };

    const composeTyped = (): DagShape => {
      const positions = new Map<string, number>([[nodeId, 0]]);
      mergeShape(positions, mainShape, 0);
      let minY = Math.min(0, mainShape.minY);
      let maxY = Math.max(node.rect.height, mainShape.maxY);
      let upBoundary = minY;
      let downBoundary = maxY;
      for (const { edge, shape } of sideShapes) {
        if (isDensityBranch(edge)) {
          const offset = cleanNumber(upBoundary - verticalGap - shape.maxY);
          mergeShape(positions, shape, offset);
          minY = Math.min(minY, offset + shape.minY);
          maxY = Math.max(maxY, offset + shape.maxY);
          upBoundary = Math.min(upBoundary, offset + shape.minY);
        } else {
          const offset = cleanNumber(downBoundary + verticalGap - shape.minY);
          mergeShape(positions, shape, offset);
          minY = Math.min(minY, offset + shape.minY);
          maxY = Math.max(maxY, offset + shape.maxY);
          downBoundary = Math.max(downBoundary, offset + shape.maxY);
        }
      }
      return { positions, minY: cleanNumber(minY), maxY: cleanNumber(maxY) };
    };

    let shape: DagShape;
    let resolvedSide: 'up' | 'down' | undefined;
    if (!sideShapes.length) {
      shape = compose('down'); // direction is irrelevant for a pure chain.
    } else if (branchDirection === 'up' || branchDirection === 'down') {
      resolvedSide = branchDirection;
      shape = compose(branchDirection);
    } else if (branchDirection === 'type') {
      // Main continuation always stays on Parent Y. Side subtrees are placed as
      // complete blocks: Density above, every other semantic domain below.
      shape = composeTyped();
      for (const { edge } of sideShapes) {
        const density = isDensityBranch(edge);
        placementReasons.add(edge.childId, dagSidePlacementReason(branchDirection, density, density ? 'up' : 'down'));
      }
    } else {
      const up = compose('up');
      const down = compose('down');
      const upHeight = up.maxY - up.minY;
      const downHeight = down.maxY - down.minY;
      // Prefer the smaller local contour; ties intentionally go down so Auto is
      // deterministic and visually stable between runs.
      resolvedSide = upHeight + 0.001 < downHeight ? 'up' : 'down';
      shape = resolvedSide === 'up' ? up : down;
    }
    if (resolvedSide) {
      for (const { edge } of sideShapes) placementReasons.add(edge.childId, dagSidePlacementReason(branchDirection, isDensityBranch(edge), resolvedSide));
    }
    shapeMemo.set(nodeId, shape);
    return shape;
  };

  const placed = new Set<string>();
  let componentTop = 0;
  const componentGap = Math.max(120, verticalGap * 4);
  const placeShape = (rootId: string) => {
    const shape = buildShape(rootId);
    const offset = cleanNumber(componentTop - shape.minY);
    for (const [nodeId, relativeY] of shape.positions) {
      const target = targets.get(nodeId);
      if (!target || placed.has(nodeId)) continue;
      target.rect.y = cleanNumber(relativeY + offset);
      placed.add(nodeId);
    }
    componentTop += (shape.maxY - shape.minY) + componentGap;
  };
  for (const root of roots) if (!placed.has(root)) placeShape(root);
  for (const nodeId of targets.keys()) if (!placed.has(nodeId)) placeShape(nodeId);

  const canonicalRoot = preferredRootId && targets.has(preferredRootId) ? preferredRootId : roots[0];
  const rootRect = canonicalRoot ? targets.get(canonicalRoot)?.rect : undefined;
  if (rootRect) {
    if (canonicalRoot) placementReasons.add(canonicalRoot, 'root-origin');
    const shiftX = -rootRect.x;
    const shiftY = -rootRect.y;
    for (const target of targets.values()) {
      target.rect.x = cleanNumber(target.rect.x + shiftX);
      target.rect.y = cleanNumber(target.rect.y + shiftY);
    }
  }

  const childCounts = [...childrenByParent.values()].map((items) => items.filter((edge) => targets.has(edge.childId)).length);
  return {
    roots,
    maxDepth,
    levels: maxDepth + 1,
    forks: childCounts.filter((count) => count >= 2).length,
    branchClusters: childCounts.filter((count) => count >= 2).reduce((sum, count) => sum + count, 0),
    singleChildParents: childCounts.filter((count) => count === 1).length,
    placementReasons,
  };
}

function createDagRebuildFileProposal(file: ProjectFile, settings: LayoutEngineSettings): LayoutFileProposal {
  const snapshot = snapshotLayoutFile(file);
  const metadata = buildEditorMetadataForFile(file);
  const warnings: string[] = [];
  const patches: LayoutScalarPatch[] = [];
  if (!snapshot.root) warnings.push('No positioned live root node could be resolved; DAG Rebuild is blocked for this file.');

  const targets = new Map<string, TargetNode>();
  for (const [nodeId, entry] of snapshot.nodes) targets.set(nodeId, { source: entry, rect: { ...entry.canonicalRect } });
  const liveIds = new Set([...targets.values()]
    .filter(({ source }) => source.node.location === 'live' && settings.includeLive)
    .map(({ source }) => source.node.id));
  const liveTargets = new Map([...targets.entries()].filter(([id]) => liveIds.has(id)));
  const semanticGraph = readLayoutGraphV2(file, 'live', { positionedOnly: true });
  const liveEdges = semanticGraph.edges.filter((edge) => liveIds.has(edge.parentId) && liveIds.has(edge.childId));
  const originalRoutingTargets = new Map([...liveTargets.entries()].map(([id, target]) => [id, { source: target.source, rect: { ...target.source.canonicalRect } }]));
  const corridorPadding = routingCorridorPadding(settings.horizontalGap);
  const flowBefore = auditFlowRoutingSafety(originalRoutingTargets, liveEdges, corridorPadding);

  let effectiveGap = Math.max(0, settings.verticalGap);
  let dagStats: DagPlacementStats = { roots: [], maxDepth: 0, levels: 0, forks: 0, branchClusters: 0, singleChildParents: 0, placementReasons: new PlacementReasonBook() };
  let safetyAfter = auditLayoutSafety(liveTargets, liveEdges, corridorPadding);
  let safetyPasses = 0;
  const gapStep = Math.max(30, Math.min(180, settings.verticalGap || 60));
  for (let attempt = 0; attempt < 8; attempt++) {
    safetyPasses = attempt + 1;
    dagStats = placeDag(liveTargets, liveEdges, snapshot.root?.node.id, settings.horizontalGap, effectiveGap, settings.dagBranchDirection ?? 'auto');
    safetyAfter = auditLayoutSafety(liveTargets, liveEdges, corridorPadding);
    if (isHardDagSafetyClean(safetyAfter)) break;
    effectiveGap += gapStep;
  }
  const flowAfter = safetyAfter.flow;
  const attachmentAfter = safetyAfter.attachment;
  const allAfter = safetyAfter.all;
  if (effectiveGap > settings.verticalGap) warnings.push(`DAG routing safety expanded the effective vertical sibling gap from ${settings.verticalGap} to ${effectiveGap} px.`);

  const floaterMetrics = applyFloaterMode(targets, settings);
  const originalNodeRects = [...snapshot.nodes.values()]
    .filter((entry) => liveIds.has(entry.node.id))
    .map((entry) => ({ id: entry.node.id, rect: entry.rect }));
  const finalNodeRects = [...targets.entries()]
    .filter(([id]) => liveIds.has(id))
    .map(([id, entry]) => ({ id, rect: entry.rect }));
  const nodeOverlapsBefore = overlapPairs(originalNodeRects).length;
  const nodeOverlapsAfter = overlapPairs(finalNodeRects).length;
  const originalBounds = unionRects(originalNodeRects.map((item) => item.rect));
  const finalBounds = unionRects(finalNodeRects.map((item) => item.rect));

  let translatedNodes = 0;
  let normalizedNodes = 0;
  let xNormalizedNodes = 0;
  let yNormalizedNodes = 0;
  for (const [nodeId, target] of targets) {
    const source = target.source;
    if (source.rect.x !== source.canonicalRect.x || source.rect.y !== source.canonicalRect.y) translatedNodes++;
    if (target.rect.x !== source.canonicalRect.x || target.rect.y !== source.canonicalRect.y) normalizedNodes++;
    if (target.rect.x !== source.canonicalRect.x) xNormalizedNodes++;
    if (target.rect.y !== source.canonicalRect.y) yNormalizedNodes++;
    const xPatch = makePatch(file, nodeId, 'node', source.node.location, '$Position.$x', source.xPath, source.rect.x, target.rect.x);
    const yPatch = makePatch(file, nodeId, 'node', source.node.location, '$Position.$y', source.yPath, source.rect.y, target.rect.y);
    if (xPatch) patches.push(xPatch);
    if (yPatch) patches.push(yPatch);
  }

  const groupTargets = rebuildGroupBoundsTight(snapshot.groups, targets);
  let translatedGroups = 0;
  let resizedGroups = 0;
  for (const group of snapshot.groups) {
    const source = metadata.groups.find((item) => item.id === group.id);
    const target = groupTargets.get(group.id);
    if (!source?.position || source.width === undefined || source.height === undefined || !source.widthPath || !source.heightPath || !target) continue;
    if (target.x !== source.position.x || target.y !== source.position.y) translatedGroups++;
    if (target.width !== source.width || target.height !== source.height) resizedGroups++;
    for (const patch of [
      makePatch(file, group.id, 'group', 'live', '$Position.$x', source.position.xPath, source.position.x, target.x),
      makePatch(file, group.id, 'group', 'live', '$Position.$y', source.position.yPath, source.position.y, target.y),
      makePatch(file, group.id, 'group', 'live', '$width', source.widthPath, source.width, target.width),
      makePatch(file, group.id, 'group', 'live', '$height', source.heightPath, source.height, target.height),
    ]) if (patch) patches.push(patch);
  }
  // Unsupported/empty groups still receive the global origin translation when possible.
  const supportedGroupIds = new Set(snapshot.groups.map((group) => group.id));
  for (const group of metadata.groups) {
    if (supportedGroupIds.has(group.id) || !group.position) continue;
    const targetX = group.position.x + snapshot.originOffset.x;
    const targetY = group.position.y + snapshot.originOffset.y;
    const xPatch = makePatch(file, group.id, 'group', 'live', '$Position.$x', group.position.xPath, group.position.x, targetX);
    const yPatch = makePatch(file, group.id, 'group', 'live', '$Position.$y', group.position.yPath, group.position.y, targetY);
    if (xPatch) patches.push(xPatch);
    if (yPatch) patches.push(yPatch);
  }

  let translatedComments = 0;
  for (const comment of metadata.comments) {
    if (!comment.position) continue;
    const targetX = comment.position.x + snapshot.originOffset.x;
    const targetY = comment.position.y + snapshot.originOffset.y;
    if (targetX !== comment.position.x || targetY !== comment.position.y) translatedComments++;
    const xPatch = makePatch(file, comment.id, 'comment', 'live', '$Position.$x', comment.position.xPath, comment.position.x, targetX);
    const yPatch = makePatch(file, comment.id, 'comment', 'live', '$Position.$y', comment.position.yPath, comment.position.y, targetY);
    if (xPatch) patches.push(xPatch);
    if (yPatch) patches.push(yPatch);
  }

  const originalGroupRects = snapshot.groups.map((group) => ({ id: group.id, rect: group.originalBounds }));
  const finalGroupRects = snapshot.groups.map((group) => ({ id: group.id, rect: groupTargets.get(group.id) ?? group.canonicalBounds }));
  const groupOverlapsBeforePairs = overlapPairs(originalGroupRects);
  const groupOverlapsAfterPairs = overlapPairs(finalGroupRects);
  const newGroupOverlaps = groupOverlapsAfterPairs.filter(([a, b]) => !snapshot.originalGroupOverlapKeys.has(pairKey(a, b)));
  if (newGroupOverlaps.length) warnings.push(`${newGroupOverlaps.length} new author-group overlap(s) remain after DAG Rebuild; groups are advisory in full rebuild mode.`);
  if (snapshot.unsupportedGroups.length) warnings.push(`${snapshot.unsupportedGroups.length} group(s) could not be tightly rebuilt and were origin-shifted only.`);
  if (semanticGraph.stats.duplicateStructuralNodeIds > 0) warnings.push(`${semanticGraph.stats.duplicateStructuralNodeIds} duplicate structural node id(s) make DAG placement ambiguous.`);
  if (nodeOverlapsAfter > 0) warnings.push(`${nodeOverlapsAfter} live-node overlap(s) remain after DAG Rebuild; staging is blocked.`);
  if (flowAfter.edgeNodeIntersections > 0) warnings.push(`${flowAfter.edgeNodeIntersections} flow connection(s) intersect foreign node geometry after DAG Rebuild; staging is blocked.`);
  if (attachmentAfter.edgeNodeIntersections > 0) warnings.push(`${attachmentAfter.edgeNodeIntersections} attachment connection(s) intersect foreign node geometry after DAG Rebuild; staging is blocked.`);
  if (allAfter.edgeEdgeCrossings > 0) warnings.push(`${allAfter.edgeEdgeCrossings} unrelated connection crossing(s) remain in the rebuilt DAG.`);
  for (const warning of semanticGraph.warnings) warnings.push(`Reader v2: ${warning}`);

  const blocked = isLayoutBlocked({
    missingRoot: !snapshot.root,
    duplicateStructuralNodeIds: semanticGraph.stats.duplicateStructuralNodeIds,
    nodeOverlaps: nodeOverlapsAfter,
    flowEdgeNodeIntersections: flowAfter.edgeNodeIntersections,
    attachmentEdgeNodeIntersections: attachmentAfter.edgeNodeIntersections,
    blockOnAttachmentIntersections: true,
    floaterOverlaps: floaterMetrics.overlapsAfter,
    blockOnFloaterOverlaps: settings.floaterMode !== 'ignore',
  });

  return {
    fileId: file.id,
    filePath: file.path,
    patches,
    groups: snapshot.groups,
    metrics: createLayoutFileMetrics(file, settings, snapshot.root?.node.id, snapshot.originOffset, {
      positionedNodes: targets.size,
      translatedNodes,
      normalizedNodes,
      xNormalizedNodes,
      yNormalizedNodes,
      dagLevels: dagStats.levels,
      dagEffectiveVerticalGap: effectiveGap,
      dagSafetyPasses: safetyPasses,
      treeNodes: liveTargets.size,
      treeRoots: dagStats.roots.length,
      treeMaxDepth: dagStats.maxDepth,
      forks: dagStats.forks,
      branchClusters: dagStats.branchClusters,
      semanticFlowEdges: semanticGraph.stats.flowEdges,
      semanticAttachmentEdges: semanticGraph.stats.attachmentEdges,
      semanticOrderedAttachmentEdges: semanticGraph.stats.orderedAttachmentEdges,
      semanticStructuralEdges: semanticGraph.stats.structuralEdges,
      semanticFlowForks: semanticGraph.stats.flowForks,
      semanticStructuralForks: semanticGraph.stats.structuralForks,
      semanticMixedParents: semanticGraph.stats.mixedParents,
      semanticAttachmentFamilies: semanticGraph.stats.attachmentFamilies,
      singleChildParents: dagStats.singleChildParents,
      routedFlowEdges: flowAfter.routedEdges,
      edgeNodeIntersectionsBefore: flowBefore.edgeNodeIntersections,
      edgeNodeIntersectionsAfter: flowAfter.edgeNodeIntersections,
      edgeNodeCorridorIntrusionsAfter: flowAfter.edgeNodeCorridorIntrusions,
      edgeEdgeCrossingsAfter: allAfter.edgeEdgeCrossings,
      attachmentEdgeNodeIntersectionsAfter: attachmentAfter.edgeNodeIntersections,
      xSpanBefore: cleanNumber(originalBounds?.width ?? 0),
      xSpanAfter: cleanNumber(finalBounds?.width ?? 0),
      ySpanBefore: cleanNumber(originalBounds?.height ?? 0),
      ySpanAfter: cleanNumber(finalBounds?.height ?? 0),
      translatedComments,
      translatedGroups,
      resizedGroups,
      nodeOverlapsBefore,
      nodeOverlapsAfter,
      floatingNodes: floaterMetrics.count,
      floatersHandled: floaterMetrics.handled,
      floaterOverlapsBefore: floaterMetrics.overlapsBefore,
      floaterOverlapsAfter: floaterMetrics.overlapsAfter,
      groupOverlapsBefore: groupOverlapsBeforePairs.length,
      groupOverlapsAfter: groupOverlapsAfterPairs.length,
      newGroupOverlaps,
      warnings,
      blocked,
    }),
  };
}

export function buildDagRebuildLayoutProposal(files: ProjectFile[], settings: LayoutEngineSettings): LayoutProposal {
  return buildRegisteredStrategyProposal(files, settings, 'dag-rebuild');
}

export function buildLayoutProposal(files: ProjectFile[], settings: LayoutEngineSettings): LayoutProposal {
  return buildRegisteredStrategyProposal(files, settings, settings.strategy);
}
