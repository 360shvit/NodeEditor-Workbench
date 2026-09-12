import type { JsonObject, JsonPrimitive, JsonValue, ProjectFile, ProjectNode } from '../types.js';

export interface EditorNodePosition {
  x: number;
  y: number;
  xPath: Array<string | number>;
  yPath: Array<string | number>;
}

export interface EditorNodeMetadata {
  fileId: string;
  nodeId: string;
  title?: string;
  position?: EditorNodePosition;
}

export interface EditorRectMetadata {
  fileId: string;
  id: string;
  index: number;
  name?: string;
  position?: EditorNodePosition;
  width?: number;
  height?: number;
  widthPath?: Array<string | number>;
  heightPath?: Array<string | number>;
  jsonPath: Array<string | number>;
}

export interface EditorGroupMetadata extends EditorRectMetadata {
  kind: 'group';
}

export interface EditorCommentMetadata extends EditorRectMetadata {
  kind: 'comment';
  text?: string;
  fontSize?: number;
}

export interface EditorMetadataFileIndex {
  fileId: string;
  nodes: Map<string, EditorNodeMetadata>;
  groups: EditorGroupMetadata[];
  comments: EditorCommentMetadata[];
  commentCount: number;
  groupCount: number;
  linkCount: number;
  workspaceId?: string;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function arrayCount(value: JsonValue | undefined): number {
  return Array.isArray(value) ? value.length : 0;
}

function numberValue(value: JsonValue | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function primitiveString(value: JsonValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function rectMetadata(
  file: ProjectFile,
  value: JsonValue,
  kind: 'group' | 'comment',
  index: number,
): EditorGroupMetadata | EditorCommentMetadata | undefined {
  if (!isObject(value)) return undefined;
  const jsonPath: Array<string | number> = ['$NodeEditorMetadata', kind === 'group' ? '$Groups' : '$Comments', index];
  const positionValue = isObject(value.$Position) ? value.$Position : undefined;
  const x = numberValue(positionValue?.$x);
  const y = numberValue(positionValue?.$y);
  const width = numberValue(value.$width);
  const height = numberValue(value.$height);
  const common: EditorRectMetadata = {
    fileId: file.id,
    id: `${file.id}:${kind}:${index}`,
    index,
    name: primitiveString(value.$name) ?? primitiveString(value.$Title),
    jsonPath,
    position: x !== undefined && y !== undefined ? {
      x,
      y,
      xPath: [...jsonPath, '$Position', '$x'],
      yPath: [...jsonPath, '$Position', '$y'],
    } : undefined,
    width,
    height,
    widthPath: width !== undefined ? [...jsonPath, '$width'] : undefined,
    heightPath: height !== undefined ? [...jsonPath, '$height'] : undefined,
  };
  if (kind === 'group') return { ...common, kind: 'group' };
  return {
    ...common,
    kind: 'comment',
    text: primitiveString(value.$text),
    fontSize: numberValue(value.$fontSize),
  };
}

export function buildEditorMetadataForFile(file: ProjectFile): EditorMetadataFileIndex {
  const nodes = new Map<string, EditorNodeMetadata>();
  const raw = isObject(file.raw) ? file.raw : undefined;
  const metadata = raw && isObject(raw.$NodeEditorMetadata) ? raw.$NodeEditorMetadata : undefined;
  const nodeMap = metadata && isObject(metadata.$Nodes) ? metadata.$Nodes : undefined;

  if (nodeMap) {
    for (const [nodeId, entry] of Object.entries(nodeMap)) {
      if (!isObject(entry)) continue;
      const position = isObject(entry.$Position) ? entry.$Position : undefined;
      const x = position?.$x;
      const y = position?.$y;
      nodes.set(nodeId, {
        fileId: file.id,
        nodeId,
        title: typeof entry.$Title === 'string' ? entry.$Title : undefined,
        position: typeof x === 'number' && typeof y === 'number' ? {
          x,
          y,
          xPath: ['$NodeEditorMetadata', '$Nodes', nodeId, '$Position', '$x'],
          yPath: ['$NodeEditorMetadata', '$Nodes', nodeId, '$Position', '$y'],
        } : undefined,
      });
    }
  }

  const groups = Array.isArray(metadata?.$Groups)
    ? metadata.$Groups.map((value, index) => rectMetadata(file, value, 'group', index)).filter((value): value is EditorGroupMetadata => Boolean(value))
    : [];
  const comments = Array.isArray(metadata?.$Comments)
    ? metadata.$Comments.map((value, index) => rectMetadata(file, value, 'comment', index)).filter((value): value is EditorCommentMetadata => Boolean(value))
    : [];

  return {
    fileId: file.id,
    nodes,
    groups,
    comments,
    commentCount: comments.length,
    groupCount: groups.length,
    linkCount: metadata ? arrayCount(metadata.$Links) : 0,
    workspaceId: metadata && typeof metadata.$WorkspaceID === 'string' ? metadata.$WorkspaceID : undefined,
  };
}

export function buildEditorMetadataIndex(files: ProjectFile[]): Map<string, EditorMetadataFileIndex> {
  return new Map(files.map((file) => [file.id, buildEditorMetadataForFile(file)]));
}

export function editorMetadataForNode(file: ProjectFile, node: ProjectNode): EditorNodeMetadata | undefined {
  return buildEditorMetadataForFile(file).nodes.get(node.id);
}

export function editorScalarValue(file: ProjectFile, path: Array<string | number>): JsonPrimitive | undefined {
  let current: JsonValue | undefined = file.raw;
  for (const part of path) {
    if (typeof part === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[part];
    } else {
      if (!isObject(current)) return undefined;
      current = current[part];
    }
  }
  return current === null || ['string', 'number', 'boolean'].includes(typeof current) ? current as JsonPrimitive : undefined;
}
