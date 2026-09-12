import { visualSpecForNode } from '../geometry/resolver.js';
import { buildEditorMetadataForFile } from '../graph/editorMetadata.js';
import type { ProjectFile, ProjectNode } from '../types.js';

export type LayoutRelationRole = 'flow' | 'attachment' | 'ordered-attachment' | 'structural';

export interface LayoutReaderV2Node {
  id: string;
  nodeKind: string;
  type: string;
  location: ProjectNode['location'];
  authorPosition?: { x: number; y: number };
  outputConnectionTypes: string[];
}

export interface LayoutReaderV2Edge {
  parentId: string;
  childId: string;
  field?: string;
  index?: number;
  role: LayoutRelationRole;
  ordered: boolean;
  connectionType?: string;
  parentPortId?: string;
  parentPortLabel?: string;
  authorDelta?: { x: number; y: number };
  confidence: 'catalog' | 'heuristic' | 'structural';
  reason: string;
}

export interface LayoutReaderV2Stats {
  nodes: number;
  positionedNodes: number;
  roots: number;
  edges: number;
  flowEdges: number;
  attachmentEdges: number;
  orderedAttachmentEdges: number;
  structuralEdges: number;
  structuralForks: number;
  flowForks: number;
  attachmentFamilies: number;
  mixedParents: number;
  multiPortParents: number;
  unknownPortRelations: number;
  duplicateStructuralNodeIds: number;
}

export interface LayoutReaderV2Graph {
  fileId: string;
  filePath: string;
  nodes: Map<string, LayoutReaderV2Node>;
  edges: LayoutReaderV2Edge[];
  roots: string[];
  stats: LayoutReaderV2Stats;
  warnings: string[];
}

function pathIsAncestor(parent: Array<string | number>, child: Array<string | number>): boolean {
  if (parent.length >= child.length) return false;
  for (let i = 0; i < parent.length; i++) if (parent[i] !== child[i]) return false;
  return true;
}

function relationParts(parent: ProjectNode, child: ProjectNode): { field?: string; index?: number } {
  const relative = child.jsonPath.slice(parent.jsonPath.length);
  const fieldIndex = relative.findIndex((part) => typeof part === 'string');
  if (fieldIndex < 0) return {};
  const field = relative[fieldIndex] as string;
  const index = relative.slice(fieldIndex + 1).find((part): part is number => typeof part === 'number');
  return { field, index };
}

function token(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pinMatchScore(id: string, label: string, field: string): number {
  const f = token(field);
  const i = token(id);
  const l = token(label);
  if (!f) return 0;
  if (i === f) return 100;
  if (l === f) return 95;
  if (f === 'inputs' && (i.endsWith('inputs') || l === 'inputs')) return 90;
  if (i.endsWith(f) || i.startsWith(f)) return 80;
  if (l.endsWith(f) || l.startsWith(f)) return 75;
  if (i.includes(f) || l.includes(f)) return 60;
  return 0;
}

function valueLikeNode(node: ProjectNode): boolean {
  const kind = node.nodeKind;
  return kind.startsWith('CurvePoint.')
    || kind.startsWith('Key.')
    || kind.startsWith('Decimal.')
    || kind.startsWith('Material-')
    || kind.startsWith('Delimiter.');
}

function classifyRelation(parent: ProjectNode, child: ProjectNode, field?: string, index?: number): Omit<LayoutReaderV2Edge, 'parentId' | 'childId' | 'field' | 'index' | 'authorDelta'> {
  const parentSpec = visualSpecForNode(parent);
  const childSpec = visualSpecForNode(child);
  const orderedByPath = index !== undefined;

  if (field && parentSpec) {
    const scored = parentSpec.rightPins
      .map((pin) => ({ pin, score: pinMatchScore(pin.id, pin.label, field) }))
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best?.score > 0) {
      const outputTypes = new Set(parentSpec.leftPins.map((pin) => pin.type));
      const sameDomain = outputTypes.has(best.pin.type);
      const ordered = orderedByPath || best.pin.multiple;
      if (sameDomain) {
        return {
          role: 'flow',
          ordered,
          connectionType: best.pin.type,
          parentPortId: best.pin.id,
          parentPortLabel: best.pin.label,
          confidence: 'catalog',
          reason: `catalog port ${best.pin.id} matches ${field}; connection type stays in parent output domain`,
        };
      }
      return {
        role: ordered ? 'ordered-attachment' : 'attachment',
        ordered,
        connectionType: best.pin.type,
        parentPortId: best.pin.id,
        parentPortLabel: best.pin.label,
        confidence: 'catalog',
        reason: `catalog port ${best.pin.id} matches ${field}; connection type switches from parent output domain`,
      };
    }
  }

  // Some Hytale JSON fields use semantic aliases that are not the visual pin
  // label (for example ThicknessFunctionXZ -> DensityPin). If the field name
  // misses but the child's output connection domain matches exactly one parent
  // input connection type, the catalog still gives us an unambiguous relation.
  if (parentSpec && childSpec) {
    const childOutputTypes = new Set(childSpec.leftPins.map((pin) => pin.type));
    const compatiblePins = parentSpec.rightPins.filter((pin) => childOutputTypes.has(pin.type));
    const compatibleTypes = [...new Set(compatiblePins.map((pin) => pin.type))];
    if (compatibleTypes.length === 1) {
      const connectionType = compatibleTypes[0];
      const matchingPins = compatiblePins.filter((pin) => pin.type === connectionType);
      const uniquePin = matchingPins.length === 1 ? matchingPins[0] : undefined;
      const outputTypes = new Set(parentSpec.leftPins.map((pin) => pin.type));
      const sameDomain = outputTypes.has(connectionType);
      const ordered = orderedByPath || matchingPins.some((pin) => pin.multiple);
      return {
        role: sameDomain ? 'flow' : (ordered ? 'ordered-attachment' : 'attachment'),
        ordered,
        connectionType,
        parentPortId: uniquePin?.id,
        parentPortLabel: uniquePin?.label,
        confidence: 'catalog',
        reason: field
          ? `catalog connection type ${connectionType} resolves alias field ${field}`
          : `catalog connection type ${connectionType} uniquely matches child output domain`,
      };
    }
  }

  // Unknown or legacy visual specs: keep a conservative semantic distinction
  // for obvious value/collection nodes, but never pretend this is exact.
  const ordered = orderedByPath;
  if (valueLikeNode(child)) {
    return {
      role: ordered ? 'ordered-attachment' : 'attachment',
      ordered,
      connectionType: childSpec?.leftPins[0]?.type,
      confidence: 'heuristic',
      reason: 'value-like child without a resolved parent catalog port',
    };
  }

  return {
    role: 'structural',
    ordered,
    connectionType: childSpec?.leftPins[0]?.type,
    confidence: 'structural',
    reason: field ? `no catalog port matched structural field ${field}` : 'no structural field could be resolved',
  };
}

/**
 * Semantic layout reader v2.
 *
 * It deliberately separates structural ownership from layout relation meaning:
 * every nested node still has one structural owner, but the edge is classified
 * as same-domain flow, typed attachment, ordered attachment, or unresolved
 * structural relation. Existing $Position values are retained as author-sketch
 * evidence rather than being interpreted as graph topology.
 */
export function readLayoutGraphV2(
  file: ProjectFile,
  location: ProjectNode['location'] = 'live',
  options: { positionedOnly?: boolean } = {},
): LayoutReaderV2Graph {
  const metadata = buildEditorMetadataForFile(file);
  const sourceNodes = file.nodes.filter((node) => node.location === location
    && (!options.positionedOnly || Boolean(metadata.nodes.get(node.id)?.position)));
  const orderedNodes = [...sourceNodes].sort((a, b) => a.jsonPath.length - b.jsonPath.length);
  const nodes = new Map<string, LayoutReaderV2Node>();
  const idCounts = new Map<string, number>();

  for (const node of sourceNodes) {
    idCounts.set(node.id, (idCounts.get(node.id) ?? 0) + 1);
    const spec = visualSpecForNode(node);
    const position = metadata.nodes.get(node.id)?.position;
    nodes.set(node.id, {
      id: node.id,
      nodeKind: node.nodeKind,
      type: node.type,
      location: node.location,
      authorPosition: position ? { x: position.x, y: position.y } : undefined,
      outputConnectionTypes: [...new Set(spec?.leftPins.map((pin) => pin.type) ?? [])],
    });
  }

  const edges: LayoutReaderV2Edge[] = [];
  const parentByChild = new Map<string, string>();
  for (const child of orderedNodes) {
    let parent: ProjectNode | undefined;
    for (const candidate of orderedNodes) {
      if (candidate.id === child.id || candidate.location !== child.location) continue;
      if (!pathIsAncestor(candidate.jsonPath, child.jsonPath)) continue;
      if (!parent || candidate.jsonPath.length > parent.jsonPath.length) parent = candidate;
    }
    if (!parent) continue;
    parentByChild.set(child.id, parent.id);
    const { field, index } = relationParts(parent, child);
    const semantic = classifyRelation(parent, child, field, index);
    const parentPosition = metadata.nodes.get(parent.id)?.position;
    const childPosition = metadata.nodes.get(child.id)?.position;
    edges.push({
      parentId: parent.id,
      childId: child.id,
      field,
      index,
      ...semantic,
      authorDelta: parentPosition && childPosition
        ? { x: childPosition.x - parentPosition.x, y: childPosition.y - parentPosition.y }
        : undefined,
    });
  }

  const roots = orderedNodes.filter((node) => !parentByChild.has(node.id)).map((node) => node.id);
  const edgesByParent = new Map<string, LayoutReaderV2Edge[]>();
  for (const edge of edges) edgesByParent.set(edge.parentId, [...(edgesByParent.get(edge.parentId) ?? []), edge]);
  const structuralForks = [...edgesByParent.values()].filter((items) => items.length >= 2).length;
  const flowForks = [...edgesByParent.values()].filter((items) => items.filter((edge) => edge.role === 'flow').length >= 2).length;
  const attachmentFamilies = [...edgesByParent.values()].filter((items) => items.some((edge) => edge.role === 'attachment' || edge.role === 'ordered-attachment')).length;
  const mixedParents = [...edgesByParent.values()].filter((items) => {
    const hasFlow = items.some((edge) => edge.role === 'flow');
    const hasAttachment = items.some((edge) => edge.role === 'attachment' || edge.role === 'ordered-attachment');
    return hasFlow && hasAttachment;
  }).length;
  const multiPortParents = [...edgesByParent.values()].filter((items) => new Set(items.map((edge) => edge.parentPortId).filter(Boolean)).size >= 2).length;
  const duplicateStructuralNodeIds = [...idCounts.values()].filter((count) => count > 1).length;
  const warnings: string[] = [];
  if (duplicateStructuralNodeIds) warnings.push(`${duplicateStructuralNodeIds} structurally duplicated node id(s) detected in ${location} graph`);
  const unknownPortRelations = edges.filter((edge) => edge.role === 'structural').length;
  if (unknownPortRelations) warnings.push(`${unknownPortRelations} structural edge(s) could not be mapped to a catalog port`);

  const stats: LayoutReaderV2Stats = {
    nodes: sourceNodes.length,
    positionedNodes: sourceNodes.filter((node) => Boolean(metadata.nodes.get(node.id)?.position)).length,
    roots: roots.length,
    edges: edges.length,
    flowEdges: edges.filter((edge) => edge.role === 'flow').length,
    attachmentEdges: edges.filter((edge) => edge.role === 'attachment').length,
    orderedAttachmentEdges: edges.filter((edge) => edge.role === 'ordered-attachment').length,
    structuralEdges: edges.filter((edge) => edge.role === 'structural').length,
    structuralForks,
    flowForks,
    attachmentFamilies,
    mixedParents,
    multiPortParents,
    unknownPortRelations,
    duplicateStructuralNodeIds,
  };

  return { fileId: file.id, filePath: file.path, nodes, edges, roots, stats, warnings };
}
