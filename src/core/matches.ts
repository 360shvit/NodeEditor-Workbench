import { jsonPathKey } from './jsonPath.js';
import type { FieldOccurrence, JsonPrimitive, ProjectField, ProjectModel, ProjectNode } from './types.js';

function valueKey(value: JsonPrimitive): string {
  return `${value === null ? 'null' : typeof value}:${JSON.stringify(value)}`;
}

export function fieldMatchKey(nodeKind: string, field: ProjectField): string | undefined {
  if (field.refactorBehavior === 'literal') return `literal|${field.key}|${valueKey(field.value)}`;
  if (field.refactorBehavior === 'field') return `field|${nodeKind}|${field.key}|${valueKey(field.value)}`;
  return undefined;
}

export function buildFieldMatchIndex(files: ProjectModel['files']): Map<string, FieldOccurrence[]> {
  const index = new Map<string, FieldOccurrence[]>();
  for (const file of files) {
    for (const node of file.nodes) {
      for (const field of node.fields) {
        const key = fieldMatchKey(node.nodeKind, field);
        if (!key) continue;
        const list = index.get(key) ?? [];
        list.push({
          fileId: file.id,
          filePath: file.path,
          workspaceId: file.workspace.id,
          nodeId: node.id,
          nodeKind: node.nodeKind,
          location: node.location,
          field,
        });
        index.set(key, list);
      }
    }
  }
  return index;
}

export function findMatchingFields(project: ProjectModel, node: ProjectNode, field: ProjectField): FieldOccurrence[] {
  const key = fieldMatchKey(node.nodeKind, field);
  if (!key) return [];
  return (project.fieldMatchIndex.get(key) ?? []).filter(
    (item) => !(item.fileId === node.fileId && jsonPathKey(item.field.jsonPath) === jsonPathKey(field.jsonPath)),
  );
}
