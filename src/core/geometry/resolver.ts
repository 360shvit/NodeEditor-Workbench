import type { JsonObject, JsonValue, ProjectFile, ProjectNode } from '../types.js';
import type { EditorNodeMetadata } from '../graph/editorMetadata.js';
import { HYTALE_GENERATOR_JAVA_VISUAL_CATALOG } from './hytaleGeneratorJavaCatalog.generated.js';
import { HYTALE_NORMAL_GEOMETRY_PROFILE as P } from './hytaleNormalProfile.js';
import type { GeometryConfidence, NodeGeometry, NodePortGeometry, NodeVisualSpec, VisualFieldSpec, VisualPinSpec } from './types.js';

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function valueAtPath(root: JsonValue, path: Array<string | number>): JsonValue | undefined {
  let current: JsonValue | undefined = root;
  for (const part of path) {
    if (typeof part === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[part];
    } else {
      if (!isObject(current)) return undefined;
      current = current[part];
    }
    if (current === undefined) return undefined;
  }
  return current;
}

function rawNode(file: ProjectFile, node: ProjectNode): JsonObject | undefined {
  const value = valueAtPath(file.raw, node.jsonPath);
  return isObject(value) ? value : undefined;
}

function textWidth(text: string, title = false): number {
  return Math.ceil(text.length * (title ? P.text.titleAverageGlyphWidth : P.text.averageGlyphWidth));
}

function requestedWidth(field: VisualFieldSpec): number {
  return field.requestedWidth ?? P.field.defaultControlWidth;
}

function fixedFieldWidth(field: VisualFieldSpec): number {
  switch (field.renderer) {
    case 'Checkbox':
      return P.field.standardMarginX * 2 + P.field.labelColumnWidth + P.field.checkboxControlWidth;
    case 'IntSlider':
      // Slider row is horizontal and does not use the fixed 200-wide label column.
      return P.field.standardMarginX * 2 + textWidth(field.label) + P.field.sliderGapX * 4 + requestedWidth(field) + 42;
    case 'List':
      return P.field.standardMarginX * 2 + 30 + requestedWidth(field) + 90 + 40;
    case 'TagMap':
      return 420;
    default:
      return P.field.standardMarginX * 2 + P.field.labelColumnWidth + requestedWidth(field);
  }
}

function fieldHeight(field: VisualFieldSpec, raw: JsonObject | undefined): { height: number; confidence: GeometryConfidence; reason?: string } {
  switch (field.renderer) {
    case 'IntSlider':
      return { height: P.field.sliderHeight + P.field.sliderMarginY * 2, confidence: 'derived' };
    case 'List': {
      const value = raw?.[field.jsonKey];
      const count = Array.isArray(value) ? value.length : 0;
      const height = P.field.listOuterTop + P.field.listOuterBottom
        + P.field.listGroupPaddingY * 2
        + P.field.listHeaderEstimate
        + P.field.listAddButtonEstimate
        + count * P.field.listItemEstimate;
      return { height, confidence: 'dynamic', reason: `${field.id}: list(${count})` };
    }
    case 'TagMap': {
      const value = raw?.[field.jsonKey];
      const count = isObject(value) ? Object.keys(value).length : Array.isArray(value) ? value.length : 0;
      return {
        height: P.field.tagMapFallbackHeight + Math.max(0, count - 1) * P.field.listItemEstimate,
        confidence: 'dynamic',
        reason: `${field.id}: tag-map(${count})`,
      };
    }
    default:
      return { height: P.field.standardHeight + P.field.standardMarginY * 2, confidence: 'exact' };
  }
}

function pinWidth(pin: VisualPinSpec): number {
  const label = pin.label || '';
  return P.pin.connectorWidth + P.pin.contentGap + textWidth(label) + (label ? 4 : 0);
}

function pinsGeometry(pins: VisualPinSpec[]): { width: number; height: number } {
  return {
    width: pins.reduce((max, pin) => Math.max(max, pinWidth(pin)), 0),
    height: pins.length * (P.pin.connectorHeight + P.pin.marginY * 2),
  };
}

function portGeometry(
  pins: VisualPinSpec[],
  side: 'left' | 'right',
  bodyTop: number,
): NodePortGeometry[] {
  const rowHeight = P.pin.connectorHeight + P.pin.marginY * 2;
  return pins.map((pin, index) => ({
    id: pin.id,
    label: pin.label,
    type: pin.type,
    side,
    index,
    centerY: bodyTop + P.pin.marginY + P.pin.connectorHeight / 2 + index * rowHeight,
    // The connector row dimensions come from the recovered XAML. The exact
    // vertical ItemsControl alignment is not persisted in JSON, so the world
    // offset remains explicitly derived rather than pretending to be exact.
    confidence: 'derived',
  }));
}

function maxConfidence(a: GeometryConfidence, b: GeometryConfidence): GeometryConfidence {
  const order: GeometryConfidence[] = ['exact', 'derived', 'dynamic', 'fallback'];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

function commentHeight(raw: JsonObject | undefined, contentWidth: number): { height: number; dynamic: boolean } {
  const comment = typeof raw?.$Comment === 'string' ? raw.$Comment.trim() : '';
  if (!comment) return { height: 0, dynamic: false };
  const usable = Math.max(120, contentWidth - 12);
  const charsPerLine = Math.max(12, Math.floor(usable / P.text.averageGlyphWidth));
  const lines = comment.split(/\r?\n/).reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
  // CommentBlock Padding 6/4 plus a small text-control allowance.
  return { height: 8 + lines * P.text.lineHeight, dynamic: true };
}

const LEGACY_VISUAL_ALIASES: Record<string, string> = {
  CurvePoint: 'CurvePoint.Curve',
  ManualCurve: 'Manual.Curve',
  ImportedCurve: 'Imported.Curve',
  Point3D: 'Decimal.Vector3d',
  ListPositions: 'List.Positions',
  DensityPCNReturnType: 'Density.ReturnType.PositionsCellNoise.Density',
  'Delimiter.DensityPCNReturnType': 'Delimiter.Density.ReturnType.PositionsCellNoise.Density',
  PCNDistanceFunction: 'DistanceFunction.PositionsCellNoise.Density',
  Terrain: 'Terrain.Biome',
  DelimiterFieldFunctionMP: 'Delimiter.FieldFunction.MaterialProvider',
};

function legacyVisualAlias(node: ProjectNode): string | undefined {
  const direct = LEGACY_VISUAL_ALIASES[node.nodeKind];
  if (direct) return direct;
  if (node.type !== 'Unknown' && /DensityNode$/i.test(node.nodeKind)) {
    const candidate = `${node.type}.Density`;
    if (HYTALE_GENERATOR_JAVA_VISUAL_CATALOG[candidate]) return candidate;
  }
  if (node.type !== 'Unknown' && /MaterialProvider$/i.test(node.nodeKind)) {
    const candidate = `${node.type}.MaterialProvider`;
    if (HYTALE_GENERATOR_JAVA_VISUAL_CATALOG[candidate]) return candidate;
  }
  return undefined;
}

export function visualSpecForNode(node: ProjectNode): NodeVisualSpec | undefined {
  const exact = HYTALE_GENERATOR_JAVA_VISUAL_CATALOG[node.nodeKind];
  if (exact) return exact;
  const alias = legacyVisualAlias(node);
  return alias ? HYTALE_GENERATOR_JAVA_VISUAL_CATALOG[alias] : undefined;
}

export function resolveNodeGeometry(file: ProjectFile, node: ProjectNode, metadata?: EditorNodeMetadata): NodeGeometry {
  const spec = visualSpecForNode(node);
  if (!spec) {
    return {
      width: P.fallback.width,
      height: P.fallback.height,
      contentWidth: P.fallback.width,
      contentHeight: P.fallback.height,
      leftPinWidth: 0,
      leftPinHeight: 0,
      rightPinWidth: 0,
      rightPinHeight: 0,
      leftPorts: [],
      rightPorts: [],
      widthConfidence: 'fallback',
      heightConfidence: 'fallback',
      source: 'unknown-node-fallback',
      reasons: ['node kind is not present in the bundled HytaleGenerator Java visual catalog'],
    };
  }

  const raw = rawNode(file, node);
  const reasons: string[] = [];
  const legacyAliased = spec.nodeKind !== node.nodeKind;
  if (legacyAliased) reasons.push(`legacy visual alias: ${node.nodeKind} → ${spec.nodeKind}`);
  let contentHeight = 0;
  let contentWidth = 0;
  let heightConfidence: GeometryConfidence = legacyAliased ? 'derived' : 'exact';
  for (const field of spec.fields) {
    const resolved = fieldHeight(field, raw);
    contentHeight += resolved.height;
    contentWidth = Math.max(contentWidth, fixedFieldWidth(field));
    heightConfidence = maxConfidence(heightConfidence, resolved.confidence);
    if (resolved.reason) reasons.push(resolved.reason);
  }

  const left = pinsGeometry(spec.leftPins);
  const right = pinsGeometry(spec.rightPins);
  const bodyInnerHeight = Math.max(contentHeight, left.height, right.height);
  const bodyChromeHeight = P.node.bodyMarginY * 2 + P.node.bodyBorderBottom;
  const headerBaseHeight = P.node.headerActionHeight + P.node.titleRowBottomMargin + P.node.headerPaddingY * 2;
  const comment = commentHeight(raw, Math.max(contentWidth, 260));
  if (comment.dynamic) {
    heightConfidence = maxConfidence(heightConfidence, 'dynamic');
    reasons.push('$Comment: wrapped text');
  }
  const height = P.node.outerBorder * 2 + headerBaseHeight + comment.height + bodyChromeHeight + bodyInnerHeight;
  const bodyTop = P.node.outerBorder + headerBaseHeight + comment.height + P.node.bodyMarginY;
  const leftPorts = portGeometry(spec.leftPins, 'left', bodyTop);
  const rightPorts = portGeometry(spec.rightPins, 'right', bodyTop);

  const bodyWidth = P.node.outerBorder * 2
    + P.node.bodyBorderX * 2
    + left.width
    + P.node.contentPaddingX * 2
    + contentWidth
    + right.width;
  const title = metadata?.title || spec.title;
  const headerActionsWidth = P.node.headerActionWidth * 2 + 10;
  const headerWidth = P.node.outerBorder * 2 + P.node.headerPaddingX * 2 + textWidth(title, true) + 8 + headerActionsWidth;
  const width = Math.max(bodyWidth, headerWidth);

  // Width depends on Noesis font metrics and optional pin content. Keep it explicitly derived.
  const widthConfidence: GeometryConfidence = 'derived';
  if (spec.fields.some((field) => field.renderer === 'SmallString')) reasons.push('SmallString helper buttons may expand width when visible');
  if (spec.leftPins.length || spec.rightPins.length) reasons.push('pin label width uses bundled text-metric estimate');

  return {
    width,
    height,
    contentWidth,
    contentHeight,
    leftPinWidth: left.width,
    leftPinHeight: left.height,
    rightPinWidth: right.width,
    rightPinHeight: right.height,
    leftPorts,
    rightPorts,
    widthConfidence,
    heightConfidence,
    source: 'hytale-normal-profile',
    reasons,
  };
}
