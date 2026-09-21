import type {
  ChangeSet,
  JsonPrimitive,
  NodeLocation,
  ParsedSearchQuery,
  ProjectField,
  ProjectModel,
  ProjectNode,
  ProjectSearchResult,
  SearchIsPredicate,
  SearchNodeMatch,
  SearchSnapshot,
} from './types.js';
import { applyChangeSet } from './refactor.js';
import { inventoryResourceDescriptor } from './semanticReferences.js';
import { jsonPathKey } from './jsonPath.js';

function includes(value: unknown, needle: string): boolean {
  return String(value ?? '').toLowerCase().includes(needle.toLowerCase());
}

/**
 * Small shell-like tokenizer: whitespace separates tokens except inside single/double quotes.
 * Quotes can appear after an operator, so `value:"Main River"` stays one token.
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;
  let escaped = false;

  const flush = () => {
    if (current) tokens.push(current);
    current = '';
  };

  for (const char of input) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\' && quote) {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = undefined;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      flush();
      continue;
    }
    current += char;
  }
  flush();
  return tokens;
}

const SEARCH_IS_VALUES = new Set<SearchIsPredicate>(['import', 'export', 'unresolved', 'changed', 'live', 'floating']);

/** Discord-like, intentionally small and extensible query language. */
export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const parsed: ParsedSearchQuery = {
    raw,
    terms: [],
    fields: [],
    values: [],
    workspaces: [],
    nodeTypes: [],
    locations: [],
    is: [],
    unknownOperators: [],
  };

  for (const token of tokenize(raw.trim())) {
    const colon = token.indexOf(':');
    if (colon <= 0) {
      if (token) parsed.terms.push(token);
      continue;
    }
    const name = token.slice(0, colon).toLowerCase();
    const value = token.slice(colon + 1);
    if (!value) {
      parsed.terms.push(token);
      continue;
    }
    if (name === 'field') parsed.fields.push(value);
    else if (name === 'value') parsed.values.push(value);
    else if (name === 'workspace') parsed.workspaces.push(value);
    else if (name === 'node' || name === 'type') parsed.nodeTypes.push(value);
    else if (name === 'location' && ['live', 'floating'].includes(value.toLowerCase())) parsed.locations.push(value.toLowerCase() as NodeLocation);
    else if (name === 'is' && SEARCH_IS_VALUES.has(value.toLowerCase() as SearchIsPredicate)) parsed.is.push(value.toLowerCase() as SearchIsPredicate);
    else parsed.unknownOperators.push({ name, value });
  }
  return parsed;
}

function fieldPathKey(field: ProjectField): string {
  return jsonPathKey(field.jsonPath);
}

function nodeKey(node: Pick<ProjectNode, 'fileId' | 'id' | 'location'>): string {
  return JSON.stringify([node.fileId, node.location, node.id]);
}

interface SearchStatusIndex {
  changed: Map<string, Set<string>>;
  unresolved: Map<string, Set<string>>;
  values: Map<string, Map<string, JsonPrimitive>>;
}

function buildStatusIndex(project: ProjectModel, changeSet: ChangeSet | undefined, needsEffectiveDiagnostics: boolean): SearchStatusIndex {
  const changed = new Map<string, Set<string>>();
  const values = new Map<string, Map<string, JsonPrimitive>>();
  for (const change of changeSet?.changes ?? []) {
    const key = nodeKey({ fileId: change.fileId, location: change.location, id: change.nodeId });
    const paths = changed.get(key) ?? new Set<string>();
    const path = jsonPathKey(change.jsonPath);
    paths.add(path);
    changed.set(key, paths);
    const nodeValues = values.get(key) ?? new Map<string, JsonPrimitive>();
    // Preserve the first matching staged change, including an explicit null value.
    if (!nodeValues.has(path)) nodeValues.set(path, change.newValue);
    values.set(key, nodeValues);
  }

  const diagnosticProject = needsEffectiveDiagnostics && changeSet?.changes.length
    ? applyChangeSet(project, changeSet).project
    : project;
  const unresolved = new Map<string, Set<string>>();
  for (const diagnostic of diagnosticProject.diagnostics) {
    if (diagnostic.code !== 'unresolved-import') continue;
    for (const occurrence of diagnostic.related ?? []) {
      const key = nodeKey({ fileId: occurrence.fileId, location: occurrence.location, id: occurrence.nodeId });
      const paths = unresolved.get(key) ?? new Set<string>();
      paths.add(jsonPathKey(occurrence.jsonPath));
      unresolved.set(key, paths);
    }
    if (diagnostic.fileId && diagnostic.nodeId && !(diagnostic.related?.length)) {
      const file = diagnosticProject.fileMap.get(diagnostic.fileId);
      const node = file?.nodes.find((candidate) => candidate.id === diagnostic.nodeId);
      if (node) unresolved.set(nodeKey(node), unresolved.get(nodeKey(node)) ?? new Set<string>());
    }
  }
  return { changed, unresolved, values };
}

function effectiveValue(values: Map<string, JsonPrimitive> | undefined, field: ProjectField): JsonPrimitive {
  const value = values?.get(fieldPathKey(field));
  return value === undefined ? field.value : value;
}

function semanticIs(parsed: ParsedSearchQuery): Array<'import' | 'export'> {
  return parsed.is.filter((value): value is 'import' | 'export' => value === 'import' || value === 'export');
}

function nodeMatchesQuery(
  project: ProjectModel,
  node: ProjectNode,
  parsed: ParsedSearchQuery,
  status: SearchStatusIndex,
): SearchNodeMatch | undefined {
  const file = project.fileMap.get(node.fileId);
  if (!file) return undefined;

  if (parsed.locations.length && !parsed.locations.includes(node.location)) return undefined;
  if (parsed.workspaces.length && !parsed.workspaces.some((value) =>
    includes(file.workspace.id, value) || includes(file.workspace.label, value) || includes(file.workspace.matchedSegment, value))) return undefined;
  if (parsed.nodeTypes.length && !parsed.nodeTypes.some((value) =>
    includes(node.nodeKind, value) || includes(node.type, value) || includes(node.id, value))) return undefined;

  const key = nodeKey(node);
  const values = status.values.get(key);
  const semanticPredicates = semanticIs(parsed);
  for (const predicate of parsed.is) {
    if (predicate === 'live' && node.location !== 'live') return undefined;
    if (predicate === 'floating' && node.location !== 'floating') return undefined;
    if (predicate === 'import' && !node.fields.some((field) => field.category === 'import')) return undefined;
    if (predicate === 'export' && !node.fields.some((field) => field.category === 'export')) return undefined;
    if (predicate === 'changed' && !status.changed.has(key)) return undefined;
    if (predicate === 'unresolved' && !status.unresolved.has(key)) return undefined;
  }

  let selectedFields = node.fields;
  if (parsed.fields.length) selectedFields = selectedFields.filter((field) => parsed.fields.some((filter) => includes(field.key, filter)));
  if (parsed.fields.length && selectedFields.length === 0) return undefined;
  if (semanticPredicates.length) {
    selectedFields = selectedFields.filter((field) => semanticPredicates.includes(field.category as 'import' | 'export'));
    if (!selectedFields.length) return undefined;
  }

  const matchedFieldPaths = new Set<string>();
  let matchedNodeMetadata = false;

  // Status / semantic predicates contribute their exact fields to highlighting.
  for (const field of selectedFields) {
    if (semanticPredicates.includes(field.category as 'import' | 'export')) matchedFieldPaths.add(fieldPathKey(field));
  }
  for (const path of status.changed.get(key) ?? []) matchedFieldPaths.add(path);
  for (const path of status.unresolved.get(key) ?? []) matchedFieldPaths.add(path);

  // Multiple value: filters are ANDed, while each filter may match any currently selected field.
  for (const valueFilter of parsed.values) {
    const matches = selectedFields.filter((field) => includes(effectiveValue(values, field), valueFilter));
    if (!matches.length) return undefined;
    matches.forEach((field) => matchedFieldPaths.add(fieldPathKey(field)));
  }

  const fieldScoped = parsed.fields.length > 0 || parsed.values.length > 0 || semanticPredicates.length > 0;
  if (parsed.terms.length === 0) {
    if (parsed.fields.length && !parsed.values.length) selectedFields.forEach((field) => matchedFieldPaths.add(fieldPathKey(field)));
    if (!matchedFieldPaths.size) matchedNodeMetadata = true;
  } else {
    for (const term of parsed.terms) {
      const metadataMatch = !fieldScoped && [node.nodeKind, node.type, node.id].some((value) => includes(value, term));
      const termFieldMatches = selectedFields.filter((field) => includes(field.key, term) || includes(effectiveValue(values, field), term));
      if (!metadataMatch && termFieldMatches.length === 0) return undefined;
      if (metadataMatch) matchedNodeMetadata = true;
      termFieldMatches.forEach((field) => matchedFieldPaths.add(fieldPathKey(field)));
    }
  }

  return {
    fileId: node.fileId,
    nodeId: node.id,
    location: node.location,
    matchedFieldPaths: [...matchedFieldPaths],
    matchedNodeMetadata,
  };
}

/**
 * Node-centric search used by Search tabs. Normal Workbench filters are deliberately not applied here;
 * the same global filters are applied when the snapshot is rendered.
 */
export function searchProjectNodes(project: ProjectModel, query: string, changeSet?: ChangeSet, limit = 5000): SearchSnapshot {
  const parsed = parseSearchQuery(query);
  const hasSearch = parsed.terms.length || parsed.fields.length || parsed.values.length || parsed.workspaces.length || parsed.nodeTypes.length || parsed.locations.length || parsed.is.length;
  if (!hasSearch) return { query, parsed, matches: [], total: 0, truncated: false };

  const status = buildStatusIndex(project, changeSet, parsed.is.includes('unresolved'));
  const matches: SearchNodeMatch[] = [];
  let total = 0;
  for (const file of project.files) {
    for (const node of file.nodes) {
      const match = nodeMatchesQuery(project, node, parsed, status);
      if (!match) continue;
      total += 1;
      if (matches.length < limit) matches.push(match);
    }
  }
  return { query, parsed, matches, total, truncated: total > matches.length };
}

/** Legacy quick-result search kept for direct navigation and compatibility with v0.2/v0.3 core callers. */
export function searchProject(project: ProjectModel, query: string, limit = 80): ProjectSearchResult[] {
  const needle = query.trim().toLowerCase();
  if (!needle || limit <= 0) return [];
  const results: ProjectSearchResult[] = [];
  const push = (result: ProjectSearchResult) => {
    if (results.length < limit) results.push(result);
  };

  for (const file of project.files) {
    if (includes(file.path, needle) || includes(file.name, needle)) {
      push({ id: `file:${file.id}`, kind: 'file', title: file.name, subtitle: `${file.workspace.label} · ${file.path}`, fileId: file.id });
      if (results.length >= limit) return results;
    }
  }

  for (const record of project.symbolIndex.values()) {
    if (!includes(record.key.name, needle) && !includes(record.key.symbolType, needle)) continue;
    const first = record.definitions[0] ?? record.references[0];
    push({
      id: `symbol:${record.key.symbolType}:${record.key.name}`,
      kind: 'symbol',
      title: record.key.name,
      subtitle: `${record.key.symbolType} · ${record.definitions.length} def · ${record.references.length} refs`,
      fileId: first?.fileId,
      nodeId: first?.nodeId,
      location: first?.location,
      symbol: record.key,
    });
    if (results.length >= limit) return results;
  }

  const resources = new Map<string, { kind: 'environment' | 'prefab'; name: string; path: string; referenceCount: number }>();
  for (const reference of project.semanticReferences) {
    if (reference.target.kind !== 'resource' || !reference.target.resourceKind) continue;
    const path = reference.target.resourcePath ?? reference.candidates[0]?.resourcePath ?? reference.candidates[0]?.filePath;
    if (!path) continue;
    const key = `${reference.target.resourceKind}:${path.replace(/\\/g, '/').toLowerCase()}`;
    const existing = resources.get(key);
    if (existing) existing.referenceCount += 1;
    else resources.set(key, { kind: reference.target.resourceKind, name: reference.target.name, path, referenceCount: 1 });
  }
  // Keep directly indexable inventory-only Environment/Prefab resources discoverable even when currently unused.
  for (const path of project.inventoryPaths) {
    const descriptor = inventoryResourceDescriptor(path);
    if (!descriptor) continue;
    const key = `${descriptor.kind}:${descriptor.path.toLowerCase()}`;
    if (!resources.has(key)) resources.set(key, { kind: descriptor.kind, name: descriptor.name, path: descriptor.path, referenceCount: 0 });
  }
  for (const resource of resources.values()) {
    if (!includes(resource.name, needle) && !includes(resource.path, needle) && !includes(resource.kind, needle)) continue;
    push({
      id: `resource:${resource.kind}:${resource.path}`,
      kind: 'resource',
      title: resource.name,
      subtitle: `${resource.kind === 'environment' ? 'Environment' : 'Prefab'} resource · ${resource.referenceCount} ref${resource.referenceCount === 1 ? '' : 's'} · ${resource.path}`,
      resourceKind: resource.kind,
      resourceName: resource.name,
      resourcePath: resource.path,
    });
  }

  for (const file of project.files) {
    for (const node of file.nodes) {
      if (results.length >= limit) break;
      if (includes(node.id, needle) || includes(node.nodeKind, needle) || includes(node.type, needle)) {
        push({ id: `node:${file.id}:${node.location}:${node.id}`, kind: 'node', title: node.nodeKind, subtitle: `${file.name} · ${node.location} · ${node.id}`, fileId: file.id, nodeId: node.id, location: node.location });
      }
      for (const field of node.fields) {
        if (results.length >= limit) break;
        if (!includes(field.key, needle) && !includes(field.value, needle)) continue;
        push({ id: `field:${file.id}:${node.location}:${node.id}:${jsonPathKey(field.jsonPath)}`, kind: 'field', title: `${field.key}: ${String(field.value)}`, subtitle: `${file.name} · ${node.nodeKind} · ${field.category}`, fileId: file.id, nodeId: node.id, location: node.location });
      }
    }
  }
  return results;
}
