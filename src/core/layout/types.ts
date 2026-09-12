import type { JsonPrimitive, NodeLocation } from '../types.js';

export type LayoutStrategy = 'normalize' | 'author-normalize' | 'dag-rebuild';
export type FloaterLayoutMode = 'ignore' | 'pack' | 'quarantine';
export type DagBranchDirection = 'auto' | 'up' | 'down' | 'type';

export interface LayoutEngineSettings {
  strategy: LayoutStrategy;
  horizontalGap: number;
  verticalGap: number;
  alignmentTolerance: number;
  /** DAG Rebuild: place side branches automatically, only above/below, or by semantic connection type. */
  dagBranchDirection?: DagBranchDirection;
  includeLive: boolean;
  /** Explicit floating-node operation. Origin translation still applies in ignore mode. */
  floaterMode: FloaterLayoutMode;
}

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutScalarPatch {
  fileId: string;
  filePath: string;
  entityId: string;
  entityKind: 'node' | 'group' | 'comment';
  location: NodeLocation;
  field: string;
  jsonPath: Array<string | number>;
  oldValue: JsonPrimitive;
  newValue: JsonPrimitive;
}

export type LayoutBlockReasonCode =
  | 'missing-root'
  | 'duplicate-structural-node-id'
  | 'node-overlap'
  | 'flow-edge-node-intersection'
  | 'attachment-edge-node-intersection'
  | 'unsupported-group-metadata'
  | 'ambiguous-group-membership'
  | 'ambiguous-group-parentage'
  | 'new-group-overlap'
  | 'floater-overlap';

export interface LayoutBlockReason {
  code: LayoutBlockReasonCode;
  count: number;
  summary: string;
}

export interface GroupMembershipAmbiguity {
  nodeId: string;
  candidateGroupIds: string[];
  mode: 'bounds' | 'center';
}

export interface GroupParentAmbiguity {
  groupId: string;
  candidateParentGroupIds: string[];
}

export interface GroupResolutionSummary {
  assignedByBounds: number;
  assignedByCenter: number;
  ungrouped: number;
  ambiguous: GroupMembershipAmbiguity[];
  ambiguousParents: GroupParentAmbiguity[];
}

export interface GroupSnapshot {
  id: string;
  index: number;
  name?: string;
  originalBounds: LayoutRect;
  canonicalBounds: LayoutRect;
  memberNodeIds: string[];
  memberGroupIds: string[];
  parentGroupId?: string;
  padding: { left: number; top: number; right: number; bottom: number };
}

export interface LayoutFileMetrics {
  fileId: string;
  filePath: string;
  rootNodeId?: string;
  originOffset: { x: number; y: number };
  positionedNodes: number;
  translatedNodes: number;
  normalizedNodes: number;
  xNormalizedNodes: number;
  yNormalizedNodes: number;
  horizontalGap: number;
  verticalGap: number;
  /** DAG Rebuild: number of horizontal depth columns in the rebuilt live graph. */
  dagLevels: number;
  /** DAG Rebuild: effective vertical sibling gap after routing-safety expansion. */
  dagEffectiveVerticalGap: number;
  /** DAG Rebuild: number of layout passes used to clear routed edge/node conflicts. */
  dagSafetyPasses: number;
  /** Positioned live nodes participating in the structural primary forest. */
  treeNodes: number;
  /** Number of disconnected structural roots in the eligible live population. */
  treeRoots: number;
  /** Maximum structural depth below a primary root. */
  treeMaxDepth: number;
  /** Flow parents currently packed by the semantic solver (2+ flow/structural fallback children). */
  forks: number;
  /** Sum of same-domain flow child subtrees created at solver forks. */
  branchClusters: number;
  /** Reader v2: same-domain connector edges (e.g. Density Inputs -> Density output). */
  semanticFlowEdges: number;
  /** Reader v2: typed non-flow attachments (e.g. CurveMapper.Curve). */
  semanticAttachmentEdges: number;
  /** Reader v2: ordered typed attachments (e.g. Manual.Points / MultiMix.Keys). */
  semanticOrderedAttachmentEdges: number;
  /** Reader v2: structural relations that could not be mapped to a visual catalog port. */
  semanticStructuralEdges: number;
  /** Reader v2: parents with 2+ same-domain flow children. */
  semanticFlowForks: number;
  /** Reader v2: parents with 2+ structural children before semantic classification. */
  semanticStructuralForks: number;
  /** Reader v2: parents mixing same-domain flow with typed attachments. */
  semanticMixedParents: number;
  /** Reader v2: parent families containing one or more typed attachments. */
  semanticAttachmentFamilies: number;
  /** Parents whose local author chain has exactly one structural child. */
  singleChildParents: number;
  /** Legacy-compatible count of edges snapped onto a straight author flow. */
  laneSnaps: number;
  /** Edges aligned using physical/derived input-output connector centers. */
  connectionPlanesAligned: number;
  /** Edge alignments that had to fall back to node centers because port semantics were unavailable. */
  portAlignmentFallbacks: number;
  /** Additional local fork-depth bands beyond the immediate child band. */
  authorDepthBands: number;
  /** Children intentionally kept as deep branch starts instead of being pulled to the immediate fork column. */
  deepBranchStarts: number;
  /** Collision repairs that restored X depth for an author-deep branch before considering a Y push. */
  authorDepthXRescues: number;
  /** Small local fork-band X shifts used to clear near-touching sibling contours before a Y push. */
  contourXRescues: number;
  /** Typed attachment edges locally moved in X because the author offset no longer cleared current node geometry. */
  attachmentXAdjustments: number;
  /** Largest local owner->attachment X padding correction. */
  maxAttachmentXAdjustment: number;
  /** Attachment families translated in X or Y after flow compaction to clear foreign contours. */
  attachmentContourRescues: number;
  /** Nodes moved with attachment-family contour rescues. */
  attachmentContourShiftedNodes: number;
  /** Largest whole-family attachment contour translation on either axis. */
  maxAttachmentContourShift: number;
  /** Same-domain flow connections routed through the Bezier safety model. */
  routedFlowEdges: number;
  /** Exact foreign flow-edge -> node intersections before the routing-aware repair pass. */
  edgeNodeIntersectionsBefore: number;
  /** Exact foreign flow-edge -> node intersections remaining after routing-aware repair. */
  edgeNodeIntersectionsAfter: number;
  /** Foreign node intrusions into the small padded flow-wire corridor after repair. */
  edgeNodeCorridorIntrusionsAfter: number;
  /** Topological crossings between unrelated routed connections after repair. */
  edgeEdgeCrossingsAfter: number;
  /** Typed attachment/ordered-attachment wires still intersecting foreign nodes. */
  attachmentEdgeNodeIntersectionsAfter: number;
  /** Flow bands translated to reserve a clean incoming connection corridor. */
  edgeCorridorRepairs: number;
  /** Nodes translated with routing-aware flow-band repairs. */
  edgeCorridorShiftedNodes: number;
  /** Largest routing-aware flow-band X translation. */
  maxEdgeCorridorShift: number;
  /** Number of explicit author-inline Flow lanes discovered after semantic classification. */
  flowLanes: number;
  /** Number of parent->child Flow edges participating in explicit author-inline lanes. */
  flowLaneEdges: number;
  /** Safe final Y relaxations that restored exact physical connector-plane alignment. */
  laneRealignments: number;
  /** Nodes translated with accepted rigid lane-subtree relaxations. */
  laneRealignedNodes: number;
  /** Candidate lane relaxations rejected because they would break node/wire safety or exceeded the small-relaxation range. */
  laneNormalizationBlocked: number;
  /** Flow edges whose author node-top Y jitter is small enough to represent one visible row. */
  visualRowEdges: number;
  /** Visual-row edges whose original author node-top Y values differed before normalization. */
  visualRowAuthorJitterEdges: number;
  /** Visual-row edges still off the exact node-top row before the final safety relaxation. */
  visualRowMisalignedBefore: number;
  /** Visual-row edges still off the exact node-top row after the final safety relaxation. */
  visualRowMisalignedAfter: number;
  /** Accepted final relaxations that restored exact node-top row alignment. */
  visualRowRealignments: number;
  /** Largest node-top Y deviation among visual-row edges before final relaxation. */
  maxVisualRowDeviationBefore: number;
  /** Largest node-top Y deviation among visual-row edges after final relaxation. */
  maxVisualRowDeviationAfter: number;
  /** Visual modules inferred from local author Flow structure. */
  visualGroups: number;
  /** Visual modules that contain same-domain Flow nodes. */
  flowVisualGroups: number;
  /** Connected horizontal author-chain rows inside visual modules. */
  chainRows: number;
  /** Same-domain Flow edges participating in those exact chain rows. */
  chainRowEdges: number;
  /** Cross-module author horizontal guides (pink-guide model). */
  authorRowGuides: number;
  /** Cross-module author vertical guides (red-guide model). */
  authorColumnGuides: number;
  /** Chain rows with >0.5 px visible Y spread before -> after Author Grid. */
  chainRowsMisalignedBefore: number;
  chainRowsMisalignedAfter: number;
  /** Cross-module guides already exact before -> after Author Grid. */
  rowGuidesAlignedBefore: number;
  rowGuidesAlignedAfter: number;
  columnGuidesAlignedBefore: number;
  columnGuidesAlignedAfter: number;
  /** Individual chain-node Y corrections accepted by Author Grid. */
  chainRowRealignments: number;
  /** Whole visual-module Y guide corrections accepted by Author Grid. */
  rowGuideRealignments: number;
  /** Whole visual-module X guide corrections accepted by Author Grid. */
  columnGuideRealignments: number;
  /** Unique nodes moved by final Author Grid alignment. */
  authorGridMovedNodes: number;
  /** Author Grid moves rejected by collision/routing safety or bounded-guide limits. */
  authorGridBlocked: number;
  /** Largest accepted module/guide X correction. */
  maxAuthorGridShiftX: number;
  /** Largest accepted row/module Y correction. */
  maxAuthorGridShiftY: number;
  /** Largest cross-module row-guide spread before -> after Author Grid. */
  maxRowGuideDeviationBefore: number;
  maxRowGuideDeviationAfter: number;
  /** Largest cross-module column-guide spread before -> after Author Grid. */
  maxColumnGuideDeviationBefore: number;
  maxColumnGuideDeviationAfter: number;
  /** Typed attachment chains authored as near-horizontal visible rows. */
  attachmentPixelRows: number;
  attachmentPixelRowsMisalignedBefore: number;
  attachmentPixelRowsMisalignedAfter: number;
  /** Ordered leaf/value attachment families authored as near-vertical columns. */
  orderedAttachmentColumns: number;
  orderedAttachmentColumnsMisalignedBefore: number;
  orderedAttachmentColumnsMisalignedAfter: number;
  /** Individual typed-attachment pixel corrections accepted/rejected by final safety audit. */
  pixelAlignmentRealignments: number;
  pixelAlignmentBlocked: number;
  maxPixelAlignmentShiftX: number;
  maxPixelAlignmentShiftY: number;
  /** Largest accepted final Flow-lane Y translation. */
  maxLaneShift: number;
  /** Largest physical connector-plane deviation among lane edges before final lane relaxation. */
  maxConnectionPlaneDeviationBefore: number;
  /** Median physical connector-plane deviation among lane edges before final lane relaxation. */
  medianConnectionPlaneDeviationBefore: number;
  /** Largest physical connector-plane deviation among lane edges after final lane relaxation. */
  maxConnectionPlaneDeviationAfter: number;
  /** Median physical connector-plane deviation among lane edges after final lane relaxation. */
  medianConnectionPlaneDeviationAfter: number;
  /** Nodes translated in X by author-depth or contour collision rescue. */
  xRescueShiftedNodes: number;
  /** Largest single author-depth X rescue. */
  maxXRescueShift: number;
  /** Branch-cluster collisions repaired by the bottom-up contour pass. */
  clusterCollisionsResolved: number;
  /** Nodes translated as part of branch collision repairs. */
  clusterShiftedNodes: number;
  /** Largest single branch-cluster Y translation. */
  maxClusterShift: number;
  xSpanBefore: number;
  xSpanAfter: number;
  ySpanBefore: number;
  ySpanAfter: number;
  translatedComments: number;
  translatedGroups: number;
  resizedGroups: number;
  nodeOverlapsBefore: number;
  nodeOverlapsAfter: number;
  floaterMode: FloaterLayoutMode;
  floatingNodes: number;
  floatersHandled: number;
  floaterOverlapsBefore: number;
  floaterOverlapsAfter: number;
  groupOverlapsBefore: number;
  groupOverlapsAfter: number;
  newGroupOverlaps: Array<[string, string]>;
  /** Live nodes assigned to author groups by full-bounds containment. */
  groupMembershipByBounds: number;
  /** Live nodes assigned by center-point fallback when the full visual rect slightly exceeds a group. */
  groupMembershipByCenter: number;
  /** Positioned live nodes whose candidate groups were non-nested and therefore unsafe to guess. */
  groupMembershipAmbiguous: number;
  /** Group sections that fit multiple non-nested parent groups and therefore cannot be parented safely. */
  groupParentAmbiguous: number;
  /** Group sections protected by reverting only their escaping moved members. */
  groupAnchorRescues: number;
  /** Unique nodes restored to canonical author positions by the group-anchor rescue. */
  groupAnchorRescuedNodes: number;
  blockReasons: LayoutBlockReason[];
  warnings: string[];
  blocked: boolean;
}

export interface LayoutFileProposal {
  fileId: string;
  filePath: string;
  patches: LayoutScalarPatch[];
  groups: GroupSnapshot[];
  metrics: LayoutFileMetrics;
}

export interface LayoutProposal {
  strategy: LayoutStrategy;
  createdAt: number;
  files: LayoutFileProposal[];
  patches: LayoutScalarPatch[];
  blocked: boolean;
  warnings: string[];
}
