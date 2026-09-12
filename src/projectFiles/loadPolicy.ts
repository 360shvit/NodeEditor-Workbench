import { inventoryResourceDescriptor, inventoryResourceReferenceCountIndex, type InventoryResourceDescriptor, type ProjectFile, type SemanticReference } from '../core';
import type { DesktopSemanticFileInfo } from '../io/desktopBridge';

export type ProjectFileLoadMode = 'semantic-json' | 'semantic-structured' | 'raw-text' | 'metadata-only';
export type ProjectFileRole =
  | 'graph-document'
  | 'flow-orchestrator'
  | 'flow-entrypoint'
  | 'runtime-config'
  | 'known-json'
  | 'unknown-json'
  | 'workspace-config'
  | 'other';


export const EXPLORER_SCOPE_WORKBENCH_KNOWN = '__workbench_known__';
export const EXPLORER_SCOPE_RECOGNIZED = '__recognized__';
export const EXPLORER_SCOPE_RESOURCES = '__resources__';
export const EXPLORER_SCOPE_INVENTORY_ONLY = '__inventory_only__';

export function isExplorerSystemScope(value: string | undefined): boolean {
  return value === EXPLORER_SCOPE_WORKBENCH_KNOWN
    || value === EXPLORER_SCOPE_RECOGNIZED
    || value === EXPLORER_SCOPE_RESOURCES
    || value === EXPLORER_SCOPE_INVENTORY_ONLY;
}

export function explorerScopeLabel(value: string): string | undefined {
  if (value === EXPLORER_SCOPE_WORKBENCH_KNOWN) return 'Workbench known';
  if (value === EXPLORER_SCOPE_RECOGNIZED) return 'Semantic files';
  if (value === EXPLORER_SCOPE_RESOURCES) return 'Known resources';
  if (value === EXPLORER_SCOPE_INVENTORY_ONLY) return 'Inventory-only load state';
  return undefined;
}

export interface ProjectLoadRule {
  id: string;
  match: 'path-prefix' | 'path-segment' | 'extension' | 'file-name';
  value: string;
  mode: ProjectFileLoadMode;
}

export interface ProjectFileDescriptor {
  path: string;
  name: string;
  extension: string;
  loadMode: ProjectFileLoadMode;
  /** Semantic detector/parser role. Orthogonal to resource role and current load state. */
  role: ProjectFileRole;
  /** Known inventory resource identity. Resource files may intentionally remain inventory-only. */
  resourceRole?: 'environment' | 'prefab';
  resourceName?: string;
  resourceReferenceCount: number;
  inventoryOnly: boolean;
  workbenchKnown: boolean;
  format: string;
  domain?: string;
  discoverySource?: string;
  relevantToGraphFlow: boolean;
  semanticFile?: ProjectFile;
  semanticInfo?: DesktopSemanticFileInfo;
}

const KNOWN_SEMANTIC_SEGMENTS = new Set([
  'assignment', 'assignments', 'blockmask', 'blockmasks', 'density', 'densities',
  'biome', 'biomes', 'graph', 'graphs', 'graphprovider', 'settings',
  'worldstructure', 'worldstructures',
]);

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

export function projectPathFileName(path: string): string {
  return normalize(path).split('/').filter(Boolean).at(-1) ?? path;
}

export function projectPathDirectory(path: string): string {
  const normalized = normalize(path);
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(0, index) : '';
}

export function projectPathExtension(path: string): string {
  const name = projectPathFileName(path);
  const index = name.lastIndexOf('.');
  return index > 0 ? name.slice(index).toLowerCase() : '';
}

export function isWorkspaceMarker(path: string): boolean {
  return projectPathFileName(path).toLowerCase() === '_workspace.json';
}

function normalizedSegment(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function underDirectory(path: string, directory: string): boolean {
  const normalizedPath = normalize(path).toLowerCase();
  const normalizedDirectory = normalize(directory).toLowerCase();
  return !normalizedDirectory || normalizedPath === normalizedDirectory || normalizedPath.startsWith(`${normalizedDirectory}/`);
}

function ruleMatches(path: string, rule: ProjectLoadRule): boolean {
  const normalizedPath = normalize(path).toLowerCase();
  const value = rule.value.trim().toLowerCase();
  if (!value) return false;
  if (rule.match === 'path-prefix') return normalizedPath === value || normalizedPath.startsWith(`${value.replace(/\/+$/, '')}/`);
  if (rule.match === 'path-segment') return normalizedPath.split('/').includes(value);
  if (rule.match === 'extension') return projectPathExtension(normalizedPath) === (value.startsWith('.') ? value : `.${value}`);
  return projectPathFileName(normalizedPath) === value;
}

/**
 * Browser/default candidate policy. Native desktop scans use the detector result returned
 * by Rust as the semantic authority. User rules remain an optional future browser layer.
 */
export function loadModeForProjectPath(
  path: string,
  selectedRootLabel: string,
  workspaceMarkerDirectories: string[],
  userRules: ProjectLoadRule[] = [],
): ProjectFileLoadMode {
  for (const rule of userRules) {
    if (ruleMatches(path, rule)) return rule.mode;
  }

  if (projectPathExtension(path) !== '.json') return 'metadata-only';
  if (isWorkspaceMarker(path)) return 'semantic-json';

  const root = normalizedSegment(selectedRootLabel);
  const segments = normalize(path).split('/').map(normalizedSegment);
  if (root === 'hytalegenerator' || KNOWN_SEMANTIC_SEGMENTS.has(root)) return 'semantic-json';
  if (segments.includes('hytalegenerator') || segments.some((segment) => KNOWN_SEMANTIC_SEGMENTS.has(segment))) return 'semantic-json';
  if (workspaceMarkerDirectories.some((directory) => underDirectory(path, directory))) return 'semantic-json';
  return 'metadata-only';
}

function roleFromNativeInfo(info: DesktopSemanticFileInfo): ProjectFileRole {
  switch (info.role) {
    case 'graph-document': return 'graph-document';
    case 'flow-orchestrator': return 'flow-orchestrator';
    case 'flow-entrypoint': return 'flow-entrypoint';
    case 'runtime-config': return 'runtime-config';
    case 'workspace-config': return 'workspace-config';
    default: return 'known-json';
  }
}

function fallbackRole(path: string, semanticFile: ProjectFile | undefined): ProjectFileRole {
  if (isWorkspaceMarker(path)) return 'workspace-config';
  if (!semanticFile) return projectPathExtension(path) === '.json' ? 'unknown-json' : 'other';
  if (semanticFile.workspace.id === 'worldstructure') return 'flow-orchestrator';
  if (semanticFile.workspace.id === 'settings') return 'runtime-config';
  if (semanticFile.nodes.length > 0) return 'graph-document';
  return 'known-json';
}


export function descriptorMatchesExplorerScope(descriptor: ProjectFileDescriptor, workspaceFilter: string): boolean {
  if (workspaceFilter === 'all') return true;
  if (workspaceFilter === EXPLORER_SCOPE_WORKBENCH_KNOWN) return descriptor.workbenchKnown;
  if (workspaceFilter === EXPLORER_SCOPE_RECOGNIZED) return Boolean(descriptor.semanticFile);
  if (workspaceFilter === EXPLORER_SCOPE_RESOURCES) return Boolean(descriptor.resourceRole);
  if (workspaceFilter === EXPLORER_SCOPE_INVENTORY_ONLY) return descriptor.inventoryOnly;
  return descriptor.semanticFile?.workspace.id === workspaceFilter;
}

export interface ProjectFileDescriptorBuildProfiler {
  phase<T>(name: string, work: () => T, data?: Record<string, unknown>): T;
}

export function buildProjectFileDescriptors(
  paths: Iterable<string>,
  selectedRootLabel: string,
  semanticFiles: ProjectFile[],
  semanticInfo?: Map<string, DesktopSemanticFileInfo>,
  semanticReferences: Iterable<SemanticReference> = [],
  profiler?: ProjectFileDescriptorBuildProfiler,
): ProjectFileDescriptor[] {
  const phase = <T>(name: string, work: () => T, data?: Record<string, unknown>): T => profiler
    ? profiler.phase(name, work, data)
    : work();

  const { markerDirectories, unique } = phase('paths', () => {
    // `paths` may be a one-shot iterator (for example Map.keys()). Materialize it once.
    const materialized = [...paths].map(normalize).filter(Boolean);
    return {
      markerDirectories: materialized.filter(isWorkspaceMarker).map(projectPathDirectory),
      unique: [...new Set(materialized)].sort((a, b) => a.localeCompare(b)),
    };
  });

  const { fileByPath, infoByPath } = phase('semantic-indexes', () => ({
    fileByPath: new Map(semanticFiles.map((file) => [normalize(file.path), file])),
    infoByPath: new Map([...(semanticInfo ?? new Map()).entries()].map(([path, info]) => [normalize(path), info])),
  }), { semanticFiles: semanticFiles.length });

  const resourcesByPath = phase('resource-classify', () => {
    const output = new Map<string, InventoryResourceDescriptor>();
    for (const path of unique) {
      const resource = inventoryResourceDescriptor(path);
      if (resource) output.set(path, resource);
    }
    return output;
  }, { inventoryFiles: unique.length });

  const resourceReferenceCounts = phase('resource-reference-index', () =>
    inventoryResourceReferenceCountIndex(resourcesByPath.values(), semanticReferences),
  { resourceFiles: resourcesByPath.size });

  return phase('materialize', () => unique.map((path) => {
    const semanticFile = fileByPath.get(path);
    const info = infoByPath.get(path);
    const extension = projectPathExtension(path);
    const name = projectPathFileName(path);
    const role = info ? roleFromNativeInfo(info) : fallbackRole(path, semanticFile);
    const resource = resourcesByPath.get(path);
    const resourceReferenceCount = resource ? (resourceReferenceCounts.get(normalize(resource.path).toLowerCase()) ?? 0) : 0;
    const fallbackLoadMode = loadModeForProjectPath(path, selectedRootLabel, markerDirectories);
    const loadMode: ProjectFileLoadMode = semanticFile
      ? (info && info.format !== 'structured-json' && info.format !== 'node-editor' ? 'semantic-structured' : 'semantic-json')
      : fallbackLoadMode === 'semantic-json' && !semanticFile ? 'metadata-only' : fallbackLoadMode;
    return {
      path,
      name,
      extension,
      loadMode,
      role,
      resourceRole: resource?.kind,
      resourceName: resource?.name,
      resourceReferenceCount,
      inventoryOnly: !semanticFile,
      workbenchKnown: Boolean(semanticFile || resource),
      format: info?.format ?? (semanticFile ? 'structured-json' : 'unknown'),
      domain: info?.domain,
      discoverySource: info?.discoverySource,
      relevantToGraphFlow: role === 'graph-document' || role === 'flow-orchestrator' || role === 'flow-entrypoint',
      semanticFile,
      semanticInfo: info,
    };
  }), { inventoryFiles: unique.length, resourceFiles: resourcesByPath.size });
}

