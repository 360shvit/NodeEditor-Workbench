import type { JsonObject, JsonValue, WorkspaceInfo } from './types.js';

const KNOWN_LABELS = new Map<string, string>([
  ['density', 'Density'],
  ['densities', 'Density'],
  ['biome', 'Biome'],
  ['biomes', 'Biome'],
  ['settings', 'Settings'],
  ['worldstructure', 'WorldStructure'],
  ['worldstructures', 'WorldStructure'],
]);

function normalizeWorkspaceId(segment: string): string {
  const normalized = segment.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (normalized === 'densities') return 'density';
  if (normalized === 'biomes') return 'biome';
  if (normalized === 'worldstructures') return 'worldstructure';
  return normalized || 'unknown';
}

function prettySegment(segment: string): string {
  const id = normalizeWorkspaceId(segment);
  const known = KNOWN_LABELS.get(segment.toLowerCase()) ?? KNOWN_LABELS.get(id);
  if (known) return known;
  return segment
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripHytaleGeneratorPrefix(value: string): string {
  return value.replace(/^hytale\s*generator\s*[-:–—]\s*/i, '').trim();
}

export function unknownWorkspace(): WorkspaceInfo {
  return { id: 'unknown', label: 'Unknown', source: 'path', worldgen: false };
}

export function workspaceFromSegment(segment: string, source: WorkspaceInfo['source'] = 'path'): WorkspaceInfo {
  return {
    id: normalizeWorkspaceId(segment),
    label: prettySegment(segment),
    source,
    matchedSegment: segment,
    worldgen: true,
  };
}

/** Normalize native NodeEditor workspace labels such as "HytaleGenerator - Biome". */
export function workspaceFromNativeId(rawId: string, source: WorkspaceInfo['source'] = 'content'): WorkspaceInfo {
  const normalized = rawId.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  const special = normalized === 'worldgenbiome'
    ? 'Biome'
    : normalized === 'worldgengraphprovider'
      ? 'GraphProvider'
      : undefined;
  const segment = special ?? (stripHytaleGeneratorPrefix(rawId) || rawId);
  const workspace = workspaceFromSegment(segment, source);
  return {
    ...workspace,
    matchedSegment: rawId,
    worldgen: /^hytale\s*generator\s*[-:–—]/i.test(rawId) || normalized.startsWith('worldgen') || workspace.worldgen,
  };
}

/**
 * NodeEditor files can carry their workspace directly in
 * $NodeEditorMetadata.$WorkspaceID (for example "HytaleGenerator - Biome").
 * Prefer this over folder naming when it is available.
 */
export function workspaceFromMetadata(raw: JsonValue): WorkspaceInfo | undefined {
  if (!isObject(raw)) return undefined;
  const direct = raw.$WorkspaceID;
  if (typeof direct === 'string' && direct.trim()) return workspaceFromNativeId(direct, 'content');
  const metadata = raw.$NodeEditorMetadata;
  if (!isObject(metadata)) return undefined;
  const rawId = metadata.$WorkspaceID;
  if (typeof rawId !== 'string' || !rawId.trim()) return undefined;
  return workspaceFromNativeId(rawId, 'content');
}

function workspaceFromKnownPathSegment(path: string): WorkspaceInfo | undefined {
  const segments = path.replace(/\\/g, '/').split('/').filter(Boolean);
  // Prefer the closest semantic folder to the file so full-mod roots such as
  // Server/.../Biome/... work even when they are not below HytaleGenerator.
  for (let index = segments.length - 2; index >= 0; index -= 1) {
    const segment = segments[index];
    const id = normalizeWorkspaceId(segment);
    if (KNOWN_LABELS.has(segment.toLowerCase()) || KNOWN_LABELS.has(id)) return workspaceFromSegment(segment);
  }
  return undefined;
}

/**
 * Path fallback used for files that do not declare $WorkspaceID.
 * Server/HytaleGenerator/<Workspace>/... keeps the historic dynamic behavior,
 * while known semantic folders are accepted anywhere in a larger mod tree.
 */
export function detectWorkspace(path: string, raw?: JsonValue): WorkspaceInfo {
  const contentWorkspace = raw === undefined ? undefined : workspaceFromMetadata(raw);
  if (contentWorkspace) return contentWorkspace;

  const segments = path.replace(/\\/g, '/').split('/').filter(Boolean);
  const hytaleGeneratorIndex = segments.findIndex((segment) => segment.toLowerCase() === 'hytalegenerator');
  if (hytaleGeneratorIndex >= 0 && segments[hytaleGeneratorIndex + 1]) {
    return workspaceFromSegment(segments[hytaleGeneratorIndex + 1]);
  }

  const known = workspaceFromKnownPathSegment(path);
  if (known) return known;
  return unknownWorkspace();
}

/** Used when the user directly opens HytaleGenerator/Density, /Biomes, /Settings, ... */
export function workspaceHintFromSelectedRoot(rootName: string): WorkspaceInfo | undefined {
  const id = normalizeWorkspaceId(rootName);
  const knownRoot = ['density', 'biome', 'settings', 'worldstructure'].includes(id);
  return knownRoot ? workspaceFromSegment(rootName) : undefined;
}

export function workspaceLabel(workspace: WorkspaceInfo | string): string {
  if (typeof workspace !== 'string') return workspace.label;
  return KNOWN_LABELS.get(workspace) ?? prettySegment(workspace);
}

export function workspaceCssClass(workspace: WorkspaceInfo): string {
  return `workspace-${workspace.id.replace(/[^a-z0-9-]/g, '-')}`;
}
