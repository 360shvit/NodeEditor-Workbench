import { jsonPathKey } from './jsonPath.js';
import type {
  JsonObject,
  JsonValue,
  ProjectFile,
  SemanticReference,
  SemanticReferenceCandidate,
  SemanticReferenceRelation,
  SemanticReferenceSource,
  SemanticReferenceStatus,
  SemanticReferenceTarget,
  SymbolKey,
  SymbolOccurrence,
  SymbolRecord,
} from './types.js';

export interface SemanticReferenceExtractorContext {
  files: ProjectFile[];
  fileMap: Map<string, ProjectFile>;
  symbolIndex: Map<string, SymbolRecord>;
  inventoryPaths: string[];
  resourceIndex: SemanticResourceIndex;
}

export interface SemanticReferenceExtractor {
  /** Stable, versioned id. New Hytale schemas should add a new extractor instead of mutating old semantics in place. */
  id: string;
  extract(context: SemanticReferenceExtractorContext): SemanticReference[];
}

export class SemanticReferenceExtractorRegistry {
  private readonly extractors: SemanticReferenceExtractor[] = [];

  register(extractor: SemanticReferenceExtractor): this {
    this.extractors.push(extractor);
    return this;
  }

  all(): readonly SemanticReferenceExtractor[] {
    return this.extractors;
  }

  extract(context: SemanticReferenceExtractorContext): SemanticReference[] {
    const references = this.extractors.flatMap((extractor) => extractor.extract(context));
    return [...new Map(references.map((reference) => [reference.id, reference])).values()]
      .sort((a, b) => a.source.filePath.localeCompare(b.source.filePath)
        || a.relation.localeCompare(b.relation)
        || a.target.name.localeCompare(b.target.name));
  }
}

function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stem(value: string): string {
  const normalized = value.replace(/\\/g, '/').trim().replace(/[?#].*$/, '');
  const tail = normalized.split('/').filter(Boolean).at(-1) ?? normalized;
  return tail.replace(/\.(?:json|bson)$/i, '').trim().toLowerCase();
}

export function semanticFileStem(file: ProjectFile): string {
  return stem(file.name);
}

export function semanticRootName(file: ProjectFile): string | undefined {
  if (!isObject(file.raw)) return undefined;
  const value = file.raw.Name;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function rootExportName(file: ProjectFile): string | undefined {
  if (!isObject(file.raw)) return undefined;
  const value = file.raw.ExportAs;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function rootNodeId(file: ProjectFile): string | undefined {
  if (!isObject(file.raw)) return undefined;
  const value = file.raw.$NodeId;
  return typeof value === 'string' ? value : undefined;
}

function workspaceMatches(file: ProjectFile, expected: string): boolean {
  return file.workspace.id.toLowerCase() === expected.toLowerCase()
    || file.workspace.label.toLowerCase() === expected.toLowerCase();
}

function valueHasKeys(value: JsonValue, keys: string[]): boolean {
  if (!isObject(value)) return false;
  return keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

export function isHytaleGeneratorInstanceFile(file: ProjectFile): boolean {
  if (!isObject(file.raw)) return false;
  const worldGen = file.raw.WorldGen;
  return isObject(worldGen)
    && typeof worldGen.Type === 'string'
    && worldGen.Type.toLowerCase() === 'hytalegenerator'
    && typeof worldGen.WorldStructure === 'string'
    && worldGen.WorldStructure.trim().length > 0;
}

export function isWorldStructureFile(file: ProjectFile): boolean {
  const nodeId = rootNodeId(file)?.toLowerCase() ?? '';
  return valueHasKeys(file.raw, ['DefaultBiome', 'Density', 'Framework'])
    || workspaceMatches(file, 'worldstructure')
    || nodeId === 'worldstructure'
    || nodeId.endsWith('.worldstructure')
    || file.path.toLowerCase().split(/[\\/]/).some((segment) => /^worldstructures?$/.test(segment));
}

export function isBiomeFile(file: ProjectFile): boolean {
  const nodeId = rootNodeId(file)?.toLowerCase() ?? '';
  return workspaceMatches(file, 'biome')
    || nodeId === 'biome'
    || nodeId.endsWith('.biome')
    || file.path.toLowerCase().split(/[\\/]/).some((segment) => /^biomes?$/.test(segment));
}

export function isBlockMaskFile(file: ProjectFile): boolean {
  const workspaceId = file.workspace.id.toLowerCase().replace(/[^a-z0-9]/g, '');
  const workspaceLabel = file.workspace.label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return workspaceId === 'blockmask'
    || workspaceLabel.includes('blockmask')
    || file.path.toLowerCase().split(/[\\/]/).some((segment) => /^blockmasks?$/.test(segment));
}

export function semanticAliasesForFile(file: ProjectFile): string[] {
  const aliases = new Set<string>([semanticFileStem(file)]);
  const name = semanticRootName(file);
  const exportName = rootExportName(file);
  if (name) aliases.add(stem(name));
  if (exportName) aliases.add(stem(exportName));
  return [...aliases].filter(Boolean);
}

function fileCandidate(file: ProjectFile): SemanticReferenceCandidate {
  return {
    fileId: file.id,
    filePath: file.path,
    label: semanticRootName(file) ?? rootExportName(file) ?? file.name,
  };
}

function occurrenceCandidate(occurrence: SymbolOccurrence): SemanticReferenceCandidate {
  return {
    fileId: occurrence.fileId,
    filePath: occurrence.filePath,
    label: occurrence.name,
    nodeId: occurrence.nodeId,
    symbolType: occurrence.symbolType,
    symbolName: occurrence.name,
  };
}


function semanticWorkspaceSymbolType(file: ProjectFile): string | undefined {
  const normalized = file.workspace.id.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized === 'density') return 'Density';
  if (normalized === 'blockmask') return 'BlockMask';
  if (normalized === 'assignments' || normalized === 'assignment') return 'Assignments';
  if (normalized === 'biome') return 'Biome';
  return undefined;
}

function normalizedSymbolTypeForOccurrence(context: SemanticReferenceExtractorContext, occurrence: SymbolOccurrence): string {
  if (occurrence.symbolType !== 'Unknown') return occurrence.symbolType;
  const file = context.fileMap.get(occurrence.fileId);
  return file ? (semanticWorkspaceSymbolType(file) ?? occurrence.symbolType) : occurrence.symbolType;
}

function semanticDefinitionCandidates(
  context: SemanticReferenceExtractorContext,
  symbolType: string,
  targetName: string,
): SemanticReferenceCandidate[] {
  const candidates = new Map<string, SemanticReferenceCandidate>();
  const addOccurrence = (occurrence: SymbolOccurrence): void => {
    const normalizedType = normalizedSymbolTypeForOccurrence(context, occurrence);
    if (normalizedType !== symbolType) return;
    const candidate = occurrenceCandidate({ ...occurrence, symbolType: normalizedType });
    candidates.set(`${candidate.fileId}:${candidate.nodeId ?? ''}:${candidate.symbolName ?? ''}`, candidate);
  };

  for (const record of context.symbolIndex.values()) {
    if (record.key.name !== targetName) continue;
    for (const occurrence of record.definitions) addOccurrence(occurrence);
  }

  // Legacy NodeEditor roots can expose ExportAs without enough node metadata for the generic SymbolIndex
  // to infer a type. Workspace identity is high-confidence semantic information, so add those roots here.
  for (const file of context.files) {
    if (semanticWorkspaceSymbolType(file) !== symbolType || !isObject(file.raw)) continue;
    const exportName = typeof file.raw.ExportAs === 'string' ? file.raw.ExportAs.trim() : '';
    if (exportName !== targetName) continue;
    const candidate: SemanticReferenceCandidate = {
      fileId: file.id,
      filePath: file.path,
      label: exportName,
      nodeId: file.nodes[0]?.id,
      symbolType,
      symbolName: exportName,
    };
    candidates.set(`${candidate.fileId}:${candidate.nodeId ?? ''}:${candidate.symbolName ?? ''}`, candidate);
  }
  return [...candidates.values()];
}

function resolutionStatus(count: number): SemanticReferenceStatus {
  if (count === 1) return 'resolved';
  return count === 0 ? 'unresolved' : 'ambiguous';
}

function makeId(extractorId: string, source: SemanticReferenceSource, relation: SemanticReferenceRelation, targetName: string, suffix = ''): string {
  const path = jsonPathKey(source.jsonPath ?? []);
  return `${extractorId}:${source.fileId}:${path}:${relation}:${targetName.toLowerCase()}:${suffix}`;
}

function resolveFileReference(
  extractorId: string,
  relation: SemanticReferenceRelation,
  source: SemanticReferenceSource,
  targetType: string,
  targetName: string,
  candidates: ProjectFile[],
): SemanticReference {
  const key = stem(targetName);
  // Hytale flow references such as WorldStructure → Biome are file-identity references in the
  // shipped assets. Prefer exact file stems first; only fall back to semantic aliases when no
  // file-stem match exists. This avoids turning repeated root Name values (e.g. "Basic") into
  // false ambiguity when a uniquely named Basic.json exists.
  const stemMatches = candidates.filter((file) => semanticFileStem(file) === key);
  const matches = stemMatches.length > 0
    ? stemMatches
    : candidates.filter((file) => semanticAliasesForFile(file).includes(key));
  const status = resolutionStatus(matches.length);
  const target: SemanticReferenceTarget = {
    kind: 'file',
    type: targetType,
    name: targetName,
    fileId: matches.length === 1 ? matches[0].id : undefined,
    filePath: matches.length === 1 ? matches[0].path : undefined,
  };
  return {
    id: makeId(extractorId, source, relation, targetName),
    extractorId,
    relation,
    status,
    source,
    target,
    candidates: matches.map(fileCandidate),
  };
}

function resolveSymbolReference(
  context: SemanticReferenceExtractorContext,
  extractorId: string,
  relation: SemanticReferenceRelation,
  source: SemanticReferenceSource,
  symbolType: string,
  targetName: string,
): SemanticReference {
  const definitions = semanticDefinitionCandidates(context, symbolType, targetName);
  const target: SemanticReferenceTarget = {
    kind: 'symbol',
    type: symbolType,
    name: targetName,
    symbolType,
    symbolName: targetName,
    fileId: definitions.length === 1 ? definitions[0].fileId : undefined,
    filePath: definitions.length === 1 ? definitions[0].filePath : undefined,
    nodeId: definitions.length === 1 ? definitions[0].nodeId : undefined,
  };
  return {
    id: makeId(extractorId, source, relation, targetName, symbolType.toLowerCase()),
    extractorId,
    relation,
    status: resolutionStatus(definitions.length),
    source,
    target,
    candidates: definitions,
  };
}


function normalizeResourcePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').trim();
}

export interface InventoryResourceDescriptor {
  kind: 'environment' | 'prefab';
  name: string;
  path: string;
}

interface CanonicalResourceLocation {
  normalized: string;
  root: string;
  relative: string;
}

/**
 * Worldgen resources live below the canonical Server roots. If the user opens Server itself,
 * Environments/ and Prefabs/ can also be project-root-relative. Do not treat unrelated nested
 * folders (for example Audio/.../Environments or Audio/.../Prefabs) as worldgen resources.
 */
function canonicalResourceLocation(path: string, folder: 'Environments' | 'Prefabs'): CanonicalResourceLocation | undefined {
  const normalized = normalizeResourcePath(path);
  const parts = normalized.split('/').filter(Boolean);
  const folderKey = folder.toLowerCase();
  const index = parts.findIndex((part, candidateIndex) => part.toLowerCase() === folderKey
    && (candidateIndex === 0 || parts[candidateIndex - 1]?.toLowerCase() === 'server'));
  if (index < 0 || index >= parts.length - 1) return undefined;
  return {
    normalized,
    root: parts.slice(0, index + 1).join('/'),
    relative: parts.slice(index + 1).join('/'),
  };
}

/**
 * Lightweight inventory classification shared by Search and the Whole Project Explorer.
 * This identifies known resource locations without semantically loading their contents.
 */
export function inventoryResourceDescriptor(path: string): InventoryResourceDescriptor | undefined {
  const environment = canonicalResourceLocation(path, 'Environments');
  if (environment && /\.json$/i.test(environment.relative)) {
    const tail = environment.relative.split('/').at(-1) ?? environment.relative;
    return {
      kind: 'environment',
      name: tail.replace(/\.json$/i, '').replace(/^Env_/i, ''),
      path: environment.normalized,
    };
  }
  const prefab = canonicalResourceLocation(path, 'Prefabs');
  if (prefab && /(?:\.prefab)?\.json$/i.test(prefab.relative)) {
    return {
      kind: 'prefab',
      name: prefab.relative.replace(/\.prefab\.json$/i, '').replace(/\.json$/i, ''),
      path: prefab.normalized,
    };
  }
  return undefined;
}

function referenceResourcePaths(reference: SemanticReference): string[] {
  const paths = [
    reference.target.resourcePath,
    reference.target.filePath,
    ...reference.candidates.flatMap((candidate) => [candidate.resourcePath, candidate.filePath]),
  ];
  return [...new Set(paths.filter((value): value is string => Boolean(value)).map((value) => normalizeResourcePath(value).toLowerCase()))];
}

/** Count semantic consumers that resolve to, or nominate, an inventory resource path. */
export function inventoryResourceReferenceCount(
  descriptor: InventoryResourceDescriptor,
  references: Iterable<SemanticReference>,
): number {
  const resourcePath = normalizeResourcePath(descriptor.path).toLowerCase();
  let count = 0;
  for (const reference of references) {
    if (reference.target.kind !== 'resource' || reference.target.resourceKind !== descriptor.kind) continue;
    const paths = referenceResourcePaths(reference);
    const matches = descriptor.kind === 'prefab'
      ? paths.some((candidate) => resourcePath === candidate || resourcePath.startsWith(`${candidate.replace(/\/+$/g, '')}/`))
      : paths.includes(resourcePath);
    if (matches) count += 1;
  }
  return count;
}

function lowerBound(values: string[], target: string): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((values[middle] ?? '') < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

/**
 * Bulk equivalent of inventoryResourceReferenceCount.
 *
 * The legacy helper is intentionally retained for focused callers and compatibility tests,
 * but the Whole Project Explorer must not rescan every semantic reference once per resource.
 * Environment references are exact-path matches. Prefab references may nominate either an
 * exact prefab file or a containing prefab folder, so sorted prefix intervals preserve the
 * existing descendant semantics while counting each semantic reference at most once per file.
 */
export function inventoryResourceReferenceCountIndex(
  descriptors: Iterable<InventoryResourceDescriptor>,
  references: Iterable<SemanticReference>,
): Map<string, number> {
  const environments = new Set<string>();
  const prefabPaths: string[] = [];
  for (const descriptor of descriptors) {
    const path = normalizeResourcePath(descriptor.path).toLowerCase();
    if (descriptor.kind === 'environment') environments.add(path);
    else prefabPaths.push(path);
  }
  prefabPaths.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

  const counts = new Map<string, number>();
  const prefabDifference = new Int32Array(prefabPaths.length + 1);

  for (const reference of references) {
    if (reference.target.kind !== 'resource' || !reference.target.resourceKind) continue;
    const candidates = referenceResourcePaths(reference);
    if (!candidates.length) continue;

    if (reference.target.resourceKind === 'environment') {
      const matched = new Set<string>();
      for (const candidate of candidates) {
        if (environments.has(candidate)) matched.add(candidate);
      }
      for (const path of matched) counts.set(path, (counts.get(path) ?? 0) + 1);
      continue;
    }

    if (!prefabPaths.length) continue;
    const intervals: Array<[number, number]> = [];
    for (const rawCandidate of candidates) {
      const candidate = rawCandidate.replace(/\/+$/g, '');
      const exact = lowerBound(prefabPaths, candidate);
      if (exact < prefabPaths.length && prefabPaths[exact] === candidate) intervals.push([exact, exact + 1]);

      const prefix = `${candidate}/`;
      const start = lowerBound(prefabPaths, prefix);
      // U+FFFF sorts after ordinary path characters and safely bounds strings beginning with prefix.
      const end = lowerBound(prefabPaths, `${prefix}\uffff`);
      if (end > start) intervals.push([start, end]);
    }
    if (!intervals.length) continue;

    intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let [mergedStart, mergedEnd] = intervals[0]!;
    for (let index = 1; index < intervals.length; index += 1) {
      const [start, end] = intervals[index]!;
      if (start <= mergedEnd) {
        if (end > mergedEnd) mergedEnd = end;
        continue;
      }
      prefabDifference[mergedStart] += 1;
      prefabDifference[mergedEnd] -= 1;
      mergedStart = start;
      mergedEnd = end;
    }
    prefabDifference[mergedStart] += 1;
    prefabDifference[mergedEnd] -= 1;
  }

  let active = 0;
  for (let index = 0; index < prefabPaths.length; index += 1) {
    active += prefabDifference[index] ?? 0;
    if (active) counts.set(prefabPaths[index]!, active);
  }
  return counts;
}

interface SemanticResourceIndex {
  environmentsByAlias: Map<string, SemanticReferenceCandidate[]>;
  prefabsByPath: Map<string, SemanticReferenceCandidate[]>;
  prefabFoldersByPath: Map<string, SemanticReferenceCandidate>;
}

function appendResourceCandidate(
  index: Map<string, SemanticReferenceCandidate[]>,
  key: string,
  candidate: SemanticReferenceCandidate,
): void {
  const existing = index.get(key);
  if (existing) existing.push(candidate);
  else index.set(key, [candidate]);
}

function buildSemanticResourceIndex(inventoryPaths: string[]): SemanticResourceIndex {
  const environmentsByAlias = new Map<string, SemanticReferenceCandidate[]>();
  const prefabsByPath = new Map<string, SemanticReferenceCandidate[]>();
  const prefabFoldersByPath = new Map<string, SemanticReferenceCandidate>();

  for (const filePath of inventoryPaths) {
    const environment = canonicalResourceLocation(filePath, 'Environments');
    if (environment && /\.json$/i.test(environment.relative)) {
      const alias = stem(environment.relative).replace(/^env_/, '');
      appendResourceCandidate(environmentsByAlias, alias, {
        filePath,
        label: filePath.split('/').at(-1) ?? filePath,
        resourceKind: 'environment',
        resourcePath: filePath,
      });
    }

    const prefab = canonicalResourceLocation(filePath, 'Prefabs');
    if (!prefab) continue;
    const stripped = prefab.relative.replace(/\.prefab\.json$/i, '').replace(/\.json$/i, '');
    const exactKey = stripped.toLowerCase();
    appendResourceCandidate(prefabsByPath, exactKey, {
      filePath,
      label: filePath.split('/').at(-1) ?? filePath,
      resourceKind: 'prefab',
      resourcePath: filePath,
    });

    // Prefab references may point at a virtual folder instead of a concrete .prefab.json file.
    // Build those folder identities once so each reference does not need to rescan the inventory.
    const relativeParts = prefab.relative.split('/').filter(Boolean);
    for (let length = 1; length < relativeParts.length; length += 1) {
      const relativeFolder = relativeParts.slice(0, length).join('/');
      const folderKey = relativeFolder.toLowerCase();
      if (prefabFoldersByPath.has(folderKey)) continue;
      const virtualPath = `${prefab.root}/${relativeFolder}`.replace(/\/+/g, '/');
      prefabFoldersByPath.set(folderKey, {
        filePath: virtualPath,
        label: relativeParts[length - 1] ?? relativeFolder,
        resourceKind: 'prefab',
        resourcePath: virtualPath,
      });
    }
  }

  return { environmentsByAlias, prefabsByPath, prefabFoldersByPath };
}

function environmentCandidates(resourceIndex: SemanticResourceIndex, targetName: string): SemanticReferenceCandidate[] {
  const key = stem(targetName).replace(/^env_/, '');
  return resourceIndex.environmentsByAlias.get(key) ?? [];
}

function prefabCandidates(resourceIndex: SemanticResourceIndex, targetName: string): SemanticReferenceCandidate[] {
  const target = normalizeResourcePath(targetName).replace(/^Server\/Prefabs\//i, '').replace(/^Prefabs\//i, '');
  if (!target) return [];
  const key = target.toLowerCase();
  const exact = resourceIndex.prefabsByPath.get(key);
  if (exact?.length) return exact;
  const folder = resourceIndex.prefabFoldersByPath.get(key);
  return folder ? [folder] : [];
}

function resolveResourceReference(
  extractorId: string,
  relation: SemanticReferenceRelation,
  source: SemanticReferenceSource,
  resourceKind: 'environment' | 'prefab',
  targetName: string,
  candidates: SemanticReferenceCandidate[],
): SemanticReference {
  const status = resolutionStatus(candidates.length);
  const match = candidates.length === 1 ? candidates[0] : undefined;
  return {
    id: makeId(extractorId, source, relation, targetName, resourceKind),
    extractorId, relation, status, source,
    target: { kind: 'resource', type: resourceKind === 'environment' ? 'Environment' : 'Prefab', name: targetName, filePath: match?.filePath, resourceKind, resourcePath: match?.resourcePath },
    candidates,
  };
}

function instanceLabel(file: ProjectFile): string {
  const parts = file.path.replace(/\\/g, '/').split('/').filter(Boolean);
  const fileName = parts.at(-1)?.toLowerCase();
  if (fileName === 'instance.bson' && parts.length > 1) return parts.at(-2) ?? file.name;
  return semanticRootName(file) ?? semanticFileStem(file);
}

function instanceWorldStructureName(file: ProjectFile): string | undefined {
  if (!isHytaleGeneratorInstanceFile(file) || !isObject(file.raw)) return undefined;
  const worldGen = file.raw.WorldGen;
  if (!isObject(worldGen)) return undefined;
  const value = worldGen.WorldStructure;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

interface NamedValue {
  value: string;
  jsonPath: Array<string | number>;
}

function collectNamedStringFields(
  value: JsonValue,
  acceptedKeys: Set<string>,
  path: Array<string | number> = [],
  keyHint?: string,
  result: NamedValue[] = [],
): NamedValue[] {
  if (typeof value === 'string') {
    if (keyHint && acceptedKeys.has(keyHint) && value.trim()) result.push({ value: value.trim(), jsonPath: path });
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectNamedStringFields(child, acceptedKeys, [...path, index], keyHint, result));
    return result;
  }
  if (!isObject(value)) return result;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    collectNamedStringFields(child, acceptedKeys, [...path, key], acceptedKeys.has(normalized) ? normalized : undefined, result);
  }
  return result;
}

function collectImportedNames(
  value: JsonValue | undefined,
  expectedType: string,
  path: Array<string | number>,
  result: NamedValue[] = [],
): NamedValue[] {
  if (value === undefined) return result;
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectImportedNames(child, expectedType, [...path, index], result));
    return result;
  }
  if (!isObject(value)) return result;

  const type = typeof value.Type === 'string' ? value.Type : '';
  const name = typeof value.Name === 'string' ? value.Name.trim() : '';
  const nodeId = typeof value.$NodeId === 'string' ? value.$NodeId : '';
  const typeMatches = !expectedType || nodeId.toLowerCase().includes(expectedType.toLowerCase());
  if (type.toLowerCase() === 'imported' && name && typeMatches) {
    result.push({ value: name, jsonPath: [...path, 'Name'] });
  }
  for (const [key, child] of Object.entries(value)) collectImportedNames(child, expectedType, [...path, key], result);
  return result;
}

function densityReferences(value: JsonValue | undefined, path: Array<string | number>): NamedValue[] {
  if (typeof value === 'string' && value.trim()) return [{ value: value.trim(), jsonPath: path }];
  if (isObject(value) && typeof value.Type === 'string' && value.Type.toLowerCase() === 'imported' && typeof value.Name === 'string' && value.Name.trim()) {
    return [{ value: value.Name.trim(), jsonPath: [...path, 'Name'] }];
  }
  return collectImportedNames(value, 'density', path);
}

function biomeDensityValue(file: ProjectFile): { value: JsonValue; jsonPath: Array<string | number> } | undefined {
  if (!isObject(file.raw)) return undefined;
  const terrain = file.raw.Terrain;
  if (isObject(terrain) && terrain.Density !== undefined) return { value: terrain.Density, jsonPath: ['Terrain', 'Density'] };
  if (file.raw.Density !== undefined) return { value: file.raw.Density, jsonPath: ['Density'] };

  let found: { value: JsonValue; jsonPath: Array<string | number> } | undefined;
  const visit = (value: JsonValue, path: Array<string | number>): void => {
    if (found !== undefined) return;
    if (Array.isArray(value)) {
      value.forEach((child, index) => visit(child, [...path, index]));
      return;
    }
    if (!isObject(value)) return;
    const nodeId = typeof value.$NodeId === 'string' ? value.$NodeId.toLowerCase() : '';
    if ((nodeId === 'terrain.biome' || nodeId.endsWith('.biome')) && value.Density !== undefined) {
      found = { value: value.Density, jsonPath: [...path, 'Density'] };
      return;
    }
    for (const [key, child] of Object.entries(value)) visit(child, [...path, key]);
  };
  visit(file.raw, []);
  return found;
}

function pathPrefix(prefix: Array<string | number>, value: Array<string | number>): boolean {
  return prefix.length <= value.length && prefix.every((segment, index) => value[index] === segment);
}

function ownerSymbolForReference(
  context: SemanticReferenceExtractorContext,
  definitionsByFile: Map<string, Array<{ key: SymbolKey; occurrence: SymbolOccurrence }>>,
  reference: SymbolOccurrence,
): SymbolKey | undefined {
  const candidates = (definitionsByFile.get(reference.fileId) ?? [])
    .filter(({ occurrence }) => pathPrefix(occurrence.jsonPath.slice(0, -1), reference.jsonPath))
    .sort((a, b) => b.occurrence.jsonPath.length - a.occurrence.jsonPath.length);
  const owner = candidates[0];
  if (!owner) return undefined;
  const file = context.fileMap.get(owner.occurrence.fileId);
  const symbolType = owner.key.symbolType === 'Unknown' && file
    ? (semanticWorkspaceSymbolType(file) ?? owner.key.symbolType)
    : owner.key.symbolType;
  return { symbolType, name: owner.key.name };
}

const instanceWorldStructureExtractor: SemanticReferenceExtractor = {
  id: 'instance-worldstructure-v1',
  extract(context) {
    const targets = context.files.filter(isWorldStructureFile);
    return context.files.filter(isHytaleGeneratorInstanceFile).flatMap((file) => {
      const targetName = instanceWorldStructureName(file);
      if (!targetName) return [];
      return [resolveFileReference(this.id, 'instance-worldstructure', {
        fileId: file.id,
        filePath: file.path,
        label: instanceLabel(file),
        jsonPath: ['WorldGen', 'WorldStructure'],
      }, 'WorldStructure', targetName, targets)];
    });
  },
};

const worldStructureBiomeExtractor: SemanticReferenceExtractor = {
  id: 'worldstructure-biome-v1',
  extract(context) {
    const biomes = context.files.filter(isBiomeFile);
    const accepted = new Set(['biome', 'biomes', 'defaultbiome']);
    return context.files.filter(isWorldStructureFile).flatMap((file) =>
      collectNamedStringFields(file.raw, accepted).map((item) => resolveFileReference(this.id, 'worldstructure-biome', {
        fileId: file.id,
        filePath: file.path,
        label: semanticRootName(file) ?? semanticFileStem(file),
        jsonPath: item.jsonPath,
      }, 'Biome', item.value, biomes)));
  },
};

const worldStructureDensityExtractor: SemanticReferenceExtractor = {
  id: 'worldstructure-density-v1',
  extract(context) {
    return context.files.filter(isWorldStructureFile).flatMap((file) => {
      const value = isObject(file.raw) ? file.raw.Density : undefined;
      return densityReferences(value, ['Density']).map((item) => resolveSymbolReference(context, this.id, 'worldstructure-density', {
        fileId: file.id,
        filePath: file.path,
        label: semanticRootName(file) ?? semanticFileStem(file),
        jsonPath: item.jsonPath,
      }, 'Density', item.value));
    });
  },
};

const biomeDensityExtractor: SemanticReferenceExtractor = {
  id: 'biome-density-v1',
  extract(context) {
    return context.files.filter(isBiomeFile).flatMap((file) => {
      const density = biomeDensityValue(file);
      if (!density) return [];
      return densityReferences(density.value, density.jsonPath).map((item) => resolveSymbolReference(context, this.id, 'biome-density', {
        fileId: file.id,
        filePath: file.path,
        label: semanticRootName(file) ?? semanticFileStem(file),
        jsonPath: item.jsonPath,
      }, 'Density', item.value));
    });
  },
};

const symbolImportExtractor: SemanticReferenceExtractor = {
  id: 'symbol-import-v1',
  extract(context) {
    const definitionsByFile = new Map<string, Array<{ key: SymbolKey; occurrence: SymbolOccurrence }>>();
    for (const record of context.symbolIndex.values()) {
      for (const occurrence of record.definitions) {
        const entries = definitionsByFile.get(occurrence.fileId) ?? [];
        entries.push({ key: record.key, occurrence });
        definitionsByFile.set(occurrence.fileId, entries);
      }
    }

    const references: SemanticReference[] = [];
    for (const record of context.symbolIndex.values()) {
      for (const occurrence of record.references) {
        const ownerSymbol = ownerSymbolForReference(context, definitionsByFile, occurrence);
        const occurrenceFile = context.fileMap.get(occurrence.fileId);
        const targetSymbolType = record.key.symbolType === 'Unknown' && occurrenceFile?.workspace.id.toLowerCase() === 'density'
          ? 'Density'
          : record.key.symbolType;
        references.push(resolveSymbolReference(context, this.id, 'symbol-import', {
          fileId: occurrence.fileId,
          filePath: occurrence.filePath,
          nodeId: occurrence.nodeId,
          label: occurrence.nodeKind,
          jsonPath: occurrence.jsonPath,
          ownerSymbol,
        }, targetSymbolType, record.key.name));
      }
    }
    return references;
  },
};

function collectBlockMaskImports(value: JsonValue, path: Array<string | number> = [], result: NamedValue[] = []): NamedValue[] {
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectBlockMaskImports(child, [...path, index], result));
    return result;
  }
  if (!isObject(value)) return result;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'BlockMask' && isObject(child) && typeof child.Import === 'string' && child.Import.trim()) {
      result.push({ value: child.Import.trim(), jsonPath: [...path, key, 'Import'] });
    }
    collectBlockMaskImports(child, [...path, key], result);
  }
  return result;
}

const blockMaskImportExtractor: SemanticReferenceExtractor = {
  id: 'blockmask-import-v1',
  extract(context) {
    const blockMasks = context.files.filter(isBlockMaskFile);
    return context.files.flatMap((file) => collectBlockMaskImports(file.raw).map((item) => resolveFileReference(this.id, 'blockmask-import', {
      fileId: file.id,
      filePath: file.path,
      label: semanticRootName(file) ?? semanticFileStem(file),
      jsonPath: item.jsonPath,
    }, 'BlockMask', item.value, blockMasks)));
  },
};


function collectEnvironmentReferences(file: ProjectFile): NamedValue[] {
  const accepted = new Set(['environment']);
  return collectNamedStringFields(file.raw, accepted);
}

function collectWeightedPrefabPaths(value: JsonValue, path: Array<string | number> = [], result: NamedValue[] = []): NamedValue[] {
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectWeightedPrefabPaths(child, [...path, index], result));
    return result;
  }
  if (!isObject(value)) return result;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'WeightedPrefabPaths' && Array.isArray(child)) {
      child.forEach((entry, index) => {
        if (isObject(entry) && typeof entry.Path === 'string' && entry.Path.trim()) result.push({ value: entry.Path.trim(), jsonPath: [...path, key, index, 'Path'] });
      });
    }
    collectWeightedPrefabPaths(child, [...path, key], result);
  }
  return result;
}

const biomeEnvironmentExtractor: SemanticReferenceExtractor = {
  id: 'biome-environment-v1',
  extract(context) {
    return context.files.filter(isBiomeFile).flatMap((file) => collectEnvironmentReferences(file).map((item) => resolveResourceReference(this.id, 'biome-environment', {
      fileId: file.id, filePath: file.path, label: semanticRootName(file) ?? semanticFileStem(file), jsonPath: item.jsonPath,
    }, 'environment', item.value, environmentCandidates(context.resourceIndex, item.value))));
  },
};

const assignmentPrefabExtractor: SemanticReferenceExtractor = {
  id: 'assignment-prefab-v1',
  extract(context) {
    return context.files.filter((file) => semanticWorkspaceSymbolType(file) === 'Assignments').flatMap((file) => collectWeightedPrefabPaths(file.raw).map((item) => resolveResourceReference(this.id, 'assignment-prefab', {
      fileId: file.id, filePath: file.path, label: semanticRootName(file) ?? semanticFileStem(file), jsonPath: item.jsonPath,
    }, 'prefab', item.value, prefabCandidates(context.resourceIndex, item.value))));
  },
};

export const defaultSemanticReferenceExtractorRegistry = new SemanticReferenceExtractorRegistry()
  .register(instanceWorldStructureExtractor)
  .register(worldStructureBiomeExtractor)
  .register(worldStructureDensityExtractor)
  .register(biomeDensityExtractor)
  .register(symbolImportExtractor)
  .register(blockMaskImportExtractor)
  .register(biomeEnvironmentExtractor)
  .register(assignmentPrefabExtractor);

export function buildSemanticReferences(
  files: ProjectFile[],
  symbolIndex: Map<string, SymbolRecord>,
  registry: SemanticReferenceExtractorRegistry = defaultSemanticReferenceExtractorRegistry,
  inventoryPaths: Iterable<string> = files.map((file) => file.path),
): SemanticReference[] {
  const materializedInventoryPaths = [...inventoryPaths];
  return registry.extract({
    files,
    fileMap: new Map(files.map((file) => [file.id, file])),
    symbolIndex,
    inventoryPaths: materializedInventoryPaths,
    resourceIndex: buildSemanticResourceIndex(materializedInventoryPaths),
  });
}

export function semanticReferencesFromFile(
  references: SemanticReference[],
  fileId: string,
  relation?: SemanticReferenceRelation,
): SemanticReference[] {
  return references.filter((reference) => reference.source.fileId === fileId && (!relation || reference.relation === relation));
}

export function semanticSymbolDependencies(
  references: SemanticReference[],
  source: SymbolKey,
  targetSymbolType?: string,
): SemanticReference[] {
  return references.filter((reference) => reference.relation === 'symbol-import'
    && reference.source.ownerSymbol?.symbolType === source.symbolType
    && reference.source.ownerSymbol?.name === source.name
    && (!targetSymbolType || reference.target.symbolType === targetSymbolType));
}
