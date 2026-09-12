import { jsonPathKey, type ChangeSet, type Diagnostic, type DiagnosticCode, type ProjectModel, type ProjectNode } from '../../core';
import type { InspectorFilters, QueryWorkbenchTab, VirtualNodeMatch } from '../../store';
import { fieldVisible, nodeVisibleInProject } from './visibility';

export const DIAGNOSTIC_ORDER: DiagnosticCode[] = [
  'parse-error',
  'unresolved-import',
  'unresolved-semantic-reference',
  'ambiguous-semantic-reference',
  'duplicate-export',
  'type-name-collision',
  'unused-export',
];

export function diagnosticLabel(code: DiagnosticCode): string {
  switch (code) {
    case 'parse-error': return 'Parse Errors';
    case 'unresolved-import': return 'Unresolved Imports';
    case 'unresolved-semantic-reference': return 'Unresolved Semantic References';
    case 'ambiguous-semantic-reference': return 'Ambiguous Semantic References';
    case 'duplicate-export': return 'Duplicate Exports';
    case 'unused-export': return 'Unused Exports';
    case 'type-name-collision': return 'Cross-Type Collisions';
  }
}

export function diagnosticSingularLabel(code: DiagnosticCode): string {
  switch (code) {
    case 'parse-error': return 'Parse Error';
    case 'unresolved-import': return 'Unresolved Import';
    case 'unresolved-semantic-reference': return 'Unresolved Semantic Reference';
    case 'ambiguous-semantic-reference': return 'Ambiguous Semantic Reference';
    case 'duplicate-export': return 'Duplicate Export';
    case 'unused-export': return 'Unused Export';
    case 'type-name-collision': return 'Cross-Type Collision';
  }
}

function mergeMatch(target: Map<string, VirtualNodeMatch>, match: VirtualNodeMatch) {
  const key = `${match.fileId}|${match.location}|${match.nodeId}`;
  const existing = target.get(key) ?? { ...match, matchedFieldPaths: [] };
  for (const path of match.matchedFieldPaths) {
    if (!existing.matchedFieldPaths.includes(path)) existing.matchedFieldPaths.push(path);
  }
  existing.matchedNodeMetadata ||= match.matchedNodeMetadata;
  target.set(key, existing);
}

function diagnosticsForTab(project: ProjectModel, tab: Extract<QueryWorkbenchTab, { queryKind: 'diagnostics' }>): Diagnostic[] {
  return tab.diagnosticCode
    ? project.diagnostics.filter((diagnostic) => diagnostic.code === tab.diagnosticCode)
    : project.diagnostics;
}

function diagnosticMatches(project: ProjectModel, diagnostics: Diagnostic[]): VirtualNodeMatch[] {
  const merged = new Map<string, VirtualNodeMatch>();
  for (const diagnostic of diagnostics) {
    if (diagnostic.related?.length) {
      for (const occurrence of diagnostic.related) {
        mergeMatch(merged, {
          fileId: occurrence.fileId,
          nodeId: occurrence.nodeId,
          location: occurrence.location,
          matchedFieldPaths: [jsonPathKey(occurrence.jsonPath)],
        });
      }
      continue;
    }
    if (diagnostic.fileId && diagnostic.nodeId) {
      const file = project.fileMap.get(diagnostic.fileId);
      const node = file?.nodes.find((candidate) => candidate.id === diagnostic.nodeId);
      if (node) {
        mergeMatch(merged, {
          fileId: diagnostic.fileId,
          nodeId: node.id,
          location: node.location,
          matchedFieldPaths: [],
          matchedNodeMetadata: true,
        });
      }
    }
  }
  return [...merged.values()];
}

function changeMatches(changeSet: ChangeSet): VirtualNodeMatch[] {
  const merged = new Map<string, VirtualNodeMatch>();
  for (const change of changeSet.changes) {
    mergeMatch(merged, {
      fileId: change.fileId,
      nodeId: change.nodeId,
      location: change.location,
      matchedFieldPaths: [jsonPathKey(change.jsonPath)],
    });
  }
  return [...merged.values()];
}

export function queryTabMatches(project: ProjectModel, tab: QueryWorkbenchTab, changeSet: ChangeSet): VirtualNodeMatch[] {
  switch (tab.queryKind) {
    case 'search':
      return tab.snapshot.matches.map((match) => ({ ...match }));
    case 'references':
      return tab.matches;
    case 'resource-references':
      return [];
    case 'diagnostics':
      return diagnosticMatches(project, diagnosticsForTab(project, tab));
    case 'changes':
      return changeMatches(changeSet);
  }
}

export function queryTabDiagnostics(project: ProjectModel, tab: Extract<QueryWorkbenchTab, { queryKind: 'diagnostics' }>): Diagnostic[] {
  return diagnosticsForTab(project, tab);
}

export function queryMatchVisible(project: ProjectModel, node: ProjectNode, match: VirtualNodeMatch, filters: InspectorFilters): boolean {
  if (!nodeVisibleInProject(project, node, filters)) return false;
  if (match.matchedNodeMetadata) return true;
  if (!match.matchedFieldPaths.length) return true;
  const matched = new Set(match.matchedFieldPaths);
  return node.fields.some((field) => matched.has(jsonPathKey(field.jsonPath)) && fieldVisible(field, filters));
}

export function queryTabVisibleMatches(project: ProjectModel, tab: QueryWorkbenchTab, changeSet: ChangeSet, filters: InspectorFilters) {
  return queryTabMatches(project, tab, changeSet).flatMap((match) => {
    const file = project.fileMap.get(match.fileId);
    const node = file?.nodes.find((candidate) => candidate.id === match.nodeId && candidate.location === match.location);
    return node && queryMatchVisible(project, node, match, filters) ? [{ match, node, file: file! }] : [];
  });
}

export function queryTabNodeRefs(project: ProjectModel, tab: QueryWorkbenchTab | undefined, changeSet: ChangeSet) {
  if (!tab) return [];
  return queryTabMatches(project, tab, changeSet).map((match) => ({ fileId: match.fileId, nodeId: match.nodeId, location: match.location }));
}

export function nonNodeDiagnostics(project: ProjectModel, tab: Extract<QueryWorkbenchTab, { queryKind: 'diagnostics' }>) {
  return diagnosticsForTab(project, tab).filter((diagnostic) => {
    if (diagnostic.related?.length) return false;
    if (!diagnostic.fileId || !diagnostic.nodeId) return true;
    const file = project.fileMap.get(diagnostic.fileId);
    return !file?.nodes.some((node) => node.id === diagnostic.nodeId);
  });
}
