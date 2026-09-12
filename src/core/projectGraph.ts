import {
  isBiomeFile,
  isHytaleGeneratorInstanceFile,
  isWorldStructureFile,
  semanticFileStem,
  semanticReferencesFromFile,
  semanticRootName,
  semanticSymbolDependencies,
} from './semanticReferences.js';
import type { ProjectFile, ProjectModel, SemanticReference, SymbolKey } from './types.js';

export { isBiomeFile, isHytaleGeneratorInstanceFile, isWorldStructureFile } from './semanticReferences.js';

export type ProjectGraphNodeKind =
  | 'instance'
  | 'worldstructure'
  | 'worldstructure-density'
  | 'biome'
  | 'biome-density'
  | 'density-symbol'
  | 'unresolved-worldstructure'
  | 'unresolved-biome'
  | 'environment-resource'
  | 'unresolved-resource'
  | 'unresolved';
export type ProjectGraphEdgeKind =
  | 'instance-worldstructure'
  | 'uses-biome'
  | 'worldstructure-density'
  | 'biome-density'
  | 'density-dependency'
  | 'biome-environment';

export interface ProjectGraphNode {
  id: string;
  kind: ProjectGraphNodeKind;
  label: string;
  subtitle?: string;
  fileId?: string;
  symbolType?: string;
  symbolName?: string;
  resourcePath?: string;
  depth: number;
  unresolved?: boolean;
}

export interface ProjectGraphEdge {
  id: string;
  source: string;
  target: string;
  kind: ProjectGraphEdgeKind;
  label?: string;
}

export interface ProjectGraphRoot {
  fileId: string;
  label: string;
  path: string;
  kind: 'instance' | 'worldstructure';
}

export interface ProjectGraphModel {
  root?: ProjectGraphRoot;
  nodes: ProjectGraphNode[];
  edges: ProjectGraphEdge[];
  detectedInstanceCount: number;
  linkedInstanceCount: number;
  detectedWorldStructureCount: number;
  detectedBiomeCount: number;
  linkedBiomeCount: number;
  unresolvedDensityCount: number;
  maxDepth: number;
  notes: string[];
}

function instanceLabel(file: ProjectFile): string {
  const parts = file.path.replace(/\\/g, '/').split('/').filter(Boolean);
  const fileName = parts.at(-1)?.toLowerCase();
  if (fileName === 'instance.bson' && parts.length > 1) return parts.at(-2) ?? file.name;
  return semanticRootName(file) ?? semanticFileStem(file);
}

export function projectGraphRoots(project: ProjectModel): ProjectGraphRoot[] {
  const instances = project.files
    .filter(isHytaleGeneratorInstanceFile)
    .map((file) => ({ fileId: file.id, label: instanceLabel(file), path: file.path, kind: 'instance' as const }));
  const worldStructures = project.files
    .filter(isWorldStructureFile)
    .map((file) => ({ fileId: file.id, label: semanticRootName(file) ?? semanticFileStem(file), path: file.path, kind: 'worldstructure' as const }));
  return [...instances, ...worldStructures]
    .sort((a, b) => a.kind === b.kind ? a.label.localeCompare(b.label) : a.kind === 'instance' ? -1 : 1);
}

function uniqueEdgeId(source: string, target: string, kind: ProjectGraphEdgeKind): string {
  return `${kind}:${source}->${target}`;
}

function relationProblemSubtitle(reference: SemanticReference, targetType: string): string {
  if (reference.status === 'ambiguous') return `${reference.candidates.length} ${targetType} candidates match`;
  return `Referenced ${targetType} is not loaded or recognized`;
}

function firstResolvedFile(project: ProjectModel, reference: SemanticReference): ProjectFile | undefined {
  return reference.status === 'resolved' && reference.target.fileId
    ? project.fileMap.get(reference.target.fileId)
    : undefined;
}

function graphRelationNotes(reference: SemanticReference): string | undefined {
  if (reference.status === 'resolved') return undefined;
  if (reference.status === 'ambiguous') {
    return `${reference.relation} “${reference.target.name}” is ambiguous (${reference.candidates.length} matches).`;
  }
  return `${reference.relation} “${reference.target.name}” is unresolved.`;
}

export function buildProjectGraph(project: ProjectModel, rootFileId?: string, densityDepthLimit = 8, includeResources = false): ProjectGraphModel {
  const roots = projectGraphRoots(project);
  const root = roots.find((item) => item.fileId === rootFileId) ?? roots[0];
  const nodes = new Map<string, ProjectGraphNode>();
  const edges = new Map<string, ProjectGraphEdge>();
  const notes: string[] = [];
  const instances = project.files.filter(isHytaleGeneratorInstanceFile);
  const worldStructures = project.files.filter(isWorldStructureFile);
  const biomes = project.files.filter(isBiomeFile);
  const linkedInstanceCount = project.semanticReferences
    .filter((reference) => reference.relation === 'instance-worldstructure' && reference.status === 'resolved').length;

  const empty = (extraNotes: string[] = []): ProjectGraphModel => ({
    root,
    nodes: [],
    edges: [],
    detectedInstanceCount: instances.length,
    linkedInstanceCount,
    detectedWorldStructureCount: worldStructures.length,
    detectedBiomeCount: biomes.length,
    linkedBiomeCount: 0,
    unresolvedDensityCount: 0,
    maxDepth: 0,
    notes: extraNotes,
  });

  if (!root) return empty(['No HytaleGenerator Instance or WorldStructure file was detected in the loaded project.']);

  const selectedFile = project.fileMap.get(root.fileId);
  if (!selectedFile) return empty(['Selected flow root is unavailable.']);

  let worldStructure: ProjectFile | undefined;
  let worldNodeId: string;
  let worldDepth = 0;

  if (root.kind === 'instance') {
    const instanceId = `instance:${selectedFile.id}`;
    nodes.set(instanceId, { id: instanceId, kind: 'instance', label: root.label, subtitle: selectedFile.path, fileId: selectedFile.id, depth: 0 });
    const reference = semanticReferencesFromFile(project.semanticReferences, selectedFile.id, 'instance-worldstructure')[0];
    worldDepth = 1;
    if (!reference) {
      notes.push('The selected Instance has no semantic Instance → WorldStructure reference.');
      return { ...empty(notes), nodes: [...nodes.values()], maxDepth: 0 };
    }

    worldStructure = firstResolvedFile(project, reference);
    if (!worldStructure) {
      const unresolvedId = `world-unresolved:${reference.target.name.toLowerCase()}`;
      nodes.set(unresolvedId, {
        id: unresolvedId,
        kind: 'unresolved-worldstructure',
        label: reference.target.name,
        subtitle: relationProblemSubtitle(reference, 'WorldStructure'),
        depth: 1,
        unresolved: true,
      });
      const edgeId = uniqueEdgeId(instanceId, unresolvedId, 'instance-worldstructure');
      edges.set(edgeId, { id: edgeId, source: instanceId, target: unresolvedId, kind: 'instance-worldstructure', label: reference.target.name });
      const note = graphRelationNotes(reference);
      if (note) notes.push(note);
      return { ...empty(notes), nodes: [...nodes.values()], edges: [...edges.values()], maxDepth: 1 };
    }

    worldNodeId = `world:${worldStructure.id}`;
    nodes.set(worldNodeId, {
      id: worldNodeId,
      kind: 'worldstructure',
      label: semanticRootName(worldStructure) ?? semanticFileStem(worldStructure),
      subtitle: worldStructure.path,
      fileId: worldStructure.id,
      depth: worldDepth,
    });
    const edgeId = uniqueEdgeId(instanceId, worldNodeId, 'instance-worldstructure');
    edges.set(edgeId, { id: edgeId, source: instanceId, target: worldNodeId, kind: 'instance-worldstructure', label: reference.target.name });
  } else {
    worldStructure = selectedFile;
    worldNodeId = `world:${worldStructure.id}`;
    nodes.set(worldNodeId, { id: worldNodeId, kind: 'worldstructure', label: root.label, subtitle: worldStructure.path, fileId: worldStructure.id, depth: 0 });
  }

  const densityQueue: Array<{ symbol: string; depth: number }> = [];
  const bestDensityDepth = new Map<string, number>();

  const ensureDensityReference = (reference: SemanticReference, depth: number): string => {
    const symbol = reference.target.name;
    const id = `density:${symbol.toLowerCase()}`;
    const resolved = reference.status === 'resolved' && reference.target.fileId;
    const subtitle = reference.status === 'resolved'
      ? (reference.target.filePath?.split('/').at(-1) ?? reference.target.filePath)
      : reference.status === 'ambiguous'
        ? `${reference.candidates.length} Density definitions`
        : 'unresolved';
    const current = nodes.get(id);
    if (!current || depth < current.depth) nodes.set(id, {
      id,
      kind: resolved ? 'density-symbol' : 'unresolved',
      label: symbol,
      subtitle,
      symbolType: 'Density',
      symbolName: symbol,
      fileId: resolved ? reference.target.fileId : undefined,
      depth,
      unresolved: !resolved,
    });
    const previousDepth = bestDensityDepth.get(symbol.toLowerCase());
    if (resolved && (previousDepth === undefined || depth < previousDepth)) {
      bestDensityDepth.set(symbol.toLowerCase(), depth);
      densityQueue.push({ symbol, depth });
    }
    const note = graphRelationNotes(reference);
    if (note && !notes.includes(note)) notes.push(note);
    return id;
  };

  const worldFlowDepth = worldDepth + 1;
  const worldDensityReferences = semanticReferencesFromFile(project.semanticReferences, worldStructure.id, 'worldstructure-density');
  if (worldDensityReferences.length) {
    const densityFieldId = `world-density:${worldStructure.id}`;
    const worldLabel = semanticRootName(worldStructure) ?? semanticFileStem(worldStructure);
    nodes.set(densityFieldId, { id: densityFieldId, kind: 'worldstructure-density', label: `${worldLabel} Density`, subtitle: 'WorldStructure.Density', fileId: worldStructure.id, depth: worldFlowDepth });
    const fieldEdge = uniqueEdgeId(worldNodeId, densityFieldId, 'worldstructure-density');
    edges.set(fieldEdge, { id: fieldEdge, source: worldNodeId, target: densityFieldId, kind: 'worldstructure-density' });
    for (const reference of worldDensityReferences) {
      const targetId = ensureDensityReference(reference, worldFlowDepth + 1);
      const id = uniqueEdgeId(densityFieldId, targetId, 'density-dependency');
      edges.set(id, { id, source: densityFieldId, target: targetId, kind: 'density-dependency', label: reference.target.name });
    }
  }

  const linkedBiomeIds = new Set<string>();
  const biomeReferences = semanticReferencesFromFile(project.semanticReferences, worldStructure.id, 'worldstructure-biome');
  for (const reference of biomeReferences) {
    const biome = firstResolvedFile(project, reference);
    let biomeId: string;
    if (!biome) {
      biomeId = `biome-unresolved:${reference.target.name.toLowerCase()}`;
      nodes.set(biomeId, {
        id: biomeId,
        kind: 'unresolved-biome',
        label: reference.target.name,
        subtitle: relationProblemSubtitle(reference, 'Biome'),
        depth: worldFlowDepth,
        unresolved: true,
      });
      const note = graphRelationNotes(reference);
      if (note && !notes.includes(note)) notes.push(note);
    } else {
      linkedBiomeIds.add(biome.id);
      biomeId = `biome:${biome.id}`;
      const biomeLabel = semanticRootName(biome) ?? semanticFileStem(biome);
      nodes.set(biomeId, { id: biomeId, kind: 'biome', label: biomeLabel, subtitle: biome.path, fileId: biome.id, depth: worldFlowDepth });

      if (includeResources) {
        const environmentReferences = semanticReferencesFromFile(project.semanticReferences, biome.id, 'biome-environment');
        for (const environmentReference of environmentReferences) {
          const resourceKey = environmentReference.target.resourcePath ?? environmentReference.target.name;
          const resourceId = `environment:${resourceKey.toLowerCase()}`;
          const resolved = environmentReference.status === 'resolved' && Boolean(environmentReference.target.resourcePath);
          nodes.set(resourceId, {
            id: resourceId,
            kind: resolved ? 'environment-resource' : 'unresolved-resource',
            label: environmentReference.target.name,
            subtitle: resolved ? environmentReference.target.resourcePath : relationProblemSubtitle(environmentReference, 'Environment'),
            resourcePath: resolved ? environmentReference.target.resourcePath : undefined,
            depth: worldFlowDepth + 1,
            unresolved: !resolved,
          });
          edges.set(uniqueEdgeId(biomeId, resourceId, 'biome-environment'), { id: uniqueEdgeId(biomeId, resourceId, 'biome-environment'), source: biomeId, target: resourceId, kind: 'biome-environment', label: environmentReference.target.name });
          const resourceNote = graphRelationNotes(environmentReference);
          if (resourceNote && !notes.includes(resourceNote)) notes.push(resourceNote);
        }
      }

      const densityReferences = semanticReferencesFromFile(project.semanticReferences, biome.id, 'biome-density');
      if (densityReferences.length) {
        const densityId = `biome-density:${biome.id}`;
        nodes.set(densityId, { id: densityId, kind: 'biome-density', label: `${biomeLabel} Density`, subtitle: 'Biome Terrain.Density', fileId: biome.id, depth: worldFlowDepth + 1 });
        edges.set(uniqueEdgeId(biomeId, densityId, 'biome-density'), { id: uniqueEdgeId(biomeId, densityId, 'biome-density'), source: biomeId, target: densityId, kind: 'biome-density' });
        for (const densityReference of densityReferences) {
          const targetId = ensureDensityReference(densityReference, worldFlowDepth + 2);
          const id = uniqueEdgeId(densityId, targetId, 'density-dependency');
          edges.set(id, { id, source: densityId, target: targetId, kind: 'density-dependency', label: densityReference.target.name });
        }
      }
    }
    const edgeId = uniqueEdgeId(worldNodeId, biomeId, 'uses-biome');
    edges.set(edgeId, { id: edgeId, source: worldNodeId, target: biomeId, kind: 'uses-biome', label: reference.target.name });
  }

  if (biomeReferences.length === 0 && biomes.length > 0) {
    notes.push('No semantic WorldStructure → Biome references were extracted from Biome/DefaultBiome fields.');
  }

  const densityExpansionStart = worldFlowDepth + 2;
  for (let index = 0; index < densityQueue.length; index += 1) {
    const { symbol, depth } = densityQueue[index];
    if (depth >= densityExpansionStart + Math.max(0, densityDepthLimit)) continue;
    const sourceKey: SymbolKey = { symbolType: 'Density', name: symbol };
    const dependencies = semanticSymbolDependencies(project.semanticReferences, sourceKey, 'Density');
    const sourceId = `density:${symbol.toLowerCase()}`;
    for (const reference of dependencies) {
      if (reference.target.name.toLowerCase() === symbol.toLowerCase()) continue;
      const targetId = ensureDensityReference(reference, depth + 1);
      const id = uniqueEdgeId(sourceId, targetId, 'density-dependency');
      edges.set(id, { id, source: sourceId, target: targetId, kind: 'density-dependency', label: reference.target.name });
    }
  }

  const nodeList = [...nodes.values()].sort((a, b) => a.depth - b.depth || a.label.localeCompare(b.label));
  const edgeList = [...edges.values()];
  return {
    root,
    nodes: nodeList,
    edges: edgeList,
    detectedInstanceCount: instances.length,
    linkedInstanceCount,
    detectedWorldStructureCount: worldStructures.length,
    detectedBiomeCount: biomes.length,
    linkedBiomeCount: linkedBiomeIds.size,
    unresolvedDensityCount: nodeList.filter((node) => node.kind === 'unresolved' && node.symbolType === 'Density').length,
    maxDepth: nodeList.reduce((max, node) => Math.max(max, node.depth), 0),
    notes,
  };
}
