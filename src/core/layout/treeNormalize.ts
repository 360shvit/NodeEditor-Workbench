import type { GeometryConfidence, NodePortGeometry } from '../geometry/types.js';
import { rectBottom, rectRight } from './geometry.js';
import { auditEdgeCorridors, buildRoutedLayoutEdge, routeIntersectsRect, routingCorridorPadding } from './edgeCorridor.js';
import type { RoutedLayoutEdge } from './edgeCorridor.js';
import type { PositionedLayoutNode } from './snapshot.js';
import type { LayoutReaderV2Edge, LayoutRelationRole } from './readerV2.js';
import type { LayoutEngineSettings, LayoutRect } from './types.js';
import { connectionPlaneTolerance, visualRowTolerance } from './tolerances.js';

export interface TreeTargetNode {
  source: PositionedLayoutNode;
  rect: LayoutRect;
}

export interface AuthorTreeNormalizeStats {
  treeNodes: number;
  treeRoots: number;
  forks: number;
  branchClusters: number;
  singleChildParents: number;
  laneSnaps: number;
  connectionPlanesAligned: number;
  portAlignmentFallbacks: number;
  authorDepthBands: number;
  deepBranchStarts: number;
  authorDepthXRescues: number;
  contourXRescues: number;
  xRescueShiftedNodes: number;
  maxXRescueShift: number;
  clusterCollisionsResolved: number;
  clusterShiftedNodes: number;
  maxClusterShift: number;
  maxDepth: number;
  attachmentXAdjustments: number;
  maxAttachmentXAdjustment: number;
  attachmentContourRescues: number;
  attachmentContourShiftedNodes: number;
  maxAttachmentContourShift: number;
  routedFlowEdges: number;
  edgeNodeIntersectionsBefore: number;
  edgeNodeIntersectionsAfter: number;
  edgeNodeCorridorIntrusionsAfter: number;
  edgeEdgeCrossingsAfter: number;
  attachmentEdgeNodeIntersectionsAfter: number;
  edgeCorridorRepairs: number;
  edgeCorridorShiftedNodes: number;
  maxEdgeCorridorShift: number;
  flowLanes: number;
  flowLaneEdges: number;
  laneRealignments: number;
  laneRealignedNodes: number;
  laneNormalizationBlocked: number;
  visualRowEdges: number;
  visualRowAuthorJitterEdges: number;
  visualRowMisalignedBefore: number;
  visualRowMisalignedAfter: number;
  visualRowRealignments: number;
  maxVisualRowDeviationBefore: number;
  maxVisualRowDeviationAfter: number;
  maxLaneShift: number;
  maxConnectionPlaneDeviationBefore: number;
  medianConnectionPlaneDeviationBefore: number;
  maxConnectionPlaneDeviationAfter: number;
  medianConnectionPlaneDeviationAfter: number;
}

interface PrimaryForest {
  parentByNode: Map<string, string>;
  childrenByNode: Map<string, string[]>;
  edgeFieldByChild: Map<string, string | undefined>;
  edgeRoleByChild: Map<string, LayoutRelationRole>;
  roots: string[];
  maxDepth: number;
}

interface SubtreeInfo {
  rootId: string;
  nodeIds: string[];
}

interface ConnectionPlaneIntent {
  field?: string;
  parentPort?: NodePortGeometry;
  childPort?: NodePortGeometry;
  originalDeltaY: number;
  samePlane: boolean;
  confidence: GeometryConfidence;
  fallback: boolean;
}

interface ForkDepthInfo {
  bandByChild: Map<string, number>;
  targetXByChild: Map<string, number>;
  bandCount: number;
  deepChildren: number;
}

function cleanNumber(value: number): number {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function centerY(rect: LayoutRect): number {
  return rect.y + rect.height / 2;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pathIsAncestor(parent: Array<string | number>, child: Array<string | number>): boolean {
  if (parent.length >= child.length) return false;
  for (let i = 0; i < parent.length; i++) if (parent[i] !== child[i]) return false;
  return true;
}

function structuralField(parent: Array<string | number>, child: Array<string | number>): string | undefined {
  const relative = child.slice(parent.length);
  return relative.find((part): part is string => typeof part === 'string');
}

/**
 * Normalize uses the structural JSON nesting as its ownership tree. Extra
 * semantic/reference edges never steal a node from the branch in which the
 * author actually stored it.
 */
function buildPrimaryForest(
  entries: TreeTargetNode[],
  preferredRootId?: string,
  semanticEdges: LayoutReaderV2Edge[] = [],
): PrimaryForest {
  const byId = new Map(entries.map((entry) => [entry.source.node.id, entry]));
  const parentByNode = new Map<string, string>();
  const childrenByNode = new Map<string, string[]>();
  const edgeFieldByChild = new Map<string, string | undefined>();
  const edgeRoleByChild = new Map<string, LayoutRelationRole>();
  const semanticByChild = new Map(semanticEdges.map((edge) => [edge.childId, edge]));
  const ordered = [...entries].sort((a, b) => a.source.node.jsonPath.length - b.source.node.jsonPath.length);

  for (const child of ordered) {
    let parent: TreeTargetNode | undefined;
    for (const candidate of ordered) {
      if (candidate.source.node.id === child.source.node.id) continue;
      if (!pathIsAncestor(candidate.source.node.jsonPath, child.source.node.jsonPath)) continue;
      if (!parent || candidate.source.node.jsonPath.length > parent.source.node.jsonPath.length) parent = candidate;
    }
    if (!parent) continue;
    parentByNode.set(child.source.node.id, parent.source.node.id);
    edgeFieldByChild.set(child.source.node.id, structuralField(parent.source.node.jsonPath, child.source.node.jsonPath));
    edgeRoleByChild.set(child.source.node.id, semanticByChild.get(child.source.node.id)?.role ?? 'structural');
    childrenByNode.set(parent.source.node.id, [...(childrenByNode.get(parent.source.node.id) ?? []), child.source.node.id]);
  }

  for (const [parentId, childIds] of childrenByNode) {
    childIds.sort((a, b) => {
      const ea = byId.get(a)!;
      const eb = byId.get(b)!;
      const dy = centerY(ea.source.canonicalRect) - centerY(eb.source.canonicalRect);
      return dy || ea.source.canonicalRect.x - eb.source.canonicalRect.x;
    });
    childrenByNode.set(parentId, childIds);
  }

  const roots = ordered
    .filter((entry) => !parentByNode.has(entry.source.node.id))
    .map((entry) => entry.source.node.id)
    .sort((a, b) => {
      if (a === preferredRootId) return -1;
      if (b === preferredRootId) return 1;
      const ea = byId.get(a)!;
      const eb = byId.get(b)!;
      return centerY(ea.source.canonicalRect) - centerY(eb.source.canonicalRect)
        || ea.source.canonicalRect.x - eb.source.canonicalRect.x;
    });

  let maxDepth = 0;
  const visitDepth = (nodeId: string, depth: number, seen: Set<string>) => {
    if (seen.has(nodeId)) return;
    seen.add(nodeId);
    maxDepth = Math.max(maxDepth, depth);
    for (const childId of childrenByNode.get(nodeId) ?? []) visitDepth(childId, depth + 1, seen);
  };
  const seen = new Set<string>();
  for (const rootId of roots) visitDepth(rootId, 0, seen);

  return { parentByNode, childrenByNode, edgeFieldByChild, edgeRoleByChild, roots, maxDepth };
}

function normalizedToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function portMatchScore(port: NodePortGeometry, field: string): number {
  const f = normalizedToken(field);
  const id = normalizedToken(port.id);
  const label = normalizedToken(port.label);
  if (!f) return 0;
  if (id === f) return 100;
  if (label === f) return 95;
  if (id.endsWith(f) || id.startsWith(f)) return 80;
  if (label.endsWith(f) || label.startsWith(f)) return 75;
  if (id.includes(f) || label.includes(f)) return 60;
  // Common Hytale workspace naming: JSON `Inputs` -> `DensityInputs` etc.
  if (f === 'inputs' && (id.endsWith('inputs') || label === 'inputs')) return 90;
  return 0;
}

function chooseParentPort(parent: PositionedLayoutNode, field?: string): NodePortGeometry | undefined {
  const ports = parent.geometry.rightPorts;
  if (!ports.length) return undefined;
  if (!field) return ports.length === 1 ? ports[0] : undefined;
  const scored = ports.map((port) => ({ port, score: portMatchScore(port, field) })).sort((a, b) => b.score - a.score);
  if (scored[0]?.score > 0) return scored[0].port;
  return ports.length === 1 ? ports[0] : undefined;
}

function chooseChildPort(child: PositionedLayoutNode, parentPort?: NodePortGeometry): NodePortGeometry | undefined {
  const ports = child.geometry.leftPorts;
  if (!ports.length) return undefined;
  if (parentPort) {
    const exactType = ports.find((port) => port.type === parentPort.type);
    if (exactType) return exactType;
  }
  return ports.length === 1 ? ports[0] : ports[0];
}

function maxConfidence(a: GeometryConfidence, b: GeometryConfidence): GeometryConfidence {
  const order: GeometryConfidence[] = ['exact', 'derived', 'dynamic', 'fallback'];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

/**
 * Author intent is measured at the actual connection plane when the visual
 * catalog can resolve both physical ports. Unknown/ambiguous nodes fall back to
 * center alignment rather than inventing pin semantics.
 */
function connectionPlaneIntent(
  parent: TreeTargetNode,
  child: TreeTargetNode,
  field: string | undefined,
  tolerance: number,
): ConnectionPlaneIntent {
  const parentPort = chooseParentPort(parent.source, field);
  const childPort = chooseChildPort(child.source, parentPort);
  if (parentPort && childPort) {
    const parentY = parent.source.canonicalRect.y + parentPort.centerY;
    const childY = child.source.canonicalRect.y + childPort.centerY;
    const originalDeltaY = childY - parentY;
    return {
      field,
      parentPort,
      childPort,
      originalDeltaY,
      samePlane: Math.abs(originalDeltaY) <= tolerance,
      confidence: maxConfidence(parentPort.confidence, childPort.confidence),
      fallback: false,
    };
  }
  const originalDeltaY = centerY(child.source.canonicalRect) - centerY(parent.source.canonicalRect);
  return {
    field,
    originalDeltaY,
    samePlane: Math.abs(originalDeltaY) <= tolerance,
    confidence: 'fallback',
    fallback: true,
  };
}

function alignedChildY(parent: TreeTargetNode, child: TreeTargetNode, intent: ConnectionPlaneIntent): number {
  if (intent.parentPort && intent.childPort) {
    return cleanNumber(parent.rect.y + intent.parentPort.centerY - intent.childPort.centerY);
  }
  return cleanNumber(centerY(parent.rect) - child.rect.height / 2);
}

function originalRelativeY(parent: TreeTargetNode, child: TreeTargetNode): number {
  return child.source.canonicalRect.y - parent.source.canonicalRect.y;
}

function originalRelativeX(parent: TreeTargetNode, child: TreeTargetNode): number {
  return child.source.canonicalRect.x - parent.source.canonicalRect.x;
}

function isFlowRole(role: LayoutRelationRole | undefined): boolean {
  // Unresolved structural edges keep the legacy behavior as a conservative fallback.
  return role === 'flow' || role === 'structural' || role === undefined;
}

/**
 * Multi-input ports are visually forgiving: a branch that is just outside the
 * normal single-edge tolerance can still clearly read as the inline
 * continuation. Expand the fork-only range by a bounded amount derived from
 * real node height; single-child chains continue to use the exact configured
 * tolerance.
 */
function forkInlineRange(parent: TreeTargetNode, children: TreeTargetNode[], baseTolerance: number): number {
  const base = Math.max(0, baseTolerance);
  const typicalHeight = median([parent.rect.height, ...children.map((child) => child.rect.height)]);
  const geometryBonus = Math.min(36, Math.max(0, typicalHeight * 0.2));
  return cleanNumber(base + geometryBonus);
}

/**
 * Prefer the geometrically closest connection plane, but give a small bias to
 * the immediate author-depth band. This prevents a near-tie in a deep branch
 * from stealing the inline continuation while still allowing an obviously
 * straight deep branch to win (which is valid author intent).
 */
function forkInlineScore(intent: ConnectionPlaneIntent, depthBand: number, baseTolerance: number): number {
  const bandPenalty = Math.min(Math.max(12, baseTolerance / 3), 32) * depthBand;
  const fallbackPenalty = intent.fallback ? 6 : 0;
  return Math.abs(intent.originalDeltaY) + bandPenalty + fallbackPenalty;
}

/**
 * Local fork depth is author intent, not geometry. Children that start at
 * clearly different X depths are grouped into local bands. Band 0 is normalized
 * to the real parent width + requested gap; later bands preserve their relative
 * depth after scaling by the amount the immediate author step itself was
 * compacted/expanded. This is the geometry-aware version of the legacy solver's
 * local dx/GRID_X idea without a hard-coded grid.
 */
function forkDepthInfo(parent: TreeTargetNode, children: TreeTargetNode[], settings: LayoutEngineSettings): ForkDepthInfo {
  const bandByChild = new Map<string, number>();
  const targetXByChild = new Map<string, number>();
  if (!children.length) return { bandByChild, targetXByChild, bandCount: 0, deepChildren: 0 };

  const sorted = [...children].sort((a, b) => a.source.canonicalRect.x - b.source.canonicalRect.x);
  const medianWidth = median(sorted.map((child) => child.rect.width));
  const bandTolerance = Math.max(96, Math.min(320, medianWidth * 0.35));
  const bands: Array<{ anchor: number; members: TreeTargetNode[] }> = [];
  for (const child of sorted) {
    const last = bands.at(-1);
    if (!last || Math.abs(child.source.canonicalRect.x - last.anchor) > bandTolerance) {
      bands.push({ anchor: child.source.canonicalRect.x, members: [child] });
    } else {
      last.members.push(child);
      last.anchor = median(last.members.map((entry) => entry.source.canonicalRect.x));
    }
  }

  // Avoid treating tiny X jitter as semantic depth. If all children effectively
  // form one local band this behaves exactly like a normal fork.
  const directBand = bands[0];
  const originalDirectDx = directBand.anchor - parent.source.canonicalRect.x;
  const idealDirectX = rectRight(parent.rect) + settings.horizontalGap;
  const idealDirectDx = idealDirectX - parent.rect.x;
  // Tiny author X offsets are usually intentional hand-padding, not stale
  // geometry. Preserve them when the existing fork step is already within an
  // 8 px jitter window of the requested geometry gap.
  const preserveDirectJitter = Math.abs(originalDirectDx - idealDirectDx) <= 8;
  const targetDirectX = preserveDirectJitter
    ? cleanNumber(parent.rect.x + originalDirectDx)
    : cleanNumber(idealDirectX);
  const targetDirectDx = targetDirectX - parent.rect.x;
  const scale = originalDirectDx > Math.max(1, parent.source.canonicalRect.width * 0.2)
    ? Math.max(0.15, Math.min(0.65, targetDirectDx / originalDirectDx))
    : 1;

  bands.forEach((band, bandIndex) => {
    const targetBandX = cleanNumber(targetDirectX + (band.anchor - directBand.anchor) * scale);
    for (const child of band.members) {
      const authorJitter = child.source.canonicalRect.x - band.anchor;
      const preservedJitter = Math.abs(authorJitter) <= 8 ? authorJitter : 0;
      bandByChild.set(child.source.node.id, bandIndex);
      targetXByChild.set(child.source.node.id, cleanNumber(targetBandX + preservedJitter));
    }
  });

  return {
    bandByChild,
    targetXByChild,
    bandCount: bands.length,
    deepChildren: bands.slice(1).reduce((sum, band) => sum + band.members.length, 0),
  };
}

/**
 * Forward pass: local parent/child rules only.
 * - 1 child: real geometry X-gap; align physical connection ports when the
 *   original edge already expressed a straight author chain.
 * - N children: preserve local author depth bands. Exactly one near-plane child
 *   may continue the parent's horizontal flow; all other branch Y offsets remain
 *   author-owned.
 */
function forwardPlace(
  nodeId: string,
  targets: Map<string, TreeTargetNode>,
  forest: PrimaryForest,
  settings: LayoutEngineSettings,
  stats: AuthorTreeNormalizeStats,
  seen: Set<string>,
  deepBranchRoots: Set<string>,
  inlineBranchRoots: Set<string>,
  laneTargets: Map<string, number>,
  visualRowTargets: Set<string>,
): void {
  if (seen.has(nodeId)) return;
  seen.add(nodeId);
  const parent = targets.get(nodeId);
  if (!parent) return;
  const childIds = forest.childrenByNode.get(nodeId) ?? [];
  if (!childIds.length) return;
  const children = childIds.map((id) => targets.get(id)).filter((entry): entry is TreeTargetNode => Boolean(entry));
  const flowChildren = children.filter((child) => isFlowRole(forest.edgeRoleByChild.get(child.source.node.id)));
  const attachmentChildren = children.filter((child) => !isFlowRole(forest.edgeRoleByChild.get(child.source.node.id)));

  // Reader v2 contract: typed attachments are not flow branches. Keep their
  // author sketch attached to the owner, but do not invent a right-going flow
  // constraint. Many Hytale attachments are intentionally parked above/below
  // (or even to the left of) their owner. Horizontal padding is required only
  // when the real owner/child rectangles overlap in Y; then preserve the side
  // chosen by the author and pay exactly the requested X gap on that side.
  for (const child of attachmentChildren) {
    const authorX = cleanNumber(parent.rect.x + originalRelativeX(parent, child));
    const authorY = cleanNumber(parent.rect.y + originalRelativeY(parent, child));
    const authorRect: LayoutRect = { ...child.rect, x: authorX, y: authorY };
    let targetX = authorX;

    if (yRangesOverlap(parent.rect, authorRect)) {
      const parentAuthorCenterX = parent.source.canonicalRect.x + parent.source.canonicalRect.width / 2;
      const childAuthorCenterX = child.source.canonicalRect.x + child.source.canonicalRect.width / 2;
      const authoredOnRight = childAuthorCenterX >= parentAuthorCenterX;
      targetX = authoredOnRight
        ? cleanNumber(Math.max(authorX, rectRight(parent.rect) + settings.horizontalGap))
        : cleanNumber(Math.min(authorX, parent.rect.x - settings.horizontalGap - child.rect.width));
    }

    const attachmentShift = Math.abs(cleanNumber(targetX - authorX));
    if (attachmentShift > 0) {
      stats.attachmentXAdjustments++;
      stats.maxAttachmentXAdjustment = Math.max(stats.maxAttachmentXAdjustment, attachmentShift);
    }
    child.rect.x = targetX;
    child.rect.y = authorY;
  }

  const intents = new Map(flowChildren.map((child) => [child.source.node.id, connectionPlaneIntent(
    parent,
    child,
    forest.edgeFieldByChild.get(child.source.node.id),
    connectionPlaneTolerance(settings),
  )]));
  for (const intent of intents.values()) if (intent.fallback) stats.portAlignmentFallbacks++;

  if (flowChildren.length === 1) {
    stats.singleChildParents++;
    const child = flowChildren[0];
    const intent = intents.get(child.source.node.id)!;
    child.rect.x = cleanNumber(rectRight(parent.rect) + settings.horizontalGap);
    const visualRow = Math.abs(originalRelativeY(parent, child)) <= visualRowTolerance(settings);
    if (visualRow) {
      child.rect.y = cleanNumber(parent.rect.y);
      laneTargets.set(child.source.node.id, 0);
      visualRowTargets.add(child.source.node.id);
      if (Math.abs(originalRelativeY(parent, child)) >= 0.5) stats.visualRowAuthorJitterEdges++;
      stats.laneSnaps++;
    } else if (intent.samePlane) {
      child.rect.y = alignedChildY(parent, child, intent);
      stats.laneSnaps++;
      stats.connectionPlanesAligned++;
      laneTargets.set(child.source.node.id, 0);
    } else {
      child.rect.y = cleanNumber(parent.rect.y + originalRelativeY(parent, child));
    }
  } else if (flowChildren.length > 1) {
    stats.forks++;
    stats.branchClusters += flowChildren.length;
    const depth = forkDepthInfo(parent, flowChildren, settings);
    stats.authorDepthBands += Math.max(0, depth.bandCount - 1);
    stats.deepBranchStarts += depth.deepChildren;
    for (const child of flowChildren) if ((depth.bandByChild.get(child.source.node.id) ?? 0) > 0) deepBranchRoots.add(child.source.node.id);

    const inlineRange = forkInlineRange(parent, flowChildren, connectionPlaneTolerance(settings));
    const mainPlaneChild = flowChildren
      .filter((child) => Math.abs(intents.get(child.source.node.id)!.originalDeltaY) <= inlineRange)
      .sort((a, b) => {
        const ia = intents.get(a.source.node.id)!;
        const ib = intents.get(b.source.node.id)!;
        const ba = depth.bandByChild.get(a.source.node.id) ?? 0;
        const bb = depth.bandByChild.get(b.source.node.id) ?? 0;
        return forkInlineScore(ia, ba, connectionPlaneTolerance(settings))
          - forkInlineScore(ib, bb, connectionPlaneTolerance(settings))
          || Math.abs(ia.originalDeltaY) - Math.abs(ib.originalDeltaY)
          || ba - bb;
      })[0];
    if (mainPlaneChild) {
      inlineBranchRoots.add(mainPlaneChild.source.node.id);
      laneTargets.set(mainPlaneChild.source.node.id, intents.get(mainPlaneChild.source.node.id)!.originalDeltaY);
      if (Math.abs(originalRelativeY(parent, mainPlaneChild)) <= visualRowTolerance(settings)) {
        visualRowTargets.add(mainPlaneChild.source.node.id);
        if (Math.abs(originalRelativeY(parent, mainPlaneChild)) >= 0.5) stats.visualRowAuthorJitterEdges++;
      }
      if (!intents.get(mainPlaneChild.source.node.id)!.fallback) stats.connectionPlanesAligned++;
    }

    for (const child of flowChildren) {
      child.rect.x = depth.targetXByChild.get(child.source.node.id) ?? cleanNumber(rectRight(parent.rect) + settings.horizontalGap);
      child.rect.y = visualRowTargets.has(child.source.node.id)
        ? cleanNumber(parent.rect.y)
        : cleanNumber(parent.rect.y + originalRelativeY(parent, child));
    }
  }

  for (const childId of childIds) forwardPlace(childId, targets, forest, settings, stats, seen, deepBranchRoots, inlineBranchRoots, laneTargets, visualRowTargets);
}

function xRangesOverlap(a: LayoutRect, b: LayoutRect): boolean {
  return a.x < rectRight(b) && rectRight(a) > b.x;
}

function translateSubtree(targets: Map<string, TreeTargetNode>, nodeIds: string[], deltaY: number): number {
  if (!deltaY) return 0;
  let changed = 0;
  for (const nodeId of nodeIds) {
    const target = targets.get(nodeId);
    if (!target) continue;
    target.rect.y = cleanNumber(target.rect.y + deltaY);
    changed++;
  }
  return changed;
}

function translateSubtreeX(targets: Map<string, TreeTargetNode>, nodeIds: string[], deltaX: number): number {
  if (!deltaX) return 0;
  let changed = 0;
  for (const nodeId of nodeIds) {
    const target = targets.get(nodeId);
    if (!target) continue;
    target.rect.x = cleanNumber(target.rect.x + deltaX);
    changed++;
  }
  return changed;
}

function yRangesOverlap(a: LayoutRect, b: LayoutRect): boolean {
  return a.y < rectBottom(b) && rectBottom(a) > b.y;
}

function requiredRightShift(targets: Map<string, TreeTargetNode>, obstacles: string[], moving: string[], gap: number): number {
  let required = 0;
  for (const obstacleId of obstacles) {
    const a = targets.get(obstacleId)?.rect;
    if (!a) continue;
    for (const movingId of moving) {
      const b = targets.get(movingId)?.rect;
      if (!b || !yRangesOverlap(a, b)) continue;
      required = Math.max(required, rectRight(a) + gap - b.x);
    }
  }
  return Math.max(0, cleanNumber(required));
}

interface ShiftInterval {
  start: number;
  end: number;
}

/** Exact minimum rigid X translation at fixed Y, derived from the union of all
 * forbidden pairwise gap intervals. This may settle between unrelated contours
 * instead of forcing a family wholly left or right of every obstacle. */
function nearestHorizontalClearanceShift(
  targets: Map<string, TreeTargetNode>,
  movingIds: string[],
  stationaryIds: string[],
  gap: number,
): number {
  const moving = new Set(movingIds);
  const forbidden: ShiftInterval[] = [];
  for (const movingId of movingIds) {
    const b = targets.get(movingId)?.rect;
    if (!b) continue;
    for (const stationaryId of stationaryIds) {
      if (moving.has(stationaryId)) continue;
      const a = targets.get(stationaryId)?.rect;
      if (!a || !yRangesOverlap(a, b)) continue;
      const start = cleanNumber(a.x - gap - rectRight(b));
      const end = cleanNumber(rectRight(a) + gap - b.x);
      if (start < end) forbidden.push({ start, end });
    }
  }
  if (!forbidden.length) return 0;
  forbidden.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: ShiftInterval[] = [];
  for (const interval of forbidden) {
    const last = merged.at(-1);
    if (!last || interval.start >= last.end - 1e-6) merged.push({ ...interval });
    else last.end = Math.max(last.end, interval.end);
  }
  const containing = merged.find((interval) => interval.start < -1e-6 && interval.end > 1e-6);
  if (!containing) return 0;
  return cleanNumber(Math.abs(containing.start) <= Math.abs(containing.end) ? containing.start : containing.end);
}

/** Exact minimum rigid Y translation at fixed X, symmetric to the horizontal
 * interval compactor above. */
function nearestVerticalClearanceShift(
  targets: Map<string, TreeTargetNode>,
  movingIds: string[],
  stationaryIds: string[],
  gap: number,
): number {
  const moving = new Set(movingIds);
  const forbidden: ShiftInterval[] = [];
  for (const movingId of movingIds) {
    const b = targets.get(movingId)?.rect;
    if (!b) continue;
    for (const stationaryId of stationaryIds) {
      if (moving.has(stationaryId)) continue;
      const a = targets.get(stationaryId)?.rect;
      if (!a || !xRangesOverlap(a, b)) continue;
      const start = cleanNumber(a.y - gap - rectBottom(b));
      const end = cleanNumber(rectBottom(a) + gap - b.y);
      if (start < end) forbidden.push({ start, end });
    }
  }
  if (!forbidden.length) return 0;
  forbidden.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: ShiftInterval[] = [];
  for (const interval of forbidden) {
    const last = merged.at(-1);
    if (!last || interval.start >= last.end - 1e-6) merged.push({ ...interval });
    else last.end = Math.max(last.end, interval.end);
  }
  const containing = merged.find((interval) => interval.start < -1e-6 && interval.end > 1e-6);
  if (!containing) return 0;
  return cleanNumber(Math.abs(containing.start) <= Math.abs(containing.end) ? containing.start : containing.end);
}

function horizontalViolationObstacles(
  targets: Map<string, TreeTargetNode>,
  movingIds: string[],
  stationaryIds: string[],
  gap: number,
): string[] {
  const moving = new Set(movingIds);
  const violating = new Set<string>();
  for (const movingId of movingIds) {
    const a = targets.get(movingId)?.rect;
    if (!a) continue;
    for (const stationaryId of stationaryIds) {
      if (moving.has(stationaryId)) continue;
      const b = targets.get(stationaryId)?.rect;
      if (!b || !yRangesOverlap(a, b)) continue;
      const separated = rectRight(a) + gap <= b.x || rectRight(b) + gap <= a.x;
      if (!separated) violating.add(stationaryId);
    }
  }
  return [...violating];
}

interface AttachmentFamily {
  ownerId: string;
  rootIds: string[];
}

function collectAttachmentFamilies(forest: PrimaryForest): AttachmentFamily[] {
  const families: AttachmentFamily[] = [];
  for (const [ownerId, childIds] of forest.childrenByNode) {
    const groups = new Map<string, string[]>();
    for (const childId of childIds) {
      const role = forest.edgeRoleByChild.get(childId);
      if (isFlowRole(role)) continue;
      const field = forest.edgeFieldByChild.get(childId) ?? '';
      const key = `${role ?? 'attachment'}|${field}`;
      groups.set(key, [...(groups.get(key) ?? []), childId]);
    }
    for (const rootIds of groups.values()) families.push({ ownerId, rootIds });
  }
  return families;
}

function nearestAttachmentFamilyForNode(
  nodeId: string,
  forest: PrimaryForest,
): AttachmentFamily | undefined {
  let current = nodeId;
  const seen = new Set<string>();
  while (!seen.has(current)) {
    seen.add(current);
    const parentId = forest.parentByNode.get(current);
    if (!parentId) return undefined;
    const role = forest.edgeRoleByChild.get(current);
    if (!isFlowRole(role)) {
      const field = forest.edgeFieldByChild.get(current) ?? '';
      const rootIds = (forest.childrenByNode.get(parentId) ?? []).filter((childId) => {
        return forest.edgeRoleByChild.get(childId) === role
          && (forest.edgeFieldByChild.get(childId) ?? '') === field;
      });
      return rootIds.length ? { ownerId: parentId, rootIds } : undefined;
    }
    current = parentId;
  }
  return undefined;
}

/**
 * Final semantic attachment compaction. Attachment families are author-owned
 * islands, not flow branches. If a family still violates horizontal padding
 * against a foreign contour after flow compaction, translate the whole family
 * in X by the smallest collision-free amount. Ordered siblings therefore stay
 * together and nested flow below an attachment moves rigidly with it.
 */
function resolveAttachmentFamilyContours(
  targets: Map<string, TreeTargetNode>,
  forest: PrimaryForest,
  settings: LayoutEngineSettings,
  stats: AuthorTreeNormalizeStats,
  subtreeCache: Map<string, string[]>,
): void {
  const allIds = [...targets.keys()];
  const families = collectAttachmentFamilies(forest)
    .sort((a, b) => {
      const ap = targets.get(a.ownerId)?.source.node.jsonPath.length ?? 0;
      const bp = targets.get(b.ownerId)?.source.node.jsonPath.length ?? 0;
      return ap - bp;
    });

  for (let iteration = 0; iteration < 8; iteration++) {
    let changed = false;
    for (const family of families) {
      const movingIds = [...new Set(family.rootIds.flatMap((rootId) => collectSubtreeIds(rootId, forest, subtreeCache)))];
      if (!movingIds.length) continue;
      const stationaryIds = allIds.filter((id) => !movingIds.includes(id));
      const violating = horizontalViolationObstacles(targets, movingIds, stationaryIds, settings.horizontalGap);
      if (!violating.length) continue;

      const chosen = nearestHorizontalClearanceShift(targets, movingIds, stationaryIds, settings.horizontalGap);
      if (chosen === 0) continue;

      const shifted = translateSubtreeX(targets, movingIds, chosen);
      stats.attachmentContourRescues++;
      stats.attachmentContourShiftedNodes += shifted;
      stats.maxAttachmentContourShift = Math.max(stats.maxAttachmentContourShift, Math.abs(chosen));
      changed = true;
    }
    if (!changed) return;
  }
}

function requiredRightProjectionShift(targets: Map<string, TreeTargetNode>, obstacles: string[], moving: string[], gap: number): number {
  let required = 0;
  for (const obstacleId of obstacles) {
    const a = targets.get(obstacleId)?.rect;
    if (!a) continue;
    for (const movingId of moving) {
      const b = targets.get(movingId)?.rect;
      if (!b || a.x > b.x) continue;
      const shift = rectRight(a) + gap - b.x;
      if (shift > 0) required = Math.max(required, shift);
    }
  }
  return Math.max(0, cleanNumber(required));
}

/** Minimum downward translation needed for lower to clear every overlapping X slice of upper. */
function requiredDownShift(
  targets: Map<string, TreeTargetNode>,
  upper: string[],
  lower: string[],
  gap: number,
  compactLowerRootId?: string,
  inlineBranchRoots?: Set<string>,
): number {
  let required = 0;
  for (const upperId of upper) {
    const a = targets.get(upperId)?.rect;
    if (!a) continue;
    for (const lowerId of lower) {
      const b = targets.get(lowerId)?.rect;
      if (!b || !xRangesOverlap(a, b)) continue;
      // Sibling subtrees may legitimately interleave. A pair is already clear
      // when it has the requested padding in either vertical direction; do not
      // force every node of the nominally "lower" cluster beneath every node of
      // the occupied cluster.
      const pairGap = lowerId === compactLowerRootId && inlineBranchRoots?.has(lowerId)
        ? Math.min(gap, 24)
        : gap;
      const clearBelow = b.y >= rectBottom(a) + pairGap;
      const clearAbove = rectBottom(b) + pairGap <= a.y;
      if (clearBelow || clearAbove) continue;
      required = Math.max(required, rectBottom(a) + pairGap - b.y);
    }
  }
  return Math.max(0, cleanNumber(required));
}

/** Maximum upward translation (negative) needed for upper to clear lower. */
function requiredUpShift(targets: Map<string, TreeTargetNode>, upper: string[], lower: string[], gap: number): number {
  let required = 0;
  for (const upperId of upper) {
    const a = targets.get(upperId)?.rect;
    if (!a) continue;
    for (const lowerId of lower) {
      const b = targets.get(lowerId)?.rect;
      if (!b || !xRangesOverlap(a, b)) continue;
      const delta = b.y - gap - rectBottom(a);
      if (delta < required) required = delta;
    }
  }
  return cleanNumber(required);
}

function collectSubtreeIds(rootId: string, forest: PrimaryForest, cache: Map<string, string[]>): string[] {
  const cached = cache.get(rootId);
  if (cached) return cached;
  const ids = [rootId, ...(forest.childrenByNode.get(rootId) ?? []).flatMap((childId) => collectSubtreeIds(childId, forest, cache))];
  cache.set(rootId, ids);
  return ids;
}

/** Smallest nested branch root owning a colliding node within a sibling cluster. */
function smallestBranchRoot(nodeId: string, boundaryRoot: string, forest: PrimaryForest): string {
  let current = nodeId;
  const seen = new Set<string>();
  while (current !== boundaryRoot && !seen.has(current)) {
    seen.add(current);
    const parent = forest.parentByNode.get(current);
    if (!parent) break;
    if ((forest.childrenByNode.get(parent)?.length ?? 0) > 1) return current;
    current = parent;
  }
  return boundaryRoot;
}

/**
 * A tiny contour collision should not explode a whole branch vertically.
 * When the colliding nested root belongs to a fork, move every sibling root
 * that currently occupies the same X band together. This preserves the local
 * fork column while adding only the horizontal clearance actually required by
 * the neighbouring branch contour.
 */
function localForkBandRoots(
  nodeId: string,
  boundaryRoot: string,
  targets: Map<string, TreeTargetNode>,
  forest: PrimaryForest,
): string[] {
  if (nodeId === boundaryRoot) return [];
  const parentId = forest.parentByNode.get(nodeId);
  if (!parentId) return [];
  const field = normalizedToken(forest.edgeFieldByChild.get(nodeId) ?? '');
  const siblings = (forest.childrenByNode.get(parentId) ?? [])
    .filter((siblingId) => isFlowRole(forest.edgeRoleByChild.get(siblingId)))
    .filter((siblingId) => normalizedToken(forest.edgeFieldByChild.get(siblingId) ?? '') === field);
  if (siblings.length < 2) return [];
  const anchorX = targets.get(nodeId)?.rect.x;
  if (anchorX === undefined) return [];
  return siblings.filter((siblingId) => {
    const siblingX = targets.get(siblingId)?.rect.x;
    return siblingX !== undefined && Math.abs(siblingX - anchorX) <= 1;
  });
}

function contourRescueGap(horizontalGap: number): number {
  const base = Math.max(0, horizontalGap);
  // A small safety pad keeps contours from sitting on a hairline boundary.
  // It scales with the requested gap, but remains bounded so compact layouts
  // stay compact. H10 => 15 px contour clearance.
  return cleanNumber(base + Math.min(12, Math.max(4, base * 0.5)));
}

function contourRescueLimit(horizontalGap: number): number {
  return cleanNumber(Math.max(48, Math.min(96, Math.max(0, horizontalGap) * 4 + 24)));
}

function nearestDeepBranchRoot(
  nodeId: string,
  boundaryRoot: string,
  forest: PrimaryForest,
  deepBranchRoots: Set<string>,
): string | undefined {
  let current = nodeId;
  const seen = new Set<string>();
  while (!seen.has(current)) {
    seen.add(current);
    if (deepBranchRoots.has(current)) return current;
    if (current === boundaryRoot) break;
    const parent = forest.parentByNode.get(current);
    if (!parent) break;
    current = parent;
  }
  return undefined;
}

interface CollisionPair {
  upperId: string;
  lowerId: string;
  required: number;
}

function worstDownCollision(
  targets: Map<string, TreeTargetNode>,
  upper: string[],
  lower: string[],
  gap: number,
  compactLowerRootId?: string,
  inlineBranchRoots?: Set<string>,
): CollisionPair | undefined {
  let worst: CollisionPair | undefined;
  for (const upperId of upper) {
    const a = targets.get(upperId)?.rect;
    if (!a) continue;
    for (const lowerId of lower) {
      const b = targets.get(lowerId)?.rect;
      if (!b || !xRangesOverlap(a, b)) continue;
      const pairGap = lowerId === compactLowerRootId && inlineBranchRoots?.has(lowerId)
        ? Math.min(gap, 24)
        : gap;
      const clearBelow = b.y >= rectBottom(a) + pairGap;
      const clearAbove = rectBottom(b) + pairGap <= a.y;
      if (clearBelow || clearAbove) continue;
      const required = rectBottom(a) + pairGap - b.y;
      if (required > 0 && (!worst || required > worst.required)) worst = { upperId, lowerId, required };
    }
  }
  return worst;
}

/**
 * Repair a sibling cluster against already occupied siblings. When a collision
 * happens deep inside the branch, move the nearest nested fork child rather than
 * immediately translating the entire top-level branch. This retains interleaved
 * author clusters whenever the actual node rectangles allow it.
 */
function spacingViolationAfterShift(
  targets: Map<string, TreeTargetNode>,
  movingIds: string[],
  stationaryIds: string[],
  deltaY: number,
  gap: number,
): boolean {
  const moving = new Set(movingIds);
  for (const movingId of movingIds) {
    const source = targets.get(movingId)?.rect;
    if (!source) continue;
    const shifted = { ...source, y: source.y + deltaY };
    for (const stationaryId of stationaryIds) {
      if (moving.has(stationaryId)) continue;
      const stationary = targets.get(stationaryId)?.rect;
      if (!stationary || !xRangesOverlap(shifted, stationary)) continue;
      const separated = rectBottom(shifted) + gap <= stationary.y || rectBottom(stationary) + gap <= shifted.y;
      if (!separated) return true;
    }
  }
  return false;
}

interface XShiftSpacingIndex {
  byTop: Array<{ id: string; index: number; rect: LayoutRect }>;
  byBottom: Array<{ id: string; index: number; rect: LayoutRect }>;
}

function prepareXShiftSpacingIndex(
  targets: Map<string, TreeTargetNode>,
  movingIds: string[],
  stationaryIds: string[],
): XShiftSpacingIndex {
  const moving = new Set(movingIds);
  const stationary = stationaryIds
    .filter((id) => !moving.has(id))
    .map((id, index) => ({ id, index, rect: targets.get(id)?.rect }))
    .filter((entry): entry is { id: string; index: number; rect: LayoutRect } => Boolean(entry.rect));
  return {
    byTop: [...stationary].sort((a, b) => a.rect.y - b.rect.y || a.index - b.index),
    byBottom: [...stationary].sort((a, b) => rectBottom(a.rect) - rectBottom(b.rect) || a.index - b.index),
  };
}

function spacingViolationAfterXShift(
  targets: Map<string, TreeTargetNode>,
  movingIds: string[],
  stationaryIds: string[],
  deltaX: number,
  gap: number,
  prepared?: XShiftSpacingIndex,
): boolean {
  const index = prepared ?? prepareXShiftSpacingIndex(targets, movingIds, stationaryIds);
  const { byTop, byBottom } = index;
  if (!byTop.length) return false;
  const upperBoundTop = (value: number): number => {
    let low = 0; let high = byTop.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (byTop[mid].rect.y < value) low = mid + 1;
      else high = mid;
    }
    return low;
  };
  const lowerBoundBottom = (value: number): number => {
    let low = 0; let high = byBottom.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (rectBottom(byBottom[mid].rect) <= value) low = mid + 1;
      else high = mid;
    }
    return low;
  };

  for (const movingId of movingIds) {
    const source = targets.get(movingId)?.rect;
    if (!source) continue;
    const shifted = { ...source, x: source.x + deltaX };
    const bottom = rectBottom(shifted);
    const topLimit = upperBoundTop(bottom);
    const bottomStart = lowerBoundBottom(shifted.y);
    if (topLimit <= byBottom.length - bottomStart) {
      for (let i = 0; i < topLimit; i++) {
        const candidate = byTop[i].rect;
        if (rectBottom(candidate) <= shifted.y) continue;
        const separated = rectRight(shifted) + gap <= candidate.x || rectRight(candidate) + gap <= shifted.x;
        if (!separated) return true;
      }
    } else {
      for (let i = bottomStart; i < byBottom.length; i++) {
        const candidate = byBottom[i].rect;
        if (candidate.y >= bottom) continue;
        const separated = rectRight(shifted) + gap <= candidate.x || rectRight(candidate) + gap <= shifted.x;
        if (!separated) return true;
      }
    }
  }
  return false;
}

function rescueDirectForkBandsInX(
  targets: Map<string, TreeTargetNode>,
  forest: PrimaryForest,
  occupied: string[],
  current: SubtreeInfo,
  settings: LayoutEngineSettings,
  stats: AuthorTreeNormalizeStats,
  subtreeCache: Map<string, string[]>,
): void {
  const childRoots = (forest.childrenByNode.get(current.rootId) ?? [])
    .filter((childId) => isFlowRole(forest.edgeRoleByChild.get(childId)))
    .filter((childId) => normalizedToken(forest.edgeFieldByChild.get(childId) ?? '') === 'inputs');
  if (childRoots.length < 2) return;

  const bands: string[][] = [];
  for (const childId of childRoots) {
    const x = targets.get(childId)?.rect.x;
    if (x === undefined) continue;
    const band = bands.find((members) => {
      const anchor = targets.get(members[0])?.rect.x;
      return anchor !== undefined && Math.abs(anchor - x) <= 1;
    });
    if (band) band.push(childId);
    else bands.push([childId]);
  }

  for (const roots of bands) {
    const bandIds = [...new Set(roots.flatMap((rootId) => collectSubtreeIds(rootId, forest, subtreeCache)))];
    const xShift = requiredRightProjectionShift(targets, occupied, bandIds, contourRescueGap(settings.horizontalGap));
    if (xShift <= 0 || xShift > contourRescueLimit(settings.horizontalGap)) continue;
    if (spacingViolationAfterXShift(targets, bandIds, current.nodeIds, xShift, settings.horizontalGap)) continue;
    stats.xRescueShiftedNodes += translateSubtreeX(targets, bandIds, xShift);
    stats.contourXRescues++;
    stats.maxXRescueShift = Math.max(stats.maxXRescueShift, Math.abs(xShift));
  }
}

function resolveDownWithSmallestCluster(
  targets: Map<string, TreeTargetNode>,
  forest: PrimaryForest,
  occupied: string[],
  current: SubtreeInfo,
  settings: LayoutEngineSettings,
  stats: AuthorTreeNormalizeStats,
  subtreeCache: Map<string, string[]>,
  deepBranchRoots: Set<string>,
  inlineBranchRoots: Set<string>,
): void {
  rescueDirectForkBandsInX(targets, forest, occupied, current, settings, stats, subtreeCache);
  for (let iteration = 0; iteration < 64; iteration++) {
    const collision = worstDownCollision(targets, occupied, current.nodeIds, settings.verticalGap, current.rootId, inlineBranchRoots);
    if (!collision) return;

    const movableRoot = smallestBranchRoot(collision.lowerId, current.rootId, forest);
    const movableIds = collectSubtreeIds(movableRoot, forest, subtreeCache);
    const nestedShift = requiredDownShift(targets, occupied, movableIds, settings.verticalGap, movableRoot, inlineBranchRoots);
    const nestedSafe = movableRoot !== current.rootId
      && nestedShift > 0
      && !spacingViolationAfterShift(targets, movableIds, current.nodeIds, nestedShift, settings.verticalGap);
    const wholeShift = requiredDownShift(targets, occupied, current.nodeIds, settings.verticalGap, current.rootId, inlineBranchRoots);

    type Repair = {
      kind: 'attachment-x' | 'attachment-y' | 'band-x' | 'nested-y' | 'deep-x' | 'whole-y';
      cost: number;
      magnitude: number;
      apply: () => void;
    };
    const repairs: Repair[] = [];

    // Tiny same-band X corrections remain the cheapest geometric repair.
    const bandRoots = localForkBandRoots(movableRoot, current.rootId, targets, forest);
    if (bandRoots.length) {
      const bandIds = [...new Set(bandRoots.flatMap((rootId) => collectSubtreeIds(rootId, forest, subtreeCache)))];
      const xShift = requiredRightShift(targets, occupied, bandIds, contourRescueGap(settings.horizontalGap));
      if (xShift > 0
        && xShift <= contourRescueLimit(settings.horizontalGap)
        && !spacingViolationAfterXShift(targets, bandIds, current.nodeIds, xShift, settings.horizontalGap)) {
        repairs.push({
          kind: 'band-x',
          cost: Math.abs(xShift) * Math.max(1, bandIds.length) * 0.8,
          magnitude: Math.abs(xShift),
          apply: () => {
            stats.xRescueShiftedNodes += translateSubtreeX(targets, bandIds, xShift);
            stats.contourXRescues++;
            stats.maxXRescueShift = Math.max(stats.maxXRescueShift, Math.abs(xShift));
          },
        });
      }
    }

    // Cross-domain collision: an attachment in an already placed branch may be
    // much cheaper to move than a deep flow subtree. Move the outer attachment
    // family as one rigid island and compare its total displacement cost.
    const attachmentFamily = nearestAttachmentFamilyForNode(collision.upperId, forest);
    if (attachmentFamily) {
      const attachmentIds = [...new Set(attachmentFamily.rootIds.flatMap((rootId) => collectSubtreeIds(rootId, forest, subtreeCache)))];
      const localStationary = [...new Set([...occupied, ...current.nodeIds])].filter((id) => !attachmentIds.includes(id));

      const attachmentYShift = nearestVerticalClearanceShift(targets, attachmentIds, localStationary, settings.verticalGap);
      if (attachmentYShift !== 0) {
        repairs.push({
          kind: 'attachment-y',
          cost: Math.abs(attachmentYShift) * Math.max(1, attachmentIds.length),
          magnitude: Math.abs(attachmentYShift),
          apply: () => {
            const shifted = translateSubtree(targets, attachmentIds, attachmentYShift);
            stats.attachmentContourRescues++;
            stats.attachmentContourShiftedNodes += shifted;
            stats.maxAttachmentContourShift = Math.max(stats.maxAttachmentContourShift, Math.abs(attachmentYShift));
          },
        });
      }

      const attachmentShift = nearestHorizontalClearanceShift(targets, attachmentIds, localStationary, settings.horizontalGap);
      if (attachmentShift !== 0) {
        repairs.push({
          kind: 'attachment-x',
          cost: Math.abs(attachmentShift) * Math.max(1, attachmentIds.length),
          magnitude: Math.abs(attachmentShift),
          apply: () => {
            const shifted = translateSubtreeX(targets, attachmentIds, attachmentShift);
            stats.attachmentContourRescues++;
            stats.attachmentContourShiftedNodes += shifted;
            stats.maxAttachmentContourShift = Math.max(stats.maxAttachmentContourShift, Math.abs(attachmentShift));
          },
        });
      }
    }

    if (nestedSafe) {
      repairs.push({
        kind: 'nested-y',
        cost: Math.abs(nestedShift) * Math.max(1, movableIds.length),
        magnitude: Math.abs(nestedShift),
        apply: () => {
          stats.clusterShiftedNodes += translateSubtree(targets, movableIds, nestedShift);
          stats.clusterCollisionsResolved++;
          stats.maxClusterShift = Math.max(stats.maxClusterShift, Math.abs(nestedShift));
        },
      });
    }

    // Deep X rescue is now a candidate rather than an unconditional first move.
    // Large rigid translations lose naturally against a smaller attachment or
    // local Y repair because cost scales by affected node count.
    const deepRoot = nearestDeepBranchRoot(collision.lowerId, current.rootId, forest, deepBranchRoots);
    if (deepRoot) {
      const deepIds = collectSubtreeIds(deepRoot, forest, subtreeCache);
      const xShift = requiredRightShift(targets, occupied, deepIds, settings.horizontalGap);
      const maxWidth = Math.max(...deepIds.map((id) => targets.get(id)?.rect.width ?? 0), 1);
      const maxRescue = Math.max(900, maxWidth * 2.25);
      if (xShift > 0
        && xShift <= maxRescue
        && !spacingViolationAfterXShift(targets, deepIds, current.nodeIds, xShift, settings.horizontalGap)) {
        repairs.push({
          kind: 'deep-x',
          cost: Math.abs(xShift) * Math.max(1, deepIds.length) * 1.15,
          magnitude: Math.abs(xShift),
          apply: () => {
            stats.xRescueShiftedNodes += translateSubtreeX(targets, deepIds, xShift);
            stats.authorDepthXRescues++;
            stats.maxXRescueShift = Math.max(stats.maxXRescueShift, Math.abs(xShift));
          },
        });
      }
    }

    if (wholeShift > 0) {
      repairs.push({
        kind: 'whole-y',
        cost: Math.abs(wholeShift) * Math.max(1, current.nodeIds.length) * 1.05,
        magnitude: Math.abs(wholeShift),
        apply: () => {
          stats.clusterShiftedNodes += translateSubtree(targets, current.nodeIds, wholeShift);
          stats.clusterCollisionsResolved++;
          stats.maxClusterShift = Math.max(stats.maxClusterShift, Math.abs(wholeShift));
        },
      });
    }

    const chosen = repairs.sort((a, b) => a.cost - b.cost || a.magnitude - b.magnitude)[0];
    if (!chosen) return;
    chosen.apply();
    if (chosen.kind === 'whole-y') return;
  }
}



function ancestorPathToRoot(nodeId: string, forest: PrimaryForest): string[] {
  const path = [nodeId];
  const seen = new Set<string>(path);
  let current = nodeId;
  while (true) {
    const parent = forest.parentByNode.get(current);
    if (!parent || seen.has(parent)) break;
    path.push(parent);
    seen.add(parent);
    current = parent;
  }
  return path.reverse();
}

function divergentBranchRoot(
  nodeId: string,
  otherNodeId: string,
  forest: PrimaryForest,
): string | undefined {
  const path = ancestorPathToRoot(nodeId, forest);
  const other = ancestorPathToRoot(otherNodeId, forest);
  let shared = -1;
  const length = Math.min(path.length, other.length);
  for (let i = 0; i < length && path[i] === other[i]; i++) shared = i;
  if (shared < 0) return undefined;
  if (shared + 1 < path.length) return path[shared + 1];
  return undefined;
}

interface RoutingBranchClearContext {
  incidentEdges: LayoutReaderV2Edge[];
  stationaryRoutes: RoutedLayoutEdge[];
  movingTargets: TreeTargetNode[];
  stationaryTargets: Array<[string, TreeTargetNode]>;
}

function prepareRoutingBranchClear(
  targets: Map<string, TreeTargetNode>,
  semanticEdges: LayoutReaderV2Edge[],
  movingIds: string[],
): RoutingBranchClearContext {
  const moving = new Set(movingIds);
  const movingTargets = movingIds.map((id) => targets.get(id)).filter((target): target is TreeTargetNode => Boolean(target));
  const stationaryTargets = [...targets.entries()].filter(([id]) => !moving.has(id));
  const incidentEdges: LayoutReaderV2Edge[] = [];
  const stationaryRoutes: RoutedLayoutEdge[] = [];
  for (const edge of semanticEdges) {
    if (edge.role !== 'flow') continue;
    if (moving.has(edge.parentId) || moving.has(edge.childId)) incidentEdges.push(edge);
    else {
      const route = buildRoutedLayoutEdge(targets, edge);
      if (route) stationaryRoutes.push(route);
    }
  }
  return { incidentEdges, stationaryRoutes, movingTargets, stationaryTargets };
}

function routingBranchClear(
  targets: Map<string, TreeTargetNode>,
  context: RoutingBranchClearContext,
  padding: number,
): boolean {
  for (const edge of context.incidentEdges) {
    const route = buildRoutedLayoutEdge(targets, edge);
    if (!route) continue;
    for (const [nodeId, target] of context.stationaryTargets) {
      if (nodeId === edge.parentId || nodeId === edge.childId) continue;
      if (routeIntersectsRect(route, target.rect, padding)) return false;
    }
  }
  for (const route of context.stationaryRoutes) {
    const edge = route.edge;
    for (const target of context.movingTargets) {
      const nodeId = target.source.node.id;
      if (nodeId === edge.parentId || nodeId === edge.childId) continue;
      if (routeIntersectsRect(route, target.rect, padding)) return false;
    }
  }
  return true;
}

function findRoutingBranchRightShift(
  targets: Map<string, TreeTargetNode>,
  movingIds: string[],
  semanticEdges: LayoutReaderV2Edge[],
  settings: LayoutEngineSettings,
  padding: number,
): number {
  if (!movingIds.length) return 0;
  const allIds = [...targets.keys()];
  const spacingIndex = prepareXShiftSpacingIndex(targets, movingIds, allIds);
  const routingContext = prepareRoutingBranchClear(targets, semanticEdges, movingIds);
  const step = Math.max(20, Math.min(80, Math.max(1, settings.horizontalGap)));
  const maxShift = Math.max(2400, Math.min(4800, step * 60));
  let lastBlocked = 0;
  let firstClear = 0;
  const clearAt = (deltaX: number): boolean => {
    if (spacingViolationAfterXShift(targets, movingIds, allIds, deltaX, settings.horizontalGap, spacingIndex)) return false;
    translateSubtreeX(targets, movingIds, deltaX);
    const clear = routingBranchClear(targets, routingContext, padding);
    translateSubtreeX(targets, movingIds, -deltaX);
    return clear;
  };
  for (let delta = step; delta <= maxShift; delta += step) {
    if (clearAt(delta)) {
      firstClear = delta;
      break;
    }
    lastBlocked = delta;
  }
  if (!firstClear) return 0;
  let low = lastBlocked;
  let high = firstClear;
  while (high - low > 1) {
    const mid = (low + high) / 2;
    if (clearAt(mid)) high = mid;
    else low = mid;
  }
  return cleanNumber(high);
}

function edgeBandRoots(
  childId: string,
  targets: Map<string, TreeTargetNode>,
  forest: PrimaryForest,
): string[] {
  const parentId = forest.parentByNode.get(childId);
  if (!parentId) return [];
  const child = targets.get(childId);
  if (!child) return [];
  const field = normalizedToken(forest.edgeFieldByChild.get(childId) ?? '');
  return (forest.childrenByNode.get(parentId) ?? [])
    .filter((siblingId) => isFlowRole(forest.edgeRoleByChild.get(siblingId)))
    .filter((siblingId) => normalizedToken(forest.edgeFieldByChild.get(siblingId) ?? '') === field)
    .filter((siblingId) => {
      const sibling = targets.get(siblingId);
      return sibling && Math.abs(sibling.rect.x - child.rect.x) <= 12;
    });
}

function incomingBandEdges(
  roots: string[],
  forest: PrimaryForest,
  semanticEdges: LayoutReaderV2Edge[],
): LayoutReaderV2Edge[] {
  if (!roots.length) return [];
  const rootSet = new Set(roots);
  const parentId = forest.parentByNode.get(roots[0]);
  return semanticEdges.filter((edge) => edge.role === 'flow'
    && edge.parentId === parentId
    && rootSet.has(edge.childId));
}

function incomingEdgesClearNodes(
  targets: Map<string, TreeTargetNode>,
  edges: LayoutReaderV2Edge[],
  padding: number,
): boolean {
  if (!edges.length) return true;
  for (const edge of edges) {
    const route = buildRoutedLayoutEdge(targets, edge);
    if (!route) continue;
    for (const [nodeId, target] of targets) {
      if (nodeId === edge.parentId || nodeId === edge.childId) continue;
      if (routeIntersectsRect(route, target.rect, padding)) return false;
    }
  }
  return true;
}

function findRoutingBandRightShift(
  targets: Map<string, TreeTargetNode>,
  movingIds: string[],
  incomingEdges: LayoutReaderV2Edge[],
  settings: LayoutEngineSettings,
  padding: number,
): number {
  if (!movingIds.length || !incomingEdges.length) return 0;
  const allIds = [...targets.keys()];
  const spacingIndex = prepareXShiftSpacingIndex(targets, movingIds, allIds);
  const step = Math.max(20, Math.min(80, Math.max(1, settings.horizontalGap)));
  const maxShift = Math.max(1600, Math.min(3200, step * 40));
  let lastBlocked = 0;
  let firstClear = 0;

  const clearAt = (deltaX: number): boolean => {
    if (spacingViolationAfterXShift(targets, movingIds, allIds, deltaX, settings.horizontalGap, spacingIndex)) return false;
    translateSubtreeX(targets, movingIds, deltaX);
    const clear = incomingEdgesClearNodes(targets, incomingEdges, padding);
    translateSubtreeX(targets, movingIds, -deltaX);
    return clear;
  };

  for (let delta = step; delta <= maxShift; delta += step) {
    if (clearAt(delta)) {
      firstClear = delta;
      break;
    }
    lastBlocked = delta;
  }
  if (!firstClear) return 0;

  // Refine the first safe interval to pixel accuracy. A route-aware X rescue is
  // allowed to be large when a long connection lane genuinely needs the room,
  // but it should still pay only the minimum geometry-derived displacement.
  let low = lastBlocked;
  let high = firstClear;
  while (high - low > 1) {
    const mid = (low + high) / 2;
    if (clearAt(mid)) high = mid;
    else low = mid;
  }
  return cleanNumber(high);
}

/**
 * Final routing-aware pass. Node-only compaction can be geometrically valid yet
 * visually dirty because the Bezier connection from one sibling branch cuts
 * through nodes belonging to another branch. Reserve the actual incoming wire
 * corridor for each affected flow band and move that rigid band to the right by
 * the smallest amount that clears both nodes and the padded wire lane.
 */
function resolveEdgeCorridors(
  targets: Map<string, TreeTargetNode>,
  forest: PrimaryForest,
  settings: LayoutEngineSettings,
  stats: AuthorTreeNormalizeStats,
  subtreeCache: Map<string, string[]>,
  semanticEdges: LayoutReaderV2Edge[],
): void {
  const padding = routingCorridorPadding(settings.horizontalGap);
  const flowEdges = semanticEdges.filter((edge) => edge.role === 'flow');
  const before = auditEdgeCorridors(targets, flowEdges, padding);
  stats.routedFlowEdges = before.routedEdges;
  stats.edgeNodeIntersectionsBefore = before.edgeNodeIntersections;

  const failed = new Set<string>();
  for (let iteration = 0; iteration < 24; iteration++) {
    const audit = auditEdgeCorridors(targets, flowEdges, padding);
    const conflict = audit.edgeNodeConflicts.find((item) => !failed.has(`${item.edgeKey}|${item.nodeId}`));
    if (!conflict) break;
    const conflictKey = `${conflict.edgeKey}|${conflict.nodeId}`;

    // Identify the two branches at their structural divergence. The author-deeper
    // side is the visual "rear" branch and is tried first. This is the useful
    // version of the former ~1k X rescue: a large move is legal only when a real
    // routed wire proves that the separation is required.
    const routeProbe = conflict.parentId === conflict.nodeId ? conflict.childId : conflict.parentId;
    const routeRoot = divergentBranchRoot(routeProbe, conflict.nodeId, forest)
      ?? divergentBranchRoot(conflict.childId, conflict.nodeId, forest);
    const foreignRoot = divergentBranchRoot(conflict.nodeId, routeProbe, forest)
      ?? divergentBranchRoot(conflict.nodeId, conflict.childId, forest);
    const routeAuthorX = routeRoot ? targets.get(routeRoot)?.source.canonicalRect.x : undefined;
    const foreignAuthorX = foreignRoot ? targets.get(foreignRoot)?.source.canonicalRect.x : undefined;
    const preferredRoot = routeRoot && foreignRoot
      ? ((routeAuthorX ?? 0) >= (foreignAuthorX ?? 0) ? routeRoot : foreignRoot)
      : routeRoot ?? foreignRoot;
    const alternateRoot = preferredRoot === routeRoot ? foreignRoot : routeRoot;
    let repaired = false;

    for (const candidateRoot of [preferredRoot, alternateRoot].filter((root): root is string => Boolean(root))) {
      const branchIds = collectSubtreeIds(candidateRoot, forest, subtreeCache);
      if (branchIds.includes(conflict.parentId) && candidateRoot === conflict.parentId) continue;
      const branchShift = findRoutingBranchRightShift(targets, branchIds, flowEdges, settings, padding);
      if (branchShift <= 0) continue;
      stats.edgeCorridorShiftedNodes += translateSubtreeX(targets, branchIds, branchShift);
      stats.edgeCorridorRepairs++;
      stats.maxEdgeCorridorShift = Math.max(stats.maxEdgeCorridorShift, Math.abs(branchShift));
      const check = auditEdgeCorridors(targets, flowEdges, padding);
      if (!check.edgeNodeConflicts.some((item) => item.edgeKey === conflict.edgeKey && item.nodeId === conflict.nodeId)) {
        repaired = true;
        break;
      }
      // If the chosen branch did not solve the target conflict, undo it before
      // trying the alternate branch. Do not accumulate speculative translations.
      translateSubtreeX(targets, branchIds, -branchShift);
      stats.edgeCorridorShiftedNodes -= branchIds.length;
      stats.edgeCorridorRepairs--;
      // maxEdgeCorridorShift is a diagnostic maximum; leaving the attempted max
      // would be misleading, so recompute lazily from successful moves only by
      // clearing it when no repair has survived yet.
      if (stats.edgeCorridorRepairs === 0) stats.maxEdgeCorridorShift = 0;
    }

    if (repaired) continue;

    // Last local option: move only the direct incoming flow band. This catches
    // compact forks where the divergent branch itself cannot move because the
    // foreign branch occupies the same author section.
    const roots = edgeBandRoots(conflict.childId, targets, forest);
    if (roots.length) {
      const movingIds = [...new Set(roots.flatMap((rootId) => collectSubtreeIds(rootId, forest, subtreeCache)))];
      const edges = incomingBandEdges(roots, forest, flowEdges);
      const shift = findRoutingBandRightShift(targets, movingIds, edges, settings, padding);
      if (shift > 0) {
        stats.edgeCorridorShiftedNodes += translateSubtreeX(targets, movingIds, shift);
        stats.edgeCorridorRepairs++;
        stats.maxEdgeCorridorShift = Math.max(stats.maxEdgeCorridorShift, Math.abs(shift));
        continue;
      }
    }

    failed.add(conflictKey);
  }

  const after = auditEdgeCorridors(targets, flowEdges, padding);
  const allTypedAfter = auditEdgeCorridors(targets, semanticEdges, 0);
  stats.routedFlowEdges = after.routedEdges;
  stats.edgeNodeIntersectionsAfter = after.edgeNodeIntersections;
  stats.edgeNodeCorridorIntrusionsAfter = after.edgeNodeCorridorIntrusions;
  stats.edgeEdgeCrossingsAfter = allTypedAfter.edgeEdgeCrossings;
  stats.attachmentEdgeNodeIntersectionsAfter = allTypedAfter.edgeNodeConflicts
    .filter((conflict) => conflict.role === 'attachment' || conflict.role === 'ordered-attachment').length;

}

function currentConnectionPlaneDelta(parent: TreeTargetNode, child: TreeTargetNode, field: string | undefined): number {
  const intent = connectionPlaneIntent(parent, child, field, Number.POSITIVE_INFINITY);
  if (intent.parentPort && intent.childPort) {
    return cleanNumber((child.rect.y + intent.childPort.centerY) - (parent.rect.y + intent.parentPort.centerY));
  }
  return cleanNumber(centerY(child.rect) - centerY(parent.rect));
}

function laneDeviationSummary(
  targets: Map<string, TreeTargetNode>,
  forest: PrimaryForest,
  laneTargets: Map<string, number>,
): { max: number; median: number } {
  const deviations = [...laneTargets]
    .map(([childId, targetDelta]) => {
      const parentId = forest.parentByNode.get(childId);
      const parent = parentId ? targets.get(parentId) : undefined;
      const child = targets.get(childId);
      if (!parent || !child) return undefined;
      return Math.abs(currentConnectionPlaneDelta(parent, child, forest.edgeFieldByChild.get(childId)) - targetDelta);
    })
    .filter((value): value is number => value !== undefined);
  return { max: deviations.length ? Math.max(...deviations) : 0, median: median(deviations) };
}

function movingSubtreeOverlapsForeignNode(
  targets: Map<string, TreeTargetNode>,
  movingIds: string[],
): boolean {
  const moving = new Set(movingIds);
  for (const movingId of movingIds) {
    const a = targets.get(movingId)?.rect;
    if (!a) continue;
    for (const [otherId, other] of targets) {
      if (moving.has(otherId)) continue;
      const b = other.rect;
      if (a.x < rectRight(b) && rectRight(a) > b.x && a.y < rectBottom(b) && rectBottom(a) > b.y) return true;
    }
  }
  return false;
}

/**
 * Final safe Flow-Lane relaxation.
 *
 * Earlier passes are allowed to move whole branches to solve real contour and
 * routing conflicts. Those rigid moves can leave a chain that was clearly
 * authored inline a few pixels off its physical connector plane. A lane is an
 * explicit author-intent chain (single-child same-plane edges plus the chosen
 * main continuation of a fork). We realign parent->child connector centers by
 * translating the complete child subtree in Y, never the child node alone.
 *
 * A relaxation is accepted only when it keeps node geometry overlap-free, does
 * not increase exact typed wire/node intersections, and does not add unrelated
 * wire crossings. Large deviations are reported but left alone: they usually
 * mean a previous safety repair deliberately broke the visual lane.
 */
function normalizeFlowLanes(
  targets: Map<string, TreeTargetNode>,
  forest: PrimaryForest,
  settings: LayoutEngineSettings,
  stats: AuthorTreeNormalizeStats,
  subtreeCache: Map<string, string[]>,
  semanticEdges: LayoutReaderV2Edge[],
  laneTargets: Map<string, number>,
  visualRowTargets: Set<string>,
): void {
  stats.flowLaneEdges = laneTargets.size;
  stats.flowLanes = [...laneTargets.keys()].filter((childId) => {
    const parentId = forest.parentByNode.get(childId);
    return !parentId || !laneTargets.has(parentId);
  }).length;

  const beforeDeviation = laneDeviationSummary(targets, forest, laneTargets);
  stats.maxConnectionPlaneDeviationBefore = beforeDeviation.max;
  stats.medianConnectionPlaneDeviationBefore = beforeDeviation.median;
  stats.visualRowEdges = visualRowTargets.size;
  const rowDeviationsBefore = [...visualRowTargets].map((childId) => {
    const parentId = forest.parentByNode.get(childId);
    const parent = parentId ? targets.get(parentId) : undefined;
    const child = targets.get(childId);
    return parent && child ? Math.abs(child.rect.y - parent.rect.y) : 0;
  });
  stats.visualRowMisalignedBefore = rowDeviationsBefore.filter((value) => value >= 0.5).length;
  stats.maxVisualRowDeviationBefore = rowDeviationsBefore.length ? Math.max(...rowDeviationsBefore) : 0;
  if (!laneTargets.size) return;

  const flowEdges = semanticEdges.filter((edge) => edge.role === 'flow');
  let flowAudit = auditEdgeCorridors(targets, flowEdges, 0);
  let typedAudit = auditEdgeCorridors(targets, semanticEdges, 0);
  const realignedNodeIds = new Set<string>();
  const orderedChildren = [...laneTargets.keys()].sort((a, b) => {
    const aa = targets.get(a)?.source.node.jsonPath.length ?? 0;
    const bb = targets.get(b)?.source.node.jsonPath.length ?? 0;
    return aa - bb;
  });
  const maxRelaxation = Math.max(18, connectionPlaneTolerance(settings) * 1.5);

  for (const childId of orderedChildren) {
    const parentId = forest.parentByNode.get(childId);
    const parent = parentId ? targets.get(parentId) : undefined;
    const child = targets.get(childId);
    if (!parent || !child) continue;
    const intent = connectionPlaneIntent(parent, child, forest.edgeFieldByChild.get(childId), Number.POSITIVE_INFINITY);
    const desiredY = visualRowTargets.has(childId)
      ? cleanNumber(parent.rect.y)
      : cleanNumber(alignedChildY(parent, child, intent) + (laneTargets.get(childId) ?? 0));
    const deltaY = cleanNumber(desiredY - child.rect.y);
    if (Math.abs(deltaY) < 0.5) continue;
    if (Math.abs(deltaY) > maxRelaxation) {
      stats.laneNormalizationBlocked++;
      continue;
    }

    const movingIds = collectSubtreeIds(childId, forest, subtreeCache);
    translateSubtree(targets, movingIds, deltaY);
    const overlaps = movingSubtreeOverlapsForeignNode(targets, movingIds);
    const nextFlowAudit = overlaps ? undefined : auditEdgeCorridors(targets, flowEdges, 0);
    const nextTypedAudit = overlaps ? undefined : auditEdgeCorridors(targets, semanticEdges, 0);
    const safe = !overlaps
      && Boolean(nextFlowAudit && nextTypedAudit)
      && nextFlowAudit!.edgeNodeIntersections <= flowAudit.edgeNodeIntersections
      && nextTypedAudit!.edgeNodeIntersections <= typedAudit.edgeNodeIntersections
      && nextTypedAudit!.edgeEdgeCrossings <= typedAudit.edgeEdgeCrossings;

    if (!safe) {
      translateSubtree(targets, movingIds, -deltaY);
      stats.laneNormalizationBlocked++;
      continue;
    }

    stats.laneRealignments++;
    if (visualRowTargets.has(childId)) stats.visualRowRealignments++;
    for (const movingId of movingIds) realignedNodeIds.add(movingId);
    stats.laneRealignedNodes = realignedNodeIds.size;
    stats.maxLaneShift = Math.max(stats.maxLaneShift, Math.abs(deltaY));
    flowAudit = nextFlowAudit!;
    typedAudit = nextTypedAudit!;
  }

  const afterDeviation = laneDeviationSummary(targets, forest, laneTargets);
  stats.maxConnectionPlaneDeviationAfter = afterDeviation.max;
  stats.medianConnectionPlaneDeviationAfter = afterDeviation.median;
  const rowDeviationsAfter = [...visualRowTargets].map((childId) => {
    const parentId = forest.parentByNode.get(childId);
    const parent = parentId ? targets.get(parentId) : undefined;
    const child = targets.get(childId);
    return parent && child ? Math.abs(child.rect.y - parent.rect.y) : 0;
  });
  stats.visualRowMisalignedAfter = rowDeviationsAfter.filter((value) => value >= 0.5).length;
  stats.maxVisualRowDeviationAfter = rowDeviationsAfter.length ? Math.max(...rowDeviationsAfter) : 0;

  // These are final-state metrics. Edge Corridor Repair owns the repair counts,
  // while Flow/Visual-Row Normalize owns only the safe Y relaxation counts above.
  const paddedFlowAudit = auditEdgeCorridors(targets, flowEdges, routingCorridorPadding(settings.horizontalGap));
  stats.routedFlowEdges = paddedFlowAudit.routedEdges;
  stats.edgeNodeIntersectionsAfter = paddedFlowAudit.edgeNodeIntersections;
  stats.edgeNodeCorridorIntrusionsAfter = paddedFlowAudit.edgeNodeCorridorIntrusions;
  stats.edgeEdgeCrossingsAfter = typedAudit.edgeEdgeCrossings;
  stats.attachmentEdgeNodeIntersectionsAfter = typedAudit.edgeNodeConflicts
    .filter((conflict) => conflict.role === 'attachment' || conflict.role === 'ordered-attachment').length;
}

/**
 * Backward pass: each fork's child subtree is a branch cluster. Real node
 * rectangles are compared only where X ranges overlap. Sibling cluster bounding
 * boxes may overlap freely; only actual node/gap collisions are repaired.
 */
function resolveSubtree(
  nodeId: string,
  targets: Map<string, TreeTargetNode>,
  forest: PrimaryForest,
  settings: LayoutEngineSettings,
  stats: AuthorTreeNormalizeStats,
  seen: Set<string>,
  subtreeCache: Map<string, string[]>,
  deepBranchRoots: Set<string>,
  inlineBranchRoots: Set<string>,
): SubtreeInfo {
  if (seen.has(nodeId)) return { rootId: nodeId, nodeIds: collectSubtreeIds(nodeId, forest, subtreeCache) };
  seen.add(nodeId);
  const childIds = forest.childrenByNode.get(nodeId) ?? [];
  const childInfos = childIds.map((childId) => resolveSubtree(childId, targets, forest, settings, stats, seen, subtreeCache, deepBranchRoots, inlineBranchRoots));
  const flowChildInfos = childInfos.filter((info) => isFlowRole(forest.edgeRoleByChild.get(info.rootId)));

  if (flowChildInfos.length > 1) {
    flowChildInfos.sort((a, b) => {
      const ea = targets.get(a.rootId)!;
      const eb = targets.get(b.rootId)!;
      return centerY(ea.source.canonicalRect) - centerY(eb.source.canonicalRect);
    });
    const occupied = [...flowChildInfos[0].nodeIds];
    for (let i = 1; i < flowChildInfos.length; i++) {
      const current = flowChildInfos[i];
      resolveDownWithSmallestCluster(targets, forest, occupied, current, settings, stats, subtreeCache, deepBranchRoots, inlineBranchRoots);
      occupied.push(...current.nodeIds);
    }
  }

  return { rootId: nodeId, nodeIds: collectSubtreeIds(nodeId, forest, subtreeCache) };
}

function resolveForestRoots(
  infos: SubtreeInfo[],
  preferredRootId: string | undefined,
  targets: Map<string, TreeTargetNode>,
  settings: LayoutEngineSettings,
  stats: AuthorTreeNormalizeStats,
): void {
  if (infos.length < 2) return;
  const ordered = [...infos].sort((a, b) => {
    const ea = targets.get(a.rootId)!;
    const eb = targets.get(b.rootId)!;
    return centerY(ea.source.canonicalRect) - centerY(eb.source.canonicalRect);
  });
  const anchorIndex = preferredRootId ? ordered.findIndex((info) => info.rootId === preferredRootId) : 0;
  const fixedIndex = anchorIndex >= 0 ? anchorIndex : 0;
  const fixed = ordered[fixedIndex];

  const belowOccupied = [...fixed.nodeIds];
  for (let i = fixedIndex + 1; i < ordered.length; i++) {
    const current = ordered[i];
    const shift = requiredDownShift(targets, belowOccupied, current.nodeIds, settings.verticalGap);
    if (shift > 0) {
      stats.clusterCollisionsResolved++;
      stats.clusterShiftedNodes += translateSubtree(targets, current.nodeIds, shift);
      stats.maxClusterShift = Math.max(stats.maxClusterShift, Math.abs(shift));
    }
    belowOccupied.push(...current.nodeIds);
  }

  const aboveOccupied = [...fixed.nodeIds];
  for (let i = fixedIndex - 1; i >= 0; i--) {
    const current = ordered[i];
    const shift = requiredUpShift(targets, current.nodeIds, aboveOccupied, settings.verticalGap);
    if (shift < 0) {
      stats.clusterCollisionsResolved++;
      stats.clusterShiftedNodes += translateSubtree(targets, current.nodeIds, shift);
      stats.maxClusterShift = Math.max(stats.maxClusterShift, Math.abs(shift));
    }
    aboveOccupied.push(...current.nodeIds);
  }
}

export function normalizeAuthorTree(
  entries: TreeTargetNode[],
  settings: LayoutEngineSettings,
  rootNodeId?: string,
  semanticEdges: LayoutReaderV2Edge[] = [],
): AuthorTreeNormalizeStats {
  const stats: AuthorTreeNormalizeStats = {
    treeNodes: entries.length,
    treeRoots: 0,
    forks: 0,
    branchClusters: 0,
    singleChildParents: 0,
    laneSnaps: 0,
    connectionPlanesAligned: 0,
    portAlignmentFallbacks: 0,
    authorDepthBands: 0,
    deepBranchStarts: 0,
    authorDepthXRescues: 0,
    contourXRescues: 0,
    xRescueShiftedNodes: 0,
    maxXRescueShift: 0,
    clusterCollisionsResolved: 0,
    clusterShiftedNodes: 0,
    maxClusterShift: 0,
    maxDepth: 0,
    attachmentXAdjustments: 0,
    maxAttachmentXAdjustment: 0,
    attachmentContourRescues: 0,
    attachmentContourShiftedNodes: 0,
    maxAttachmentContourShift: 0,
    routedFlowEdges: 0,
    edgeNodeIntersectionsBefore: 0,
    edgeNodeIntersectionsAfter: 0,
    edgeNodeCorridorIntrusionsAfter: 0,
    edgeEdgeCrossingsAfter: 0,
    attachmentEdgeNodeIntersectionsAfter: 0,
    edgeCorridorRepairs: 0,
    edgeCorridorShiftedNodes: 0,
    maxEdgeCorridorShift: 0,
    flowLanes: 0,
    flowLaneEdges: 0,
    laneRealignments: 0,
    laneRealignedNodes: 0,
    laneNormalizationBlocked: 0,
    visualRowEdges: 0,
    visualRowAuthorJitterEdges: 0,
    visualRowMisalignedBefore: 0,
    visualRowMisalignedAfter: 0,
    visualRowRealignments: 0,
    maxVisualRowDeviationBefore: 0,
    maxVisualRowDeviationAfter: 0,
    maxLaneShift: 0,
    maxConnectionPlaneDeviationBefore: 0,
    medianConnectionPlaneDeviationBefore: 0,
    maxConnectionPlaneDeviationAfter: 0,
    medianConnectionPlaneDeviationAfter: 0,
  };
  if (!entries.length) return stats;

  const targets = new Map(entries.map((entry) => [entry.source.node.id, entry]));
  const forest = buildPrimaryForest(entries, rootNodeId, semanticEdges);
  stats.treeRoots = forest.roots.length;
  stats.maxDepth = forest.maxDepth;

  if (rootNodeId && targets.has(rootNodeId)) {
    const root = targets.get(rootNodeId)!;
    root.rect.x = 0;
    root.rect.y = 0;
  }

  const deepBranchRoots = new Set<string>();
  const inlineBranchRoots = new Set<string>();
  const laneTargets = new Map<string, number>();
  const visualRowTargets = new Set<string>();
  const forwardSeen = new Set<string>();
  for (const rootId of forest.roots) {
    const root = targets.get(rootId);
    if (!root) continue;
    if (rootId !== rootNodeId) {
      // Disconnected trees preserve their canonical anchor; only their own descendants normalize.
      root.rect.x = root.source.canonicalRect.x;
      root.rect.y = root.source.canonicalRect.y;
    }
    forwardPlace(rootId, targets, forest, settings, stats, forwardSeen, deepBranchRoots, inlineBranchRoots, laneTargets, visualRowTargets);
  }

  const subtreeCache = new Map<string, string[]>();
  const backwardSeen = new Set<string>();
  const infos = forest.roots.map((rootId) => resolveSubtree(rootId, targets, forest, settings, stats, backwardSeen, subtreeCache, deepBranchRoots, inlineBranchRoots));
  resolveForestRoots(infos, rootNodeId, targets, settings, stats);
  resolveAttachmentFamilyContours(targets, forest, settings, stats, subtreeCache);
  resolveEdgeCorridors(targets, forest, settings, stats, subtreeCache, semanticEdges);
  normalizeFlowLanes(targets, forest, settings, stats, subtreeCache, semanticEdges, laneTargets, visualRowTargets);

  // The canonical live root is an invariant, even if malformed metadata tried to move it.
  if (rootNodeId && targets.has(rootNodeId)) {
    const root = targets.get(rootNodeId)!;
    root.rect.x = 0;
    root.rect.y = 0;
  }
  return stats;
}
