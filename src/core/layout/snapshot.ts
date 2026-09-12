import { resolveNodeGeometry } from '../geometry/resolver.js';
import type { NodeGeometry } from '../geometry/types.js';
import { buildEditorMetadataForFile, type EditorGroupMetadata } from '../graph/editorMetadata.js';
import type { ProjectFile, ProjectNode } from '../types.js';
import { overlapPairs, pairKey, rectContains, rectBottom, rectRight } from './geometry.js';
import type { GroupResolutionSummary, GroupSnapshot, LayoutRect } from './types.js';

export interface PositionedLayoutNode {
  node: ProjectNode;
  geometry: NodeGeometry;
  rect: LayoutRect;
  canonicalRect: LayoutRect;
  xPath: Array<string | number>;
  yPath: Array<string | number>;
}

export interface LayoutFileSnapshot {
  file: ProjectFile;
  root?: PositionedLayoutNode;
  originOffset: { x: number; y: number };
  nodes: Map<string, PositionedLayoutNode>;
  groups: GroupSnapshot[];
  originalGroupOverlapKeys: Set<string>;
  unsupportedGroups: string[];
  groupResolution: GroupResolutionSummary;
}

function groupRect(group: EditorGroupMetadata): LayoutRect | undefined {
  if (!group.position || group.width === undefined || group.height === undefined) return undefined;
  if (group.width < 0 || group.height < 0) return undefined;
  return { x: group.position.x, y: group.position.y, width: group.width, height: group.height };
}

function rootCandidate(nodes: PositionedLayoutNode[]): PositionedLayoutNode | undefined {
  const live = nodes.filter((entry) => entry.node.location === 'live');
  return live.sort((a, b) => a.node.jsonPath.length - b.node.jsonPath.length)[0];
}

function area(rect: LayoutRect): number { return rect.width * rect.height; }

function pointInside(rect: LayoutRect, x: number, y: number, tolerance = 0.5): boolean {
  return x >= rect.x - tolerance
    && y >= rect.y - tolerance
    && x <= rectRight(rect) + tolerance
    && y <= rectBottom(rect) + tolerance;
}

function resolveSmallestNestedGroup(
  candidates: Array<{ group: EditorGroupMetadata; rect: LayoutRect }>,
): { selected?: { group: EditorGroupMetadata; rect: LayoutRect }; ambiguous: boolean } {
  if (!candidates.length) return { ambiguous: false };
  const ordered = [...candidates].sort((a, b) => area(a.rect) - area(b.rect) || a.group.index - b.group.index);
  const selected = ordered[0];
  const selectedArea = area(selected.rect);
  const nested = ordered.slice(1).every((candidate) => area(candidate.rect) > selectedArea + 0.5 && rectContains(candidate.rect, selected.rect));
  return nested || ordered.length === 1 ? { selected, ambiguous: false } : { ambiguous: true };
}

export function snapshotLayoutFile(file: ProjectFile): LayoutFileSnapshot {
  const metadata = buildEditorMetadataForFile(file);
  const positioned: PositionedLayoutNode[] = [];
  for (const node of file.nodes) {
    const editor = metadata.nodes.get(node.id);
    if (!editor?.position) continue;
    const geometry = resolveNodeGeometry(file, node, editor);
    positioned.push({
      node,
      geometry,
      rect: { x: editor.position.x, y: editor.position.y, width: geometry.width, height: geometry.height },
      canonicalRect: { x: editor.position.x, y: editor.position.y, width: geometry.width, height: geometry.height },
      xPath: editor.position.xPath,
      yPath: editor.position.yPath,
    });
  }
  const root = rootCandidate(positioned);
  const originOffset = root ? { x: -root.rect.x, y: -root.rect.y } : { x: 0, y: 0 };
  const nodeMap = new Map(positioned.map((entry) => {
    entry.canonicalRect = { ...entry.rect, x: entry.rect.x + originOffset.x, y: entry.rect.y + originOffset.y };
    return [entry.node.id, entry];
  }));

  const supportedGroups = metadata.groups.flatMap((group) => {
    const rect = groupRect(group);
    return rect ? [{ group, rect }] : [];
  });
  const unsupportedGroups = metadata.groups
    .filter((group) => !groupRect(group))
    .map((group) => group.name ?? `Group ${group.index + 1}`);

  const originalOverlapPairs = overlapPairs(supportedGroups.map(({ group, rect }) => ({ id: group.id, rect })));
  const originalGroupOverlapKeys = new Set(originalOverlapPairs.map(([a, b]) => pairKey(a, b)));

  const parentByGroup = new Map<string, string>();
  const ambiguousParents: GroupResolutionSummary['ambiguousParents'] = [];
  for (const child of supportedGroups) {
    const candidates = supportedGroups
      .filter((candidate) => candidate.group.id !== child.group.id && area(candidate.rect) > area(child.rect) && rectContains(candidate.rect, child.rect));
    const resolution = resolveSmallestNestedGroup(candidates);
    if (resolution.ambiguous) {
      ambiguousParents.push({ groupId: child.group.id, candidateParentGroupIds: candidates.map((candidate) => candidate.group.id) });
      continue;
    }
    if (resolution.selected) parentByGroup.set(child.group.id, resolution.selected.group.id);
  }

  const directNodesByGroup = new Map<string, string[]>();
  const groupResolution: GroupResolutionSummary = { assignedByBounds: 0, assignedByCenter: 0, ungrouped: 0, ambiguous: [], ambiguousParents };
  for (const entry of positioned.filter((item) => item.node.location === 'live')) {
    const boundsCandidates = supportedGroups.filter(({ rect }) => rectContains(rect, entry.rect));
    let mode: 'bounds' | 'center' = 'bounds';
    let resolution = resolveSmallestNestedGroup(boundsCandidates);
    if (!boundsCandidates.length) {
      mode = 'center';
      const centerX = entry.rect.x + entry.rect.width / 2;
      const centerY = entry.rect.y + entry.rect.height / 2;
      resolution = resolveSmallestNestedGroup(supportedGroups.filter(({ rect }) => pointInside(rect, centerX, centerY)));
    }
    if (resolution.ambiguous) {
      const candidates = mode === 'bounds'
        ? boundsCandidates
        : supportedGroups.filter(({ rect }) => pointInside(rect, entry.rect.x + entry.rect.width / 2, entry.rect.y + entry.rect.height / 2));
      groupResolution.ambiguous.push({ nodeId: entry.node.id, candidateGroupIds: candidates.map((candidate) => candidate.group.id), mode });
      continue;
    }
    if (!resolution.selected) {
      groupResolution.ungrouped++;
      continue;
    }
    const id = resolution.selected.group.id;
    directNodesByGroup.set(id, [...(directNodesByGroup.get(id) ?? []), entry.node.id]);
    if (mode === 'bounds') groupResolution.assignedByBounds++;
    else groupResolution.assignedByCenter++;
  }

  const groups: GroupSnapshot[] = supportedGroups.map(({ group, rect }) => {
    const memberNodeIds = directNodesByGroup.get(group.id) ?? [];
    const memberGroupIds = supportedGroups
      .filter((candidate) => parentByGroup.get(candidate.group.id) === group.id)
      .map((candidate) => candidate.group.id);
    const memberRects = memberNodeIds.map((nodeId) => nodeMap.get(nodeId)?.rect).filter((value): value is LayoutRect => Boolean(value));
    const childRects = memberGroupIds.map((id) => supportedGroups.find((candidate) => candidate.group.id === id)?.rect).filter((value): value is LayoutRect => Boolean(value));
    const contents = [...memberRects, ...childRects];
    const left = contents.length ? Math.min(...contents.map((item) => item.x)) : rect.x;
    const top = contents.length ? Math.min(...contents.map((item) => item.y)) : rect.y;
    const right = contents.length ? Math.max(...contents.map(rectRight)) : rectRight(rect);
    const bottom = contents.length ? Math.max(...contents.map(rectBottom)) : rectBottom(rect);
    return {
      id: group.id,
      index: group.index,
      name: group.name,
      originalBounds: rect,
      canonicalBounds: { ...rect, x: rect.x + originOffset.x, y: rect.y + originOffset.y },
      memberNodeIds,
      memberGroupIds,
      parentGroupId: parentByGroup.get(group.id),
      padding: {
        left: Math.max(0, left - rect.x),
        top: Math.max(0, top - rect.y),
        right: Math.max(0, rectRight(rect) - right),
        bottom: Math.max(0, rectBottom(rect) - bottom),
      },
    };
  });

  return { file, root, originOffset, nodes: nodeMap, groups, originalGroupOverlapKeys, unsupportedGroups, groupResolution };
}
