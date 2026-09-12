import { jsonPathKey, type ProjectField, type ProjectModel, type ProjectNode, type SearchNodeMatch } from '../../core';
import type { InspectorFilters } from '../../store';

function pathKey(field: ProjectField): string {
  return jsonPathKey(field.jsonPath);
}

export function fieldVisible(field: ProjectField, filters: InspectorFilters): boolean {
  if (filters.hideEmpty && typeof field.value === 'string' && field.value.trim() === '') return false;
  if (field.category === 'import') return filters.imports;
  if (field.category === 'export') return filters.exports;
  if (field.category === 'seed') return filters.seeds;
  if (field.category === 'property') return filters.allValues || filters.valueFields.includes(field.key);
  return false;
}

export function nodeVisible(node: ProjectNode, filters: InspectorFilters): boolean {
  if (node.location === 'live' && !filters.live) return false;
  if (node.location === 'floating' && !filters.floating) return false;
  return node.fields.some((field) => fieldVisible(field, filters));
}

export function nodeVisibleInProject(project: ProjectModel, node: ProjectNode, filters: InspectorFilters): boolean {
  const file = project.fileMap.get(node.fileId);
  if (!file) return false;
  if (filters.workspace !== 'all' && file.workspace.id !== filters.workspace) return false;
  return nodeVisible(node, filters);
}

/** Search uses the same normal filters. Query operators narrow the snapshot; they do not create a second filter UI. */
export function searchMatchVisible(project: ProjectModel, node: ProjectNode, match: SearchNodeMatch, filters: InspectorFilters): boolean {
  if (!nodeVisibleInProject(project, node, filters)) return false;
  if (match.matchedNodeMetadata) return true;
  if (!match.matchedFieldPaths.length) return true;
  const matched = new Set(match.matchedFieldPaths);
  return node.fields.some((field) => matched.has(pathKey(field)) && fieldVisible(field, filters));
}
