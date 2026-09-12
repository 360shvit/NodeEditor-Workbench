import type { FieldIndexEntry, FieldOccurrence, FieldStat, NodeLocation, ProjectFile, ProjectModel } from './types.js';

export interface FieldStatsScope {
  workspace?: string | 'all';
  live?: boolean;
  floating?: boolean;
  hideEmpty?: boolean;
}

export interface FieldStatsNodeRef {
  fileId: string;
  nodeId: string;
  location: NodeLocation;
}

export type QuickFieldRole = 'broad' | 'context';
export interface QuickFieldStat extends FieldStat {
  quickRole: QuickFieldRole;
}

function isEmptyValue(value: unknown): boolean {
  return typeof value === 'string' && value.trim() === '';
}

function nodeRefKey(fileId: string, location: NodeLocation, nodeId: string): string {
  return `${fileId}|${location}|${nodeId}`;
}

/**
 * Indexes only generic property fields. Import / Export / Seed retain their dedicated semantic filters.
 * Unknown node types participate automatically because this is driven by parsed field presence.
 */
export function buildFieldIndex(files: ProjectFile[]): Map<string, FieldIndexEntry> {
  const index = new Map<string, FieldIndexEntry>();
  for (const file of files) {
    for (const node of file.nodes) {
      for (const field of node.fields) {
        if (field.category !== 'property') continue;
        const occurrence: FieldOccurrence = {
          fileId: file.id,
          filePath: file.path,
          workspaceId: file.workspace.id,
          nodeId: node.id,
          nodeKind: node.nodeKind,
          location: node.location,
          field,
        };
        const record = index.get(field.key) ?? { key: field.key, occurrences: [] };
        record.occurrences.push(occurrence);
        index.set(field.key, record);
      }
    }
  }
  return index;
}

function locationAllowed(location: NodeLocation, scope: FieldStatsScope): boolean {
  if (location === 'live') return scope.live !== false;
  return scope.floating === true;
}

interface StatsUniverse {
  nodeRefs: Set<string>;
  filterableNodeRefs: Set<string>;
  nodeKinds: Set<string>;
  filterableNodeKinds: Set<string>;
  fileIds: Set<string>;
  filterableFileIds: Set<string>;
}

function buildUniverse(
  project: ProjectModel,
  nodeRefs: Set<string>,
  hideEmpty: boolean,
): StatsUniverse {
  const universe: StatsUniverse = {
    nodeRefs,
    filterableNodeRefs: new Set<string>(),
    nodeKinds: new Set<string>(),
    filterableNodeKinds: new Set<string>(),
    fileIds: new Set<string>(),
    filterableFileIds: new Set<string>(),
  };

  for (const file of project.files) {
    for (const node of file.nodes) {
      const ref = nodeRefKey(file.id, node.location, node.id);
      if (!nodeRefs.has(ref)) continue;
      universe.nodeKinds.add(node.nodeKind);
      universe.fileIds.add(file.id);
      const hasFilterableProperty = node.fields.some((field) => field.category === 'property' && (!hideEmpty || !isEmptyValue(field.value)));
      if (hasFilterableProperty) {
        universe.filterableNodeRefs.add(ref);
        universe.filterableNodeKinds.add(node.nodeKind);
        universe.filterableFileIds.add(file.id);
      }
    }
  }
  return universe;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Computes usefulness rather than raw popularity.
 *
 * Broad score rewards fields that are distributed across several node kinds and files.
 * Context score rewards fields that are genuinely common in the current tab/search snapshot.
 * A dominance penalty stops one mass-repeated node kind from occupying every adaptive slot.
 */
function deriveStats(
  project: ProjectModel,
  nodeRefs: Set<string>,
  hideEmpty: boolean,
): FieldStat[] {
  if (!nodeRefs.size) return [];
  const universe = buildUniverse(project, nodeRefs, hideEmpty);
  const scopeNodeCount = universe.nodeRefs.size;
  const filterableNodeCount = universe.filterableNodeRefs.size;
  const scopeNodeTypeCount = universe.filterableNodeKinds.size;
  const scopeFileCount = universe.filterableFileIds.size;

  const stats: FieldStat[] = [];
  for (const record of project.fieldIndex.values()) {
    const occurrences = record.occurrences.filter((occurrence) => {
      if (!nodeRefs.has(nodeRefKey(occurrence.fileId, occurrence.location, occurrence.nodeId))) return false;
      if (hideEmpty && isEmptyValue(occurrence.field.value)) return false;
      return true;
    });
    if (!occurrences.length) continue;

    const nodes = new Set(occurrences.map((item) => nodeRefKey(item.fileId, item.location, item.nodeId)));
    const nodeKinds = new Set(occurrences.map((item) => item.nodeKind));
    const files = new Set(occurrences.map((item) => item.fileId));
    const perNodeKind = new Map<string, Set<string>>();
    for (const occurrence of occurrences) {
      const bucket = perNodeKind.get(occurrence.nodeKind) ?? new Set<string>();
      bucket.add(nodeRefKey(occurrence.fileId, occurrence.location, occurrence.nodeId));
      perNodeKind.set(occurrence.nodeKind, bucket);
    }
    const dominantNodeTypeCount = Math.max(0, ...[...perNodeKind.values()].map((items) => items.size));
    const nodeCount = nodes.size;
    const frequency = filterableNodeCount ? nodeCount / filterableNodeCount : 0;
    const nodeTypeCoverage = scopeNodeTypeCount ? nodeKinds.size / scopeNodeTypeCount : 0;
    const fileCoverage = scopeFileCount ? files.size / scopeFileCount : 0;
    const dominantNodeTypeShare = nodeCount ? dominantNodeTypeCount / nodeCount : 0;

    // Broad deliberately values diversity over raw count. Diversity dimensions that cannot discriminate
    // in the current scope (for example file coverage inside a single-file tab) receive no weight.
    const broadTypeWeight = scopeNodeTypeCount > 1 ? 0.55 : 0;
    const broadFileWeight = scopeFileCount > 1 ? 0.30 : 0;
    const broadFrequencyWeight = 0.15;
    const broadWeightSum = broadTypeWeight + broadFileWeight + broadFrequencyWeight;
    const broadBase = broadWeightSum
      ? ((broadFrequencyWeight * frequency) + (broadTypeWeight * nodeTypeCoverage) + (broadFileWeight * fileCoverage)) / broadWeightSum
      : frequency;
    const broadScore = clamp01(broadBase * (1 - 0.55 * dominantNodeTypeShare));

    // Context deliberately values presence in the active node set. Dominance is only mildly penalized here,
    // because a Material-heavy Search tab should still surface Material-specific fields.
    const contextBase = (0.82 * frequency) + (0.10 * nodeTypeCoverage) + (0.08 * fileCoverage);
    const contextScore = clamp01(contextBase * (1 - 0.10 * dominantNodeTypeShare));

    stats.push({
      key: record.key,
      count: occurrences.length,
      nodeCount,
      scopeNodeCount,
      filterableNodeCount,
      frequency,
      nodeTypeCount: nodeKinds.size,
      scopeNodeTypeCount,
      nodeTypeCoverage,
      fileCount: files.size,
      scopeFileCount,
      fileCoverage,
      dominantNodeTypeShare,
      broadScore,
      contextScore,
      common: false,
    });
  }

  // "Common" in the full picker is also relevance-based now. It is presentation only, not schema knowledge.
  const minSupport = filterableNodeCount >= 12 ? 3 : 1;
  const commonKeys = new Set(
    stats
      .filter((item) => item.nodeCount >= minSupport)
      .sort((a, b) => {
        const aScore = (0.60 * a.broadScore) + (0.40 * a.contextScore);
        const bScore = (0.60 * b.broadScore) + (0.40 * b.contextScore);
        return bScore - aScore || b.nodeCount - a.nodeCount || a.key.localeCompare(b.key);
      })
      .slice(0, 12)
      .map((item) => item.key),
  );

  return stats
    .map((item) => ({ ...item, common: commonKeys.has(item.key) }))
    .sort((a, b) => b.nodeCount - a.nodeCount || b.count - a.count || a.key.localeCompare(b.key));
}

/**
 * Derives adaptive field statistics for the normal global view-filter scope.
 * The denominator is the number of nodes in scope that actually contain filterable primitive properties,
 * so structural/import/export-only nodes do not distort value-field relevance.
 */
export function getScopedFieldStats(project: ProjectModel, scope: FieldStatsScope): FieldStat[] {
  const allowedNodeRefs = new Set<string>();
  for (const file of project.files) {
    if (scope.workspace && scope.workspace !== 'all' && file.workspace.id !== scope.workspace) continue;
    for (const node of file.nodes) {
      if (!locationAllowed(node.location, scope)) continue;
      allowedNodeRefs.add(nodeRefKey(file.id, node.location, node.id));
    }
  }
  return deriveStats(project, allowedNodeRefs, scope.hideEmpty === true);
}

/**
 * Presence-driven field statistics for a stable set of nodes (for example one file tab or a Search snapshot).
 * This deliberately ignores the active field/location filters so adaptive quick slots do not reorder while
 * the user is clicking them. The caller decides when the node reference set itself changes.
 */
export function getFieldStatsForNodeRefs(project: ProjectModel, refs: FieldStatsNodeRef[], hideEmpty = true): FieldStat[] {
  const refKeys = new Set(refs.map((ref) => nodeRefKey(ref.fileId, ref.location, ref.nodeId)));
  return deriveStats(project, refKeys, hideEmpty);
}

/**
 * Selects up to six stable adaptive Quick Filters:
 *   - first 3 "broad" fields: useful across different node kinds/files
 *   - then 3 "context" fields: common in the active file/Search snapshot
 * Duplicates are skipped and remaining slots are filled by the best unused candidates.
 */
export function getAdaptiveQuickFieldStats(
  project: ProjectModel,
  refs: FieldStatsNodeRef[],
  hideEmpty = true,
  broadSlots = 3,
  contextSlots = 3,
): QuickFieldStat[] {
  const stats = getFieldStatsForNodeRefs(project, refs, hideEmpty);
  if (!stats.length) return [];
  const filterableNodeCount = stats[0]?.filterableNodeCount ?? 0;
  const minSupport = filterableNodeCount >= 12 ? 3 : 1;
  const eligible = stats.filter((item) => item.nodeCount >= minSupport);
  const candidates = eligible.length ? eligible : stats;

  const broadRanked = [...candidates]
    .filter((item) => {
      // In a genuinely diverse scope a broad slot needs evidence beyond one repeated node kind/file.
      // This is what prevents a 100× MaterialNode cluster from consuming all broad slots.
      const hasDiversityEvidence = (item.scopeNodeTypeCount <= 1 && item.scopeFileCount <= 1)
        || item.nodeTypeCount >= 2
        || (item.scopeFileCount > 1 && item.fileCount >= 2);
      return hasDiversityEvidence && item.broadScore >= 0.16;
    })
    .sort((a, b) => b.broadScore - a.broadScore || b.nodeCount - a.nodeCount || a.key.localeCompare(b.key));
  const contextRanked = [...candidates].sort((a, b) => b.contextScore - a.contextScore || b.nodeCount - a.nodeCount || a.key.localeCompare(b.key));
  const selected: QuickFieldStat[] = [];
  const used = new Set<string>();

  const take = (items: FieldStat[], count: number, role: QuickFieldRole) => {
    for (const item of items) {
      if (selected.filter((entry) => entry.quickRole === role).length >= count) break;
      if (used.has(item.key)) continue;
      used.add(item.key);
      selected.push({ ...item, quickRole: role });
    }
  };

  take(broadRanked, broadSlots, 'broad');
  take(contextRanked, contextSlots, 'context');

  const target = broadSlots + contextSlots;
  if (selected.length < target) {
    // If fewer than three genuinely broad fields exist, keep the remaining slots contextual rather than
    // mislabelling low-diversity mass fields as "broad" merely to fill a quota.
    for (const item of contextRanked) {
      if (selected.length >= target) break;
      if (used.has(item.key)) continue;
      used.add(item.key);
      selected.push({ ...item, quickRole: 'context' });
    }
  }

  return selected;
}
