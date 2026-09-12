import { rectBottom, rectRight } from './geometry.js';
import type { PositionedLayoutNode } from './snapshot.js';
import type { LayoutReaderV2Edge } from './readerV2.js';
import type { LayoutRect } from './types.js';

export interface EdgeRoutingTarget {
  source: PositionedLayoutNode;
  rect: LayoutRect;
}

export interface EdgePoint {
  x: number;
  y: number;
}

export interface EdgeSegment {
  a: EdgePoint;
  b: EdgePoint;
}

export interface RoutedLayoutEdge {
  key: string;
  edge: LayoutReaderV2Edge;
  source: EdgePoint;
  target: EdgePoint;
  segments: EdgeSegment[];
  bounds: LayoutRect;
}

export interface EdgeNodeConflict {
  edgeKey: string;
  parentId: string;
  childId: string;
  nodeId: string;
  role: LayoutReaderV2Edge['role'];
  field?: string;
}

export interface EdgeEdgeConflict {
  edgeAKey: string;
  edgeBKey: string;
  edgeAParentId: string;
  edgeAChildId: string;
  edgeBParentId: string;
  edgeBChildId: string;
}

export interface EdgeCorridorAudit {
  routedEdges: number;
  edgeNodeIntersections: number;
  edgeNodeCorridorIntrusions: number;
  edgeEdgeCrossings: number;
  edgeNodeConflicts: EdgeNodeConflict[];
  edgeNodeCorridorConflicts: EdgeNodeConflict[];
  edgeEdgeConflicts: EdgeEdgeConflict[];
}

function cleanNumber(value: number): number {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function pointAtPort(target: EdgeRoutingTarget, side: 'left' | 'right', edge: LayoutReaderV2Edge): EdgePoint {
  const ports = side === 'right' ? target.source.geometry.rightPorts : target.source.geometry.leftPorts;
  let port = side === 'right' && edge.parentPortId
    ? ports.find((candidate) => candidate.id === edge.parentPortId)
    : undefined;
  if (!port && edge.connectionType) port = ports.find((candidate) => candidate.type === edge.connectionType);
  if (!port) port = ports[0];
  return {
    x: side === 'right' ? rectRight(target.rect) : target.rect.x,
    y: target.rect.y + (port?.centerY ?? target.rect.height / 2),
  };
}

function cubicPoint(p0: EdgePoint, p1: EdgePoint, p2: EdgePoint, p3: EdgePoint, t: number): EdgePoint {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function routeBounds(points: EdgePoint[]): LayoutRect {
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Hytale's connection renderer is not part of the JSON metadata, but its node
 * pins expose horizontal left/right connection sides. The visual result uses a
 * smooth horizontal-tangent curve, so a monotone cubic Bezier is a much closer
 * safety model than the previous imagined right-angle dogleg. Flattening the
 * curve lets the layout validator perform conservative segment/rectangle tests.
 */
export function buildRoutedLayoutEdge(
  targets: Map<string, EdgeRoutingTarget>,
  edge: LayoutReaderV2Edge,
): RoutedLayoutEdge | undefined {
  const parent = targets.get(edge.parentId);
  const child = targets.get(edge.childId);
  if (!parent || !child) return undefined;
  const source = pointAtPort(parent, 'right', edge);
  const target = pointAtPort(child, 'left', edge);
  const midX = (source.x + target.x) / 2;
  const controlA = { x: midX, y: source.y };
  const controlB = { x: midX, y: target.y };
  const travel = Math.abs(target.x - source.x) + Math.abs(target.y - source.y);
  const steps = Math.max(16, Math.min(64, Math.ceil(travel / 260)));
  const points: EdgePoint[] = [];
  for (let i = 0; i <= steps; i++) points.push(cubicPoint(source, controlA, controlB, target, i / steps));
  const segments = points.slice(1).map((point, index) => ({ a: points[index], b: point }));
  return {
    key: `${edge.parentId}>${edge.childId}`,
    edge,
    source,
    target,
    segments,
    bounds: routeBounds(points),
  };
}

export function buildRoutedLayoutEdges(
  targets: Map<string, EdgeRoutingTarget>,
  edges: LayoutReaderV2Edge[],
): RoutedLayoutEdge[] {
  return edges
    .filter((edge) => edge.role !== 'structural')
    .map((edge) => buildRoutedLayoutEdge(targets, edge))
    .filter((route): route is RoutedLayoutEdge => Boolean(route));
}

interface CachedAuditRoute {
  parentX: number;
  parentY: number;
  parentWidth: number;
  parentHeight: number;
  childX: number;
  childY: number;
  childWidth: number;
  childHeight: number;
  route?: RoutedLayoutEdge;
}

// Layout passes repeatedly audit the same target map after moving only a small
// subset of nodes. Route geometry depends solely on the two endpoint rects plus
// immutable edge/port metadata, so unrelated routes can be reused exactly.
// WeakMap ownership keeps this cache scoped to the live layout graph and edges.
const auditRouteCache = new WeakMap<Map<string, EdgeRoutingTarget>, WeakMap<LayoutReaderV2Edge, CachedAuditRoute>>();

function cachedAuditRoute(
  targets: Map<string, EdgeRoutingTarget>,
  edge: LayoutReaderV2Edge,
): RoutedLayoutEdge | undefined {
  const parent = targets.get(edge.parentId);
  const child = targets.get(edge.childId);
  if (!parent || !child) return undefined;
  let edgeCache = auditRouteCache.get(targets);
  if (!edgeCache) {
    edgeCache = new WeakMap();
    auditRouteCache.set(targets, edgeCache);
  }
  const cached = edgeCache.get(edge);
  const p = parent.rect;
  const c = child.rect;
  if (cached
    && cached.parentX === p.x && cached.parentY === p.y
    && cached.parentWidth === p.width && cached.parentHeight === p.height
    && cached.childX === c.x && cached.childY === c.y
    && cached.childWidth === c.width && cached.childHeight === c.height) return cached.route;
  const route = buildRoutedLayoutEdge(targets, edge);
  edgeCache.set(edge, {
    parentX: p.x, parentY: p.y, parentWidth: p.width, parentHeight: p.height,
    childX: c.x, childY: c.y, childWidth: c.width, childHeight: c.height,
    route,
  });
  return route;
}

export function buildAuditRoutes(
  targets: Map<string, EdgeRoutingTarget>,
  edges: LayoutReaderV2Edge[],
): RoutedLayoutEdge[] {
  return edges
    .filter((edge) => edge.role !== 'structural')
    .map((edge) => cachedAuditRoute(targets, edge))
    .filter((route): route is RoutedLayoutEdge => Boolean(route));
}

function expandedRect(rect: LayoutRect, padding: number): LayoutRect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function boundsOverlap(a: LayoutRect, b: LayoutRect): boolean {
  return a.x <= rectRight(b) && rectRight(a) >= b.x && a.y <= rectBottom(b) && rectBottom(a) >= b.y;
}

/** Liang-Barsky clipping: true when a finite line segment enters/touches rect. */
export function segmentIntersectsRect(segment: EdgeSegment, rect: LayoutRect): boolean {
  const { a, b } = segment;
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const checks: Array<[number, number]> = [
    [-dx, a.x - rect.x],
    [dx, rectRight(rect) - a.x],
    [-dy, a.y - rect.y],
    [dy, rectBottom(rect) - a.y],
  ];
  for (const [p, q] of checks) {
    if (Math.abs(p) < 1e-9) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
  }
  return t0 <= t1;
}

export function routeIntersectsRect(route: RoutedLayoutEdge, rect: LayoutRect, padding = 0): boolean {
  const obstacle = padding > 0 ? expandedRect(rect, padding) : rect;
  if (!boundsOverlap(route.bounds, obstacle)) return false;
  return route.segments.some((segment) => segmentIntersectsRect(segment, obstacle));
}

function orientation(a: EdgePoint, b: EdgePoint, c: EdgePoint): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsCross(a: EdgeSegment, b: EdgeSegment): boolean {
  const o1 = orientation(a.a, a.b, b.a);
  const o2 = orientation(a.a, a.b, b.b);
  const o3 = orientation(b.a, b.b, a.a);
  const o4 = orientation(b.a, b.b, a.b);
  const epsilon = 1e-6;
  // Collinear/near-touching runs are handled by the corridor metric, not as a
  // topological crossing. This avoids counting shared visual lanes as crossings.
  if (Math.abs(o1) <= epsilon || Math.abs(o2) <= epsilon || Math.abs(o3) <= epsilon || Math.abs(o4) <= epsilon) return false;
  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

export function routesCross(a: RoutedLayoutEdge, b: RoutedLayoutEdge): boolean {
  if (!boundsOverlap(a.bounds, b.bounds)) return false;
  for (const sa of a.segments) for (const sb of b.segments) if (segmentsCross(sa, sb)) return true;
  return false;
}

function conflictKey(route: RoutedLayoutEdge, nodeId: string): string {
  return `${route.key}|${nodeId}`;
}

function conflictFor(route: RoutedLayoutEdge, nodeId: string): EdgeNodeConflict {
  return {
    edgeKey: route.key,
    parentId: route.edge.parentId,
    childId: route.edge.childId,
    nodeId,
    role: route.edge.role,
    field: route.edge.field,
  };
}

/**
 * Audits the final routed graph. Exact edge/node intersections are hard safety
 * failures. The padded corridor metric is intentionally softer: it reserves a
 * small visual breathing lane around wires without pretending the wire itself
 * is as wide as normal node padding.
 */
export function auditEdgeCorridors(
  targets: Map<string, EdgeRoutingTarget>,
  edges: LayoutReaderV2Edge[],
  corridorPadding: number,
): EdgeCorridorAudit {
  const routes = buildAuditRoutes(targets, edges);
  const exact = new Map<string, EdgeNodeConflict>();
  const padded = new Map<string, EdgeNodeConflict>();
  const targetEntries = [...targets.entries()].map(([nodeId, target], index) => ({
    nodeId,
    target,
    index,
    left: target.rect.x,
    right: rectRight(target.rect),
  }));
  const targetsByLeft = [...targetEntries].sort((a, b) => a.left - b.left || a.index - b.index);
  const targetsByRight = [...targetEntries].sort((a, b) => a.right - b.right || a.index - b.index);
  const upperBoundLeft = (value: number): number => {
    let low = 0;
    let high = targetsByLeft.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (targetsByLeft[mid].left <= value) low = mid + 1;
      else high = mid;
    }
    return low;
  };
  const lowerBoundRight = (value: number): number => {
    let low = 0;
    let high = targetsByRight.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (targetsByRight[mid].right < value) low = mid + 1;
      else high = mid;
    }
    return low;
  };

  for (const route of routes) {
    const routeLeft = route.bounds.x - corridorPadding;
    const routeRight = rectRight(route.bounds) + corridorPadding;
    const leftLimit = upperBoundLeft(routeRight);
    const rightStart = lowerBoundRight(routeLeft);
    const candidates: typeof targetEntries = [];
    // Intersecting intervals satisfy both left <= routeRight and right >=
    // routeLeft. Iterate whichever binary-searched side is smaller, then apply
    // the other exact interval predicate.
    if (leftLimit <= targetsByRight.length - rightStart) {
      for (let i = 0; i < leftLimit; i++) {
        const candidate = targetsByLeft[i];
        if (candidate.right >= routeLeft) candidates.push(candidate);
      }
    } else {
      for (let i = rightStart; i < targetsByRight.length; i++) {
        const candidate = targetsByRight[i];
        if (candidate.left <= routeRight) candidates.push(candidate);
      }
    }
    // Preserve the old route-major / target-insertion conflict order exactly.
    candidates.sort((a, b) => a.index - b.index);
    for (const { nodeId, target } of candidates) {
      if (nodeId === route.edge.parentId || nodeId === route.edge.childId) continue;
      if (corridorPadding <= 0) {
        // Exact and padded are identical at zero padding. The old path ran the
        // same segment/rectangle test twice for every route/node pair.
        if (!routeIntersectsRect(route, target.rect, 0)) continue;
        const conflict = conflictFor(route, nodeId);
        const key = conflictKey(route, nodeId);
        padded.set(key, conflict);
        exact.set(key, conflict);
        continue;
      }
      // The exact rectangle is a subset of the padded rectangle. If the route
      // misses the padded obstacle it cannot hit the exact obstacle either.
      if (!routeIntersectsRect(route, target.rect, corridorPadding)) continue;
      padded.set(conflictKey(route, nodeId), conflictFor(route, nodeId));
      if (routeIntersectsRect(route, target.rect, 0)) exact.set(conflictKey(route, nodeId), conflictFor(route, nodeId));
    }
  }

  // Sweep by route left edge so pairs whose X bounds cannot overlap are never
  // considered. Keep original indices and sort accepted conflicts back into
  // the previous deterministic i/j order.
  const indexedRoutes = routes
    .map((route, index) => ({ route, index }))
    .sort((a, b) => a.route.bounds.x - b.route.bounds.x || a.index - b.index);
  const crossingPairs: Array<{ i: number; j: number; conflict: EdgeEdgeConflict }> = [];
  for (let left = 0; left < indexedRoutes.length; left++) {
    const aItem = indexedRoutes[left];
    const a = aItem.route;
    const aRight = rectRight(a.bounds);
    for (let right = left + 1; right < indexedRoutes.length; right++) {
      const bItem = indexedRoutes[right];
      const b = bItem.route;
      if (b.bounds.x > aRight) break;
      if (b.bounds.y > rectBottom(a.bounds) || rectBottom(b.bounds) < a.bounds.y) continue;
      if (a.edge.parentId === b.edge.parentId
        || a.edge.parentId === b.edge.childId
        || a.edge.childId === b.edge.parentId
        || a.edge.childId === b.edge.childId) continue;
      if (!routesCross(a, b)) continue;
      const i = Math.min(aItem.index, bItem.index);
      const j = Math.max(aItem.index, bItem.index);
      crossingPairs.push({
        i,
        j,
        conflict: {
          edgeAKey: routes[i].key,
          edgeBKey: routes[j].key,
          edgeAParentId: routes[i].edge.parentId,
          edgeAChildId: routes[i].edge.childId,
          edgeBParentId: routes[j].edge.parentId,
          edgeBChildId: routes[j].edge.childId,
        },
      });
    }
  }
  crossingPairs.sort((a, b) => a.i - b.i || a.j - b.j);
  const crossings = crossingPairs.map((pair) => pair.conflict);

  return {
    routedEdges: routes.length,
    edgeNodeIntersections: exact.size,
    edgeNodeCorridorIntrusions: padded.size,
    edgeEdgeCrossings: crossings.length,
    edgeNodeConflicts: [...exact.values()],
    edgeNodeCorridorConflicts: [...padded.values()],
    edgeEdgeConflicts: crossings,
  };
}

export function routingCorridorPadding(horizontalGap: number): number {
  return cleanNumber(Math.max(6, Math.min(18, Math.max(0, horizontalGap) * 0.45 + 4)));
}
