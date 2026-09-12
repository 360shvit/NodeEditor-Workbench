import { overlapPairs } from './geometry.js';
import { auditEdgeCorridors, type EdgeCorridorAudit, type EdgeRoutingTarget } from './edgeCorridor.js';
import type { LayoutReaderV2Edge } from './readerV2.js';
import type { LayoutBlockReason } from './types.js';

export interface LayoutSafetyAudit {
  nodeOverlaps: number;
  flow: EdgeCorridorAudit;
  attachment: EdgeCorridorAudit;
  all: EdgeCorridorAudit;
}

/** One canonical routing/node safety audit used by full rebuild passes. */
export function auditLayoutSafety(
  targets: Map<string, EdgeRoutingTarget>,
  edges: LayoutReaderV2Edge[],
  corridorPadding: number,
): LayoutSafetyAudit {
  const flowEdges = edges.filter((edge) => edge.role === 'flow');
  const attachmentEdges = edges.filter((edge) => edge.role === 'attachment' || edge.role === 'ordered-attachment');
  return {
    nodeOverlaps: overlapPairs([...targets.entries()].map(([id, entry]) => ({ id, rect: entry.rect }))).length,
    flow: auditEdgeCorridors(targets, flowEdges, corridorPadding),
    attachment: auditEdgeCorridors(targets, attachmentEdges, corridorPadding),
    all: auditEdgeCorridors(targets, edges, corridorPadding),
  };
}


export function auditFlowRoutingSafety(
  targets: Map<string, EdgeRoutingTarget>,
  edges: LayoutReaderV2Edge[],
  corridorPadding: number,
): EdgeCorridorAudit {
  return auditEdgeCorridors(targets, edges.filter((edge) => edge.role === 'flow'), corridorPadding);
}

/** Hard DAG safety excludes soft corridor intrusions and advisory edge crossings. */
export function isHardDagSafetyClean(audit: LayoutSafetyAudit): boolean {
  return audit.nodeOverlaps === 0
    && audit.flow.edgeNodeIntersections === 0
    && audit.attachment.edgeNodeIntersections === 0;
}

export interface LayoutBlockState {
  missingRoot?: boolean;
  duplicateStructuralNodeIds?: number;
  nodeOverlaps?: number;
  flowEdgeNodeIntersections?: number;
  attachmentEdgeNodeIntersections?: number;
  blockOnAttachmentIntersections?: boolean;
  unsupportedGroups?: number;
  ambiguousGroupMemberships?: number;
  ambiguousGroupParents?: number;
  newGroupOverlaps?: number;
  floaterOverlaps?: number;
  blockOnFloaterOverlaps?: boolean;
}

/** Stable structured reasons used by both the block decision and user-facing diagnostics. */
export function layoutBlockReasons(state: LayoutBlockState): LayoutBlockReason[] {
  const reasons: LayoutBlockReason[] = [];
  const add = (code: LayoutBlockReason['code'], count: number, summary: string) => {
    if (count > 0) reasons.push({ code, count, summary });
  };
  if (state.missingRoot) add('missing-root', 1, 'No positioned live root node could be resolved.');
  add('duplicate-structural-node-id', state.duplicateStructuralNodeIds ?? 0, 'Duplicate structural node ids make placement ambiguous.');
  add('node-overlap', state.nodeOverlaps ?? 0, 'Live-node overlaps remain after layout.');
  add('flow-edge-node-intersection', state.flowEdgeNodeIntersections ?? 0, 'Flow connections still intersect foreign node geometry.');
  if (state.blockOnAttachmentIntersections) add('attachment-edge-node-intersection', state.attachmentEdgeNodeIntersections ?? 0, 'Attachment connections still intersect foreign node geometry.');
  add('unsupported-group-metadata', state.unsupportedGroups ?? 0, 'Group bounds are incomplete, so group safety cannot be validated.');
  add('ambiguous-group-membership', state.ambiguousGroupMemberships ?? 0, 'One or more live nodes fit multiple non-nested groups, so membership cannot be chosen safely.');
  add('ambiguous-group-parentage', state.ambiguousGroupParents ?? 0, 'One or more groups fit multiple non-nested parent groups, so group hierarchy cannot be chosen safely.');
  add('new-group-overlap', state.newGroupOverlaps ?? 0, 'New group overlap relations would be introduced.');
  if (state.blockOnFloaterOverlaps) add('floater-overlap', state.floaterOverlaps ?? 0, 'Floating-node overlaps remain after the selected floater handling mode.');
  return reasons;
}

/** Shared block decision; each strategy opts into the failures it treats as hard. */
export function isLayoutBlocked(state: LayoutBlockState): boolean {
  return layoutBlockReasons(state).length > 0;
}
