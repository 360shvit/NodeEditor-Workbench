import { auditEdgeCorridors, buildAuditRoutes, routeIntersectsRect, routesCross } from './edgeCorridor.js';
import { rectBottom, rectRight } from './geometry.js';
import type { LayoutReaderV2Edge } from './readerV2.js';
import type { PositionedLayoutNode } from './snapshot.js';
import type { LayoutEngineSettings, LayoutRect } from './types.js';
import {
  authorGuideClusterTolerance,
  authorGuideShiftLimit,
  authorRowShiftLimit,
  pixelAlignmentShiftLimit,
  pixelAlignmentTolerance,
} from './tolerances.js';

export interface AuthorGridTargetNode {
  source: PositionedLayoutNode;
  rect: LayoutRect;
}

export interface AuthorGridStats {
  visualGroups: number;
  flowVisualGroups: number;
  chainRows: number;
  chainRowEdges: number;
  authorRowGuides: number;
  authorColumnGuides: number;
  chainRowsMisalignedBefore: number;
  chainRowsMisalignedAfter: number;
  rowGuidesAlignedBefore: number;
  rowGuidesAlignedAfter: number;
  columnGuidesAlignedBefore: number;
  columnGuidesAlignedAfter: number;
  chainRowRealignments: number;
  rowGuideRealignments: number;
  columnGuideRealignments: number;
  authorGridMovedNodes: number;
  authorGridBlocked: number;
  maxAuthorGridShiftX: number;
  maxAuthorGridShiftY: number;
  maxRowGuideDeviationBefore: number;
  maxRowGuideDeviationAfter: number;
  maxColumnGuideDeviationBefore: number;
  maxColumnGuideDeviationAfter: number;
  attachmentPixelRows: number;
  attachmentPixelRowsMisalignedBefore: number;
  attachmentPixelRowsMisalignedAfter: number;
  orderedAttachmentColumns: number;
  orderedAttachmentColumnsMisalignedBefore: number;
  orderedAttachmentColumnsMisalignedAfter: number;
  pixelAlignmentRealignments: number;
  pixelAlignmentBlocked: number;
  maxPixelAlignmentShiftX: number;
  maxPixelAlignmentShiftY: number;
  routedFlowEdges: number;
  edgeNodeIntersectionsAfter: number;
  edgeNodeCorridorIntrusionsAfter: number;
  edgeEdgeCrossingsAfter: number;
  attachmentEdgeNodeIntersectionsAfter: number;
}

interface VisualGroup {
  id: number;
  nodeIds: string[];
  flowNodeIds: string[];
  anchorId: string;
  domain?: string;
  containsRoot: boolean;
  authorX: number;
  authorY: number;
}

interface ChainRow {
  groupId: number;
  nodeIds: string[];
  authorY: number;
  anchorId: string;
}

interface GuideMember {
  groupId: number;
  coordinate: number;
  representativeNodeIds: string[];
}

interface AuthorGuide {
  axis: 'x' | 'y';
  domain?: string;
  members: GuideMember[];
}

interface PixelAlignmentSet {
  nodeIds: string[];
  axis: 'x' | 'y';
}

class UnionFind {
  private readonly parent = new Map<string, string>();

  add(id: string): void {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: string): string {
    const parent = this.parent.get(id);
    if (!parent) {
      this.parent.set(id, id);
      return id;
    }
    if (parent === id) return id;
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }
}

function cleanNumber(value: number): number {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function isLongVisualBridge(
  edge: LayoutReaderV2Edge,
  targets: Map<string, AuthorGridTargetNode>,
  settings: LayoutEngineSettings,
): boolean {
  const parent = targets.get(edge.parentId);
  const child = targets.get(edge.childId);
  if (!parent || !child) return true;
  const dx = edge.authorDelta?.x ?? (child.source.canonicalRect.x - parent.source.canonicalRect.x);
  const dy = edge.authorDelta?.y ?? (child.source.canonicalRect.y - parent.source.canonicalRect.y);
  const typicalHeight = median([parent.source.canonicalRect.height, child.source.canonicalRect.height]);
  const verticalBreak = Math.max(420, settings.verticalGap * 4, typicalHeight * 2.4);
  const horizontalBreak = Math.max(1800, settings.horizontalGap * 30, Math.max(parent.rect.width, child.rect.width) * 5);
  // Long mostly-vertical trunks are visual module boundaries. A very long edge
  // with a meaningful Y component is also a boundary, while a long straight
  // horizontal author chain remains one module.
  if (Math.abs(dy) >= verticalBreak && Math.abs(dy) >= Math.abs(dx) * 0.5) return true;
  if (Math.abs(dx) >= horizontalBreak && Math.abs(dy) > authorGuideClusterTolerance(settings) * 2) return true;
  return false;
}

function dominantDomain(groupIds: string[], flowEdges: LayoutReaderV2Edge[]): string | undefined {
  const members = new Set(groupIds);
  const counts = new Map<string, number>();
  for (const edge of flowEdges) {
    if (!members.has(edge.parentId) && !members.has(edge.childId)) continue;
    const domain = edge.connectionType;
    if (!domain) continue;
    counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
}

function buildVisualGroups(
  targets: Map<string, AuthorGridTargetNode>,
  semanticEdges: LayoutReaderV2Edge[],
  settings: LayoutEngineSettings,
  rootNodeId?: string,
): { groups: VisualGroup[]; groupByNode: Map<string, number>; attachmentChildren: Map<number, Set<number>>; flowEdges: LayoutReaderV2Edge[] } {
  const uf = new UnionFind();
  for (const id of targets.keys()) uf.add(id);
  const flowEdges = semanticEdges.filter((edge) => edge.role === 'flow' && targets.has(edge.parentId) && targets.has(edge.childId));
  for (const edge of flowEdges) {
    if (!isLongVisualBridge(edge, targets, settings)) uf.union(edge.parentId, edge.childId);
  }

  const idsByRoot = new Map<string, string[]>();
  for (const id of targets.keys()) {
    const root = uf.find(id);
    idsByRoot.set(root, [...(idsByRoot.get(root) ?? []), id]);
  }

  const flowParticipants = new Set(flowEdges.flatMap((edge) => [edge.parentId, edge.childId]));
  const groups: VisualGroup[] = [];
  const groupByNode = new Map<string, number>();
  for (const nodeIds of idsByRoot.values()) {
    const flowNodeIds = nodeIds.filter((id) => flowParticipants.has(id));
    const candidateIds = flowNodeIds.length ? flowNodeIds : nodeIds;
    const anchorId = [...candidateIds].sort((a, b) => {
      const aa = targets.get(a)!.source.canonicalRect;
      const bb = targets.get(b)!.source.canonicalRect;
      return aa.x - bb.x || aa.y - bb.y || a.localeCompare(b);
    })[0];
    const anchor = targets.get(anchorId)!;
    const group: VisualGroup = {
      id: groups.length,
      nodeIds,
      flowNodeIds,
      anchorId,
      domain: dominantDomain(nodeIds, flowEdges),
      containsRoot: Boolean(rootNodeId && nodeIds.includes(rootNodeId)),
      authorX: anchor.source.canonicalRect.x,
      authorY: anchor.source.canonicalRect.y,
    };
    groups.push(group);
    for (const id of nodeIds) groupByNode.set(id, group.id);
  }

  const attachmentChildren = new Map<number, Set<number>>();
  for (const edge of semanticEdges) {
    if (edge.role !== 'attachment' && edge.role !== 'ordered-attachment') continue;
    const parentGroup = groupByNode.get(edge.parentId);
    const childGroup = groupByNode.get(edge.childId);
    if (parentGroup === undefined || childGroup === undefined || parentGroup === childGroup) continue;
    const set = attachmentChildren.get(parentGroup) ?? new Set<number>();
    set.add(childGroup);
    attachmentChildren.set(parentGroup, set);
  }

  return { groups, groupByNode, attachmentChildren, flowEdges };
}

function buildChainRows(
  groups: VisualGroup[],
  groupByNode: Map<string, number>,
  flowEdges: LayoutReaderV2Edge[],
  targets: Map<string, AuthorGridTargetNode>,
  settings: LayoutEngineSettings,
): ChainRow[] {
  const tolerance = authorGuideClusterTolerance(settings);
  const rows: ChainRow[] = [];
  for (const group of groups) {
    if (group.flowNodeIds.length < 2) continue;
    const members = new Set(group.flowNodeIds);
    const uf = new UnionFind();
    for (const id of group.flowNodeIds) uf.add(id);
    let rowEdgeCount = 0;
    for (const edge of flowEdges) {
      if (groupByNode.get(edge.parentId) !== group.id || groupByNode.get(edge.childId) !== group.id) continue;
      if (!members.has(edge.parentId) || !members.has(edge.childId)) continue;
      const parent = targets.get(edge.parentId)!;
      const child = targets.get(edge.childId)!;
      const dy = edge.authorDelta?.y ?? (child.source.canonicalRect.y - parent.source.canonicalRect.y);
      const dx = edge.authorDelta?.x ?? (child.source.canonicalRect.x - parent.source.canonicalRect.x);
      if (Math.abs(dy) <= tolerance && dx >= -tolerance) {
        uf.union(edge.parentId, edge.childId);
        rowEdgeCount++;
      }
    }
    if (!rowEdgeCount) continue;
    const byRoot = new Map<string, string[]>();
    for (const id of group.flowNodeIds) {
      const root = uf.find(id);
      byRoot.set(root, [...(byRoot.get(root) ?? []), id]);
    }
    for (const nodeIds of byRoot.values()) {
      if (nodeIds.length < 2) continue;
      const ordered = [...nodeIds].sort((a, b) => targets.get(a)!.source.canonicalRect.x - targets.get(b)!.source.canonicalRect.x);
      rows.push({
        groupId: group.id,
        nodeIds: ordered,
        authorY: median(ordered.map((id) => targets.get(id)!.source.canonicalRect.y)),
        anchorId: ordered[0],
      });
    }
  }
  return rows;
}

function rowRepresentative(group: VisualGroup, rows: ChainRow[]): { nodeIds: string[]; coordinate: number } {
  const ownRows = rows.filter((row) => row.groupId === group.id);
  const anchored = ownRows.find((row) => row.nodeIds.includes(group.anchorId));
  const row = anchored ?? ownRows.sort((a, b) => b.nodeIds.length - a.nodeIds.length)[0];
  if (row) return { nodeIds: row.nodeIds, coordinate: row.authorY };
  return { nodeIds: [group.anchorId], coordinate: group.authorY };
}

function clusterGuideMembers(axis: 'x' | 'y', members: GuideMember[], tolerance: number, domain?: string): AuthorGuide[] {
  const ordered = [...members].sort((a, b) => a.coordinate - b.coordinate || a.groupId - b.groupId);
  const clusters: GuideMember[][] = [];
  for (const member of ordered) {
    const last = clusters.at(-1);
    if (!last || Math.abs(member.coordinate - median(last.map((entry) => entry.coordinate))) > tolerance) clusters.push([member]);
    else last.push(member);
  }
  return clusters
    .filter((cluster) => new Set(cluster.map((member) => member.groupId)).size >= 2)
    .map((cluster) => ({ axis, domain, members: cluster }));
}

function buildAuthorGuides(groups: VisualGroup[], rows: ChainRow[], settings: LayoutEngineSettings): { rowGuides: AuthorGuide[]; columnGuides: AuthorGuide[] } {
  const tolerance = authorGuideClusterTolerance(settings);
  const byDomain = new Map<string, VisualGroup[]>();
  for (const group of groups.filter((entry) => entry.flowNodeIds.length > 0 && entry.domain)) {
    byDomain.set(group.domain!, [...(byDomain.get(group.domain!) ?? []), group]);
  }
  const rowGuides: AuthorGuide[] = [];
  const columnGuides: AuthorGuide[] = [];
  for (const [domain, domainGroups] of byDomain) {
    const rowMembers = domainGroups.map((group) => {
      const rep = rowRepresentative(group, rows);
      return { groupId: group.id, coordinate: rep.coordinate, representativeNodeIds: rep.nodeIds };
    });
    rowGuides.push(...clusterGuideMembers('y', rowMembers, tolerance, domain));
    const columnMembers = domainGroups.map((group) => ({ groupId: group.id, coordinate: group.authorX, representativeNodeIds: [group.anchorId] }));
    columnGuides.push(...clusterGuideMembers('x', columnMembers, tolerance, domain));
  }
  return { rowGuides, columnGuides };
}


function buildAttachmentPixelRows(
  semanticEdges: LayoutReaderV2Edge[],
  targets: Map<string, AuthorGridTargetNode>,
  settings: LayoutEngineSettings,
): PixelAlignmentSet[] {
  const tolerance = pixelAlignmentTolerance(settings);
  const uf = new UnionFind();
  const participants = new Set<string>();
  for (const edge of semanticEdges) {
    if (edge.role !== 'attachment' && edge.role !== 'ordered-attachment') continue;
    const parent = targets.get(edge.parentId);
    const child = targets.get(edge.childId);
    if (!parent || !child) continue;
    const dx = edge.authorDelta?.x ?? child.source.canonicalRect.x - parent.source.canonicalRect.x;
    const dy = edge.authorDelta?.y ?? child.source.canonicalRect.y - parent.source.canonicalRect.y;
    // Cross-domain chains such as Delimiter -> Constant -> Material are often
    // authored as one visible row. Only accept clearly horizontal relations;
    // ordered vertical collections (Points/Keys) therefore stay out of this pass.
    if (Math.abs(dy) > tolerance) continue;
    if (dx < -tolerance || Math.abs(dx) < Math.max(40, Math.abs(dy) * 2)) continue;
    uf.add(edge.parentId);
    uf.add(edge.childId);
    uf.union(edge.parentId, edge.childId);
    participants.add(edge.parentId);
    participants.add(edge.childId);
  }
  const byRoot = new Map<string, string[]>();
  for (const id of participants) {
    const root = uf.find(id);
    byRoot.set(root, [...(byRoot.get(root) ?? []), id]);
  }
  return [...byRoot.values()]
    .filter((ids) => ids.length >= 2)
    .map((ids) => ({
      axis: 'y' as const,
      nodeIds: [...ids].sort((a, b) => targets.get(a)!.source.canonicalRect.x - targets.get(b)!.source.canonicalRect.x || a.localeCompare(b)),
    }));
}

function buildOrderedAttachmentPixelColumns(
  semanticEdges: LayoutReaderV2Edge[],
  targets: Map<string, AuthorGridTargetNode>,
  settings: LayoutEngineSettings,
): PixelAlignmentSet[] {
  const tolerance = pixelAlignmentTolerance(settings);
  const outgoing = new Set(semanticEdges.map((edge) => edge.parentId));
  const families = new Map<string, LayoutReaderV2Edge[]>();
  for (const edge of semanticEdges) {
    if (edge.role !== 'ordered-attachment' || !targets.has(edge.parentId) || !targets.has(edge.childId)) continue;
    const key = `${edge.parentId}|${edge.field ?? edge.parentPortId ?? edge.connectionType ?? 'ordered'}`;
    families.set(key, [...(families.get(key) ?? []), edge]);
  }
  const columns: PixelAlignmentSet[] = [];
  for (const edges of families.values()) {
    if (edges.length < 2) continue;
    const childIds = [...new Set(edges.map((edge) => edge.childId))];
    if (childIds.length < 2) continue;
    // Pixel-column polish is intentionally conservative for now: leaf/value
    // collection members are safe to snap independently. Complex ordered items
    // with owned subgraphs remain under the normal Author Grid/contour solver.
    const leafLike = childIds.every((id) => {
      const kind = targets.get(id)?.source.node.nodeKind ?? '';
      return !outgoing.has(id) || kind.startsWith('CurvePoint.') || kind.startsWith('Key.');
    });
    if (!leafLike) continue;
    const authorXs = childIds.map((id) => targets.get(id)!.source.canonicalRect.x);
    const authorYs = childIds.map((id) => targets.get(id)!.source.canonicalRect.y);
    const xSpread = Math.max(...authorXs) - Math.min(...authorXs);
    const ySpread = Math.max(...authorYs) - Math.min(...authorYs);
    if (xSpread > tolerance) continue;
    if (ySpread < Math.max(60, xSpread * 2)) continue;
    columns.push({
      axis: 'x',
      nodeIds: childIds.sort((a, b) => targets.get(a)!.source.canonicalRect.y - targets.get(b)!.source.canonicalRect.y || a.localeCompare(b)),
    });
  }
  return columns;
}

function alignmentSpread(targets: Map<string, AuthorGridTargetNode>, set: PixelAlignmentSet): number {
  const values = set.nodeIds
    .map((id) => set.axis === 'x' ? targets.get(id)?.rect.x : targets.get(id)?.rect.y)
    .filter((value): value is number => value !== undefined);
  if (values.length < 2) return 0;
  return Math.max(...values) - Math.min(...values);
}

function collectAttachmentClosure(groupId: number, groups: VisualGroup[], attachmentChildren: Map<number, Set<number>>): string[] {
  const ids = new Set<string>();
  const seen = new Set<number>();
  const visit = (id: number): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const group = groups[id];
    if (!group) return;
    for (const nodeId of group.nodeIds) ids.add(nodeId);
    for (const child of attachmentChildren.get(id) ?? []) visit(child);
  };
  visit(groupId);
  return [...ids];
}

function translateIds(targets: Map<string, AuthorGridTargetNode>, ids: string[], dx: number, dy: number): number {
  let shifted = 0;
  for (const id of ids) {
    const target = targets.get(id);
    if (!target) continue;
    if (dx) target.rect.x = cleanNumber(target.rect.x + dx);
    if (dy) target.rect.y = cleanNumber(target.rect.y + dy);
    if (dx || dy) shifted++;
  }
  return shifted;
}

function rectsOverlap(a: LayoutRect, b: LayoutRect): boolean {
  return a.x < rectRight(b) && rectRight(a) > b.x && a.y < rectBottom(b) && rectBottom(a) > b.y;
}

function anyNodeOverlap(targets: Map<string, AuthorGridTargetNode>): boolean {
  const entries = [...targets.values()].sort((a, b) => a.rect.x - b.rect.x || rectRight(a.rect) - rectRight(b.rect));
  for (let i = 0; i < entries.length; i++) {
    const a = entries[i].rect;
    const right = rectRight(a);
    for (let j = i + 1; j < entries.length; j++) {
      const b = entries[j].rect;
      // Entries are sorted by left edge. Once the next left edge is at or
      // beyond A's right edge, no later rectangle can overlap A.
      if (b.x >= right) break;
      if (rectsOverlap(a, b)) return true;
    }
  }
  return false;
}

interface SafetyEdgeNodeConflict {
  edgeKey: string;
  nodeId: string;
  role: LayoutReaderV2Edge['role'];
}

interface SafetyCrossingConflict {
  edgeAKey: string;
  edgeBKey: string;
}

interface SafetyState {
  flowEdgeNodeIntersections: number;
  typedEdgeNodeIntersections: number;
  edgeEdgeCrossings: number;
  flowConflictKeys: Set<string>;
  typedConflictKeys: Set<string>;
  crossingKeys: Set<string>;
  typedConflicts: Map<string, SafetyEdgeNodeConflict>;
  crossingConflicts: Map<string, SafetyCrossingConflict>;
  incrementalEligible: boolean;
}

function edgeKey(edge: LayoutReaderV2Edge): string {
  return `${edge.parentId}>${edge.childId}`;
}

function crossingKey(edgeAKey: string, edgeBKey: string): string {
  return [edgeAKey, edgeBKey].sort().join('|');
}

function stateFromConflicts(
  typedConflicts: Map<string, SafetyEdgeNodeConflict>,
  crossingConflicts: Map<string, SafetyCrossingConflict>,
  incrementalEligible: boolean,
): SafetyState {
  const typedConflictKeys = new Set(typedConflicts.keys());
  const flowConflictKeys = new Set(
    [...typedConflicts].filter(([, conflict]) => conflict.role === 'flow').map(([key]) => key),
  );
  const crossingKeys = new Set(crossingConflicts.keys());
  return {
    flowEdgeNodeIntersections: flowConflictKeys.size,
    typedEdgeNodeIntersections: typedConflictKeys.size,
    edgeEdgeCrossings: crossingKeys.size,
    flowConflictKeys,
    typedConflictKeys,
    crossingKeys,
    typedConflicts,
    crossingConflicts,
    incrementalEligible,
  };
}

function safetyState(targets: Map<string, AuthorGridTargetNode>, semanticEdges: LayoutReaderV2Edge[]): SafetyState {
  const typed = auditEdgeCorridors(targets, semanticEdges, 0);
  const eligibleEdges = semanticEdges.filter((edge) => edge.role !== 'structural');
  const keys = eligibleEdges.map(edgeKey);
  const incrementalEligible = new Set(keys).size === keys.length;
  const typedConflicts = new Map<string, SafetyEdgeNodeConflict>();
  for (const conflict of typed.edgeNodeConflicts) {
    typedConflicts.set(`${conflict.edgeKey}|${conflict.nodeId}`, {
      edgeKey: conflict.edgeKey,
      nodeId: conflict.nodeId,
      role: conflict.role,
    });
  }
  const crossingConflicts = new Map<string, SafetyCrossingConflict>();
  for (const conflict of typed.edgeEdgeConflicts) {
    const key = crossingKey(conflict.edgeAKey, conflict.edgeBKey);
    crossingConflicts.set(key, { edgeAKey: conflict.edgeAKey, edgeBKey: conflict.edgeBKey });
  }
  // Duplicate route keys are rare but can make edge-edge counts a multiset.
  // Fall back to full audits in that case so the optimization never changes safety semantics.
  if (!incrementalEligible || crossingConflicts.size !== typed.edgeEdgeCrossings) {
    const flowConflicts = typed.edgeNodeConflicts.filter((conflict) => conflict.role === 'flow');
    return {
      flowEdgeNodeIntersections: flowConflicts.length,
      typedEdgeNodeIntersections: typed.edgeNodeIntersections,
      edgeEdgeCrossings: typed.edgeEdgeCrossings,
      flowConflictKeys: new Set(flowConflicts.map((conflict) => `${conflict.edgeKey}|${conflict.nodeId}`)),
      typedConflictKeys: new Set(typed.edgeNodeConflicts.map((conflict) => `${conflict.edgeKey}|${conflict.nodeId}`)),
      crossingKeys: new Set(typed.edgeEdgeConflicts.map((conflict) => crossingKey(conflict.edgeAKey, conflict.edgeBKey))),
      typedConflicts,
      crossingConflicts,
      incrementalEligible: false,
    };
  }
  return stateFromConflicts(typedConflicts, crossingConflicts, true);
}

function incrementalSafetyState(
  targets: Map<string, AuthorGridTargetNode>,
  semanticEdges: LayoutReaderV2Edge[],
  movedIds: string[],
  baseline: SafetyState,
): SafetyState {
  if (!baseline.incrementalEligible) return safetyState(targets, semanticEdges);
  const moved = new Set(movedIds);
  const eligibleEdges = semanticEdges.filter((edge) => edge.role !== 'structural');
  const affectedEdgeKeys = new Set(
    eligibleEdges.filter((edge) => moved.has(edge.parentId) || moved.has(edge.childId)).map(edgeKey),
  );
  if (!affectedEdgeKeys.size && !moved.size) return baseline;

  const typedConflicts = new Map(baseline.typedConflicts);
  for (const [key, conflict] of typedConflicts) {
    if (affectedEdgeKeys.has(conflict.edgeKey) || moved.has(conflict.nodeId)) typedConflicts.delete(key);
  }
  const crossingConflicts = new Map(baseline.crossingConflicts);
  for (const [key, conflict] of crossingConflicts) {
    if (affectedEdgeKeys.has(conflict.edgeAKey) || affectedEdgeKeys.has(conflict.edgeBKey)) crossingConflicts.delete(key);
  }

  const routes = buildAuditRoutes(targets, semanticEdges);
  const affectedRoutes = routes.filter((route) => affectedEdgeKeys.has(route.key));
  const unaffectedRoutes = routes.filter((route) => !affectedEdgeKeys.has(route.key));
  const movedTargets = movedIds
    .map((nodeId) => ({ nodeId, target: targets.get(nodeId) }))
    .filter((entry): entry is { nodeId: string; target: AuthorGridTargetNode } => Boolean(entry.target));

  const addEdgeNodeConflict = (route: (typeof routes)[number], nodeId: string): void => {
    if (nodeId === route.edge.parentId || nodeId === route.edge.childId) return;
    const target = targets.get(nodeId);
    if (!target || !routeIntersectsRect(route, target.rect, 0)) return;
    typedConflicts.set(`${route.key}|${nodeId}`, { edgeKey: route.key, nodeId, role: route.edge.role });
  };

  for (const route of affectedRoutes) {
    for (const nodeId of targets.keys()) addEdgeNodeConflict(route, nodeId);
  }
  for (const route of unaffectedRoutes) {
    for (const { nodeId } of movedTargets) addEdgeNodeConflict(route, nodeId);
  }

  const seenPairs = new Set<string>();
  for (const a of affectedRoutes) {
    for (const b of routes) {
      if (a === b) continue;
      const key = crossingKey(a.key, b.key);
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      if (a.edge.parentId === b.edge.parentId
        || a.edge.parentId === b.edge.childId
        || a.edge.childId === b.edge.parentId
        || a.edge.childId === b.edge.childId) continue;
      if (!routesCross(a, b)) continue;
      crossingConflicts.set(key, { edgeAKey: a.key, edgeBKey: b.key });
    }
  }

  return stateFromConflicts(typedConflicts, crossingConflicts, true);
}

function safeMove(
  targets: Map<string, AuthorGridTargetNode>,
  semanticEdges: LayoutReaderV2Edge[],
  ids: string[],
  dx: number,
  dy: number,
  baseline: SafetyState,
): { accepted: boolean; state: SafetyState; shifted: number } {
  if (!ids.length || (!dx && !dy)) return { accepted: true, state: baseline, shifted: 0 };
  const shifted = translateIds(targets, ids, dx, dy);
  const overlaps = anyNodeOverlap(targets);
  const next = overlaps ? undefined : incrementalSafetyState(targets, semanticEdges, ids, baseline);
  const noNew = (nextKeys: Set<string>, previousKeys: Set<string>): boolean => [...nextKeys].every((key) => previousKeys.has(key));
  const accepted = !overlaps && Boolean(next)
    && next!.flowEdgeNodeIntersections <= baseline.flowEdgeNodeIntersections
    && next!.typedEdgeNodeIntersections <= baseline.typedEdgeNodeIntersections
    && next!.edgeEdgeCrossings <= baseline.edgeEdgeCrossings
    && noNew(next!.flowConflictKeys, baseline.flowConflictKeys)
    && noNew(next!.typedConflictKeys, baseline.typedConflictKeys)
    && noNew(next!.crossingKeys, baseline.crossingKeys);
  if (!accepted) {
    translateIds(targets, ids, -dx, -dy);
    return { accepted: false, state: baseline, shifted: 0 };
  }
  return { accepted: true, state: next!, shifted };
}

interface PerNodeMove { id: string; dx: number; dy: number }

function safePerNodeMoves(
  targets: Map<string, AuthorGridTargetNode>,
  semanticEdges: LayoutReaderV2Edge[],
  moves: PerNodeMove[],
  baseline: SafetyState,
): { accepted: boolean; state: SafetyState } {
  const effective = moves.filter((move) => Math.abs(move.dx) >= 0.5 || Math.abs(move.dy) >= 0.5);
  if (!effective.length) return { accepted: true, state: baseline };
  for (const move of effective) translateIds(targets, [move.id], move.dx, move.dy);
  const overlaps = anyNodeOverlap(targets);
  const next = overlaps ? undefined : incrementalSafetyState(targets, semanticEdges, effective.map((move) => move.id), baseline);
  const noNew = (nextKeys: Set<string>, previousKeys: Set<string>): boolean => [...nextKeys].every((key) => previousKeys.has(key));
  const accepted = !overlaps && Boolean(next)
    && next!.flowEdgeNodeIntersections <= baseline.flowEdgeNodeIntersections
    && next!.typedEdgeNodeIntersections <= baseline.typedEdgeNodeIntersections
    && next!.edgeEdgeCrossings <= baseline.edgeEdgeCrossings
    && noNew(next!.flowConflictKeys, baseline.flowConflictKeys)
    && noNew(next!.typedConflictKeys, baseline.typedConflictKeys)
    && noNew(next!.crossingKeys, baseline.crossingKeys);
  if (!accepted) {
    for (const move of [...effective].reverse()) translateIds(targets, [move.id], -move.dx, -move.dy);
    return { accepted: false, state: baseline };
  }
  return { accepted: true, state: next! };
}

function rowCurrentY(targets: Map<string, AuthorGridTargetNode>, nodeIds: string[]): number {
  return median(nodeIds.map((id) => targets.get(id)?.rect.y).filter((value): value is number => value !== undefined));
}

function rowSpread(targets: Map<string, AuthorGridTargetNode>, nodeIds: string[]): number {
  const values = nodeIds.map((id) => targets.get(id)?.rect.y).filter((value): value is number => value !== undefined);
  if (values.length < 2) return 0;
  return Math.max(...values) - Math.min(...values);
}


function guideDeviation(targets: Map<string, AuthorGridTargetNode>, guide: AuthorGuide): number {
  const values = guide.members.map((member) => guide.axis === 'x'
    ? targets.get(member.representativeNodeIds[0])?.rect.x
    : rowCurrentY(targets, member.representativeNodeIds))
    .filter((value): value is number => value !== undefined);
  if (values.length < 2) return 0;
  return Math.max(...values) - Math.min(...values);
}

function referenceMember(
  targets: Map<string, AuthorGridTargetNode>,
  groups: VisualGroup[],
  guide: AuthorGuide,
): GuideMember {
  const rootMember = guide.members.find((member) => groups[member.groupId]?.containsRoot);
  if (rootMember) return rootMember;
  return [...guide.members].sort((a, b) => {
    const groupA = groups[a.groupId];
    const groupB = groups[b.groupId];
    const currentA = guide.axis === 'x'
      ? targets.get(a.representativeNodeIds[0])?.rect.x ?? a.coordinate
      : rowCurrentY(targets, a.representativeNodeIds);
    const currentB = guide.axis === 'x'
      ? targets.get(b.representativeNodeIds[0])?.rect.x ?? b.coordinate
      : rowCurrentY(targets, b.representativeNodeIds);
    return Math.abs(currentA - a.coordinate) - Math.abs(currentB - b.coordinate)
      || groupB.nodeIds.length - groupA.nodeIds.length;
  })[0];
}

/**
 * Author Grid is deliberately a final, safety-gated visual pass. Reader v2 owns
 * semantics; this layer recovers a second signal from the author sketch:
 * modules, exact local chain rows, and repeated row/column guides between
 * otherwise disconnected modules. It never accepts a cosmetic alignment that
 * introduces a node overlap, a new exact wire/node hit, or a new unrelated
 * connection crossing.
 */
export function normalizeAuthorGrid(
  targets: Map<string, AuthorGridTargetNode>,
  semanticEdges: LayoutReaderV2Edge[],
  settings: LayoutEngineSettings,
  rootNodeId?: string,
): AuthorGridStats {
  const stats: AuthorGridStats = {
    visualGroups: 0,
    flowVisualGroups: 0,
    chainRows: 0,
    chainRowEdges: 0,
    authorRowGuides: 0,
    authorColumnGuides: 0,
    chainRowsMisalignedBefore: 0,
    chainRowsMisalignedAfter: 0,
    rowGuidesAlignedBefore: 0,
    rowGuidesAlignedAfter: 0,
    columnGuidesAlignedBefore: 0,
    columnGuidesAlignedAfter: 0,
    chainRowRealignments: 0,
    rowGuideRealignments: 0,
    columnGuideRealignments: 0,
    authorGridMovedNodes: 0,
    authorGridBlocked: 0,
    maxAuthorGridShiftX: 0,
    maxAuthorGridShiftY: 0,
    maxRowGuideDeviationBefore: 0,
    maxRowGuideDeviationAfter: 0,
    maxColumnGuideDeviationBefore: 0,
    maxColumnGuideDeviationAfter: 0,
    attachmentPixelRows: 0,
    attachmentPixelRowsMisalignedBefore: 0,
    attachmentPixelRowsMisalignedAfter: 0,
    orderedAttachmentColumns: 0,
    orderedAttachmentColumnsMisalignedBefore: 0,
    orderedAttachmentColumnsMisalignedAfter: 0,
    pixelAlignmentRealignments: 0,
    pixelAlignmentBlocked: 0,
    maxPixelAlignmentShiftX: 0,
    maxPixelAlignmentShiftY: 0,
    routedFlowEdges: 0,
    edgeNodeIntersectionsAfter: 0,
    edgeNodeCorridorIntrusionsAfter: 0,
    edgeEdgeCrossingsAfter: 0,
    attachmentEdgeNodeIntersectionsAfter: 0,
  };
  if (!targets.size) return stats;

  const { groups, groupByNode, attachmentChildren, flowEdges } = buildVisualGroups(targets, semanticEdges, settings, rootNodeId);
  const rows = buildChainRows(groups, groupByNode, flowEdges, targets, settings);
  const { rowGuides, columnGuides } = buildAuthorGuides(groups, rows, settings);
  const attachmentPixelRows = buildAttachmentPixelRows(semanticEdges, targets, settings);
  const orderedAttachmentColumns = buildOrderedAttachmentPixelColumns(semanticEdges, targets, settings);
  stats.visualGroups = groups.length;
  stats.flowVisualGroups = groups.filter((group) => group.flowNodeIds.length > 0).length;
  stats.chainRows = rows.length;
  const rowTolerance = authorGuideClusterTolerance(settings);
  stats.chainRowEdges = flowEdges.filter((edge) => {
    if (groupByNode.get(edge.parentId) !== groupByNode.get(edge.childId)) return false;
    const parent = targets.get(edge.parentId);
    const child = targets.get(edge.childId);
    if (!parent || !child) return false;
    const dy = edge.authorDelta?.y ?? child.source.canonicalRect.y - parent.source.canonicalRect.y;
    return Math.abs(dy) <= rowTolerance;
  }).length;
  stats.authorRowGuides = rowGuides.length;
  stats.authorColumnGuides = columnGuides.length;
  stats.maxRowGuideDeviationBefore = rowGuides.length ? Math.max(...rowGuides.map((guide) => guideDeviation(targets, guide))) : 0;
  stats.maxColumnGuideDeviationBefore = columnGuides.length ? Math.max(...columnGuides.map((guide) => guideDeviation(targets, guide))) : 0;
  stats.chainRowsMisalignedBefore = rows.filter((row) => rowSpread(targets, row.nodeIds) >= 0.5).length;
  stats.rowGuidesAlignedBefore = rowGuides.filter((guide) => guideDeviation(targets, guide) < 0.5).length;
  stats.columnGuidesAlignedBefore = columnGuides.filter((guide) => guideDeviation(targets, guide) < 0.5).length;
  stats.attachmentPixelRows = attachmentPixelRows.length;
  stats.attachmentPixelRowsMisalignedBefore = attachmentPixelRows.filter((set) => alignmentSpread(targets, set) >= 0.5).length;
  stats.orderedAttachmentColumns = orderedAttachmentColumns.length;
  stats.orderedAttachmentColumnsMisalignedBefore = orderedAttachmentColumns.filter((set) => alignmentSpread(targets, set) >= 0.5).length;

  let baseline = safetyState(targets, semanticEdges);
  const movedNodes = new Set<string>();

  // 1) Yellow in the user's sketch: connected horizontal chain nodes should be
  // one exact visible row. Move the node itself (not its downstream Flow tree),
  // because the row is a visual property of the local module.
  for (const row of rows) {
    const reference = row.nodeIds.includes(rootNodeId ?? '') ? rootNodeId! : row.anchorId;
    const targetY = targets.get(reference)?.rect.y;
    if (targetY === undefined) continue;
    const moves: PerNodeMove[] = [];
    let exceedsLimit = false;
    for (const nodeId of row.nodeIds) {
      if (nodeId === reference || nodeId === rootNodeId) continue;
      const node = targets.get(nodeId);
      if (!node) continue;
      const deltaY = cleanNumber(targetY - node.rect.y);
      if (Math.abs(deltaY) < 0.5) continue;
      if (Math.abs(deltaY) > authorRowShiftLimit(settings)) {
        exceedsLimit = true;
        break;
      }
      moves.push({ id: nodeId, dx: 0, dy: deltaY });
    }
    if (exceedsLimit) {
      stats.authorGridBlocked++;
      continue;
    }
    if (!moves.length) continue;
    const move = safePerNodeMoves(targets, semanticEdges, moves, baseline);
    if (!move.accepted) {
      stats.authorGridBlocked++;
      continue;
    }
    baseline = move.state;
    stats.chainRowRealignments += moves.length;
    for (const entry of moves) {
      movedNodes.add(entry.id);
      stats.maxAuthorGridShiftY = Math.max(stats.maxAuthorGridShiftY, Math.abs(entry.dy));
    }
  }

  // 2) Pixel polish for typed non-Flow geometry. Reader v2 already knows
  // these are attachments, so exact visual rows/columns can be restored without
  // teaching the Flow solver about Points, Keys or material/value chains.
  for (const set of [...attachmentPixelRows, ...orderedAttachmentColumns]) {
    const values = set.nodeIds
      .map((id) => set.axis === 'x' ? targets.get(id)?.rect.x : targets.get(id)?.rect.y)
      .filter((value): value is number => value !== undefined);
    if (values.length < 2) continue;
    const rootTarget = rootNodeId && set.nodeIds.includes(rootNodeId) ? targets.get(rootNodeId) : undefined;
    const targetCoordinate = cleanNumber(rootTarget
      ? (set.axis === 'x' ? rootTarget.rect.x : rootTarget.rect.y)
      : median(values));
    const moves: PerNodeMove[] = [];
    let exceedsLimit = false;
    for (const id of set.nodeIds) {
      if (id === rootNodeId) continue;
      const target = targets.get(id);
      if (!target) continue;
      const current = set.axis === 'x' ? target.rect.x : target.rect.y;
      const delta = cleanNumber(targetCoordinate - current);
      if (Math.abs(delta) < 0.5) continue;
      if (Math.abs(delta) > pixelAlignmentShiftLimit(settings)) {
        exceedsLimit = true;
        break;
      }
      moves.push({ id, dx: set.axis === 'x' ? delta : 0, dy: set.axis === 'y' ? delta : 0 });
    }
    if (exceedsLimit) {
      stats.pixelAlignmentBlocked++;
      continue;
    }
    if (!moves.length) continue;
    const move = safePerNodeMoves(targets, semanticEdges, moves, baseline);
    if (!move.accepted) {
      stats.pixelAlignmentBlocked++;
      continue;
    }
    baseline = move.state;
    stats.pixelAlignmentRealignments += moves.length;
    for (const entry of moves) {
      movedNodes.add(entry.id);
      stats.maxPixelAlignmentShiftX = Math.max(stats.maxPixelAlignmentShiftX, Math.abs(entry.dx));
      stats.maxPixelAlignmentShiftY = Math.max(stats.maxPixelAlignmentShiftY, Math.abs(entry.dy));
    }
  }

  // 3) Red in the sketch: repeated author X anchors are visual columns. Move a
  // whole visual module (plus typed attachment satellites) so internal geometry
  // stays intact. Large route-derived separations are not undone: this pass is
  // intentionally bounded and safety-gated.
  for (const guide of columnGuides) {
    const reference = referenceMember(targets, groups, guide);
    const referenceX = targets.get(reference.representativeNodeIds[0])?.rect.x;
    if (referenceX === undefined) continue;
    for (const member of guide.members) {
      if (member.groupId === reference.groupId) continue;
      const group = groups[member.groupId];
      if (!group || group.containsRoot) continue;
      const currentX = targets.get(member.representativeNodeIds[0])?.rect.x;
      if (currentX === undefined) continue;
      const deltaX = cleanNumber(referenceX - currentX);
      if (Math.abs(deltaX) < 0.5) continue;
      if (Math.abs(deltaX) > authorGuideShiftLimit(settings)) {
        stats.authorGridBlocked++;
        continue;
      }
      const ids = collectAttachmentClosure(member.groupId, groups, attachmentChildren);
      const move = safeMove(targets, semanticEdges, ids, deltaX, 0, baseline);
      if (!move.accepted) {
        stats.authorGridBlocked++;
        continue;
      }
      baseline = move.state;
      stats.columnGuideRealignments++;
      for (const id of ids) movedNodes.add(id);
      stats.maxAuthorGridShiftX = Math.max(stats.maxAuthorGridShiftX, Math.abs(deltaX));
    }
  }

  // 4) Pink in the sketch: disconnected visual modules can share an authored
  // horizontal guide. Use the representative chain row as the module anchor and
  // translate the module rigidly in Y when it is safe.
  for (const guide of rowGuides) {
    const reference = referenceMember(targets, groups, guide);
    const referenceY = rowCurrentY(targets, reference.representativeNodeIds);
    for (const member of guide.members) {
      if (member.groupId === reference.groupId) continue;
      const group = groups[member.groupId];
      if (!group || group.containsRoot) continue;
      const currentY = rowCurrentY(targets, member.representativeNodeIds);
      const deltaY = cleanNumber(referenceY - currentY);
      if (Math.abs(deltaY) < 0.5) continue;
      if (Math.abs(deltaY) > authorGuideShiftLimit(settings)) {
        stats.authorGridBlocked++;
        continue;
      }
      const ids = collectAttachmentClosure(member.groupId, groups, attachmentChildren);
      const move = safeMove(targets, semanticEdges, ids, 0, deltaY, baseline);
      if (!move.accepted) {
        stats.authorGridBlocked++;
        continue;
      }
      baseline = move.state;
      stats.rowGuideRealignments++;
      for (const id of ids) movedNodes.add(id);
      stats.maxAuthorGridShiftY = Math.max(stats.maxAuthorGridShiftY, Math.abs(deltaY));
    }
  }

  stats.authorGridMovedNodes = movedNodes.size;
  stats.maxRowGuideDeviationAfter = rowGuides.length ? Math.max(...rowGuides.map((guide) => guideDeviation(targets, guide))) : 0;
  stats.maxColumnGuideDeviationAfter = columnGuides.length ? Math.max(...columnGuides.map((guide) => guideDeviation(targets, guide))) : 0;
  stats.chainRowsMisalignedAfter = rows.filter((row) => rowSpread(targets, row.nodeIds) >= 0.5).length;
  stats.rowGuidesAlignedAfter = rowGuides.filter((guide) => guideDeviation(targets, guide) < 0.5).length;
  stats.columnGuidesAlignedAfter = columnGuides.filter((guide) => guideDeviation(targets, guide) < 0.5).length;
  stats.attachmentPixelRowsMisalignedAfter = attachmentPixelRows.filter((set) => alignmentSpread(targets, set) >= 0.5).length;
  stats.orderedAttachmentColumnsMisalignedAfter = orderedAttachmentColumns.filter((set) => alignmentSpread(targets, set) >= 0.5).length;
  const finalTyped = auditEdgeCorridors(targets, semanticEdges, 0);
  const finalFlow = auditEdgeCorridors(targets, flowEdges, 0);
  const paddedFlow = auditEdgeCorridors(targets, flowEdges, Math.max(6, Math.min(18, Math.max(0, settings.horizontalGap) * 0.45 + 4)));
  stats.routedFlowEdges = finalFlow.routedEdges;
  stats.edgeNodeIntersectionsAfter = finalFlow.edgeNodeIntersections;
  stats.edgeNodeCorridorIntrusionsAfter = paddedFlow.edgeNodeCorridorIntrusions;
  stats.edgeEdgeCrossingsAfter = finalTyped.edgeEdgeCrossings;
  stats.attachmentEdgeNodeIntersectionsAfter = finalTyped.edgeNodeConflicts
    .filter((conflict) => conflict.role === 'attachment' || conflict.role === 'ordered-attachment').length;
  return stats;
}
