import { classifyField, isScalar, normalizeNodeKind } from './schemaRegistry.js';
import { indexScalarSpans } from './textPatcher.js';
import { jsonPathKey } from './jsonPath.js';
import { detectWorkspace } from './workspace.js';
import type { JsonObject, JsonValue, NodeLocation, ProjectFile, ProjectNode, SourceFileInput } from './types.js';

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function looksLikeNode(value: JsonObject): boolean {
  return typeof value.$NodeId === 'string' || (typeof value.Type === 'string' && ('Inputs' in value || '$Position' in value));
}

function collectNodes(
  value: JsonValue,
  fileId: string,
  location: NodeLocation,
  path: Array<string | number>,
  result: ProjectNode[],
  seen: Set<string>,
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectNodes(item, fileId, location, [...path, index], result, seen));
    return;
  }
  if (!isObject(value)) return;

  if (looksLikeNode(value)) {
    const rawId = typeof value.$NodeId === 'string' ? value.$NodeId : `${String(value.Type ?? 'Unknown')}@${jsonPathKey(path)}`;
    const dedupeKey = `${location}:${rawId}`;
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      const type = typeof value.Type === 'string' ? value.Type : 'Unknown';
      const nodeKind = normalizeNodeKind(typeof value.$NodeId === 'string' ? value.$NodeId : undefined, type);
      const fields = Object.entries(value)
        .flatMap(([key, fieldValue]) => isScalar(fieldValue)
          ? [classifyField(nodeKind, type, key, fieldValue, [...path, key])]
          : [])
        .filter((field) => field.category !== 'structural');

      result.push({
        id: rawId,
        nodeKind,
        type,
        fileId,
        location,
        jsonPath: path,
        fields,
      });
    }
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === '$NodeEditorMetadata') continue;
    collectNodes(child, fileId, location, [...path, key], result, seen);
  }
}

function collectFloatingNodes(root: JsonValue, fileId: string, result: ProjectNode[], seen: Set<string>): void {
  if (!isObject(root)) return;
  const metadata = root.$NodeEditorMetadata;
  if (!isObject(metadata)) return;
  const floating = metadata.$FloatingNodes;
  if (!Array.isArray(floating)) return;
  floating.forEach((node, index) => {
    collectNodes(node, fileId, 'floating', ['$NodeEditorMetadata', '$FloatingNodes', index], result, seen);
  });
}

export function parseProjectFile(input: SourceFileInput, index: number): ProjectFile {
  const fileId = `file:${index}:${input.path}`;
  const name = input.path.split('/').at(-1) || input.path;
  try {
    const raw = JSON.parse(input.text) as JsonValue;
    const nodes: ProjectNode[] = [];
    const seen = new Set<string>();
    collectNodes(raw, fileId, 'live', [], nodes, seen);
    collectFloatingNodes(raw, fileId, nodes, seen);
    const detectedWorkspace = detectWorkspace(input.path, raw);
    const workspace = detectedWorkspace.source === 'content' ? detectedWorkspace : (input.workspaceHint ?? detectedWorkspace);
    return { id: fileId, path: input.path, name, sourceText: input.text, scalarSpans: indexScalarSpans(input.text), workspace, raw, nodes };
  } catch (error) {
    return {
      id: fileId,
      path: input.path,
      name,
      sourceText: input.text,
      scalarSpans: new Map(),
      workspace: input.workspaceHint ?? detectWorkspace(input.path),
      raw: null,
      nodes: [],
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}
