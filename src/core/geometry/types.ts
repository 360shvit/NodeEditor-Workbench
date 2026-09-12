export type VisualFieldRenderer = 'SmallString' | 'Checkbox' | 'Float' | 'Int' | 'Enum' | 'List' | 'IntSlider' | 'TagMap';

export interface VisualFieldSpec {
  id: string;
  jsonKey: string;
  renderer: VisualFieldRenderer;
  label: string;
  requestedWidth?: number;
  itemType?: string;
}

export interface VisualPinSpec {
  id: string;
  label: string;
  type: string;
  multiple: boolean;
}

export interface NodeVisualSpec {
  nodeKind: string;
  title: string;
  fields: VisualFieldSpec[];
  /** Physical left side in ContentNode.xaml (workspace Inputs). */
  leftPins: VisualPinSpec[];
  /** Physical right side in ContentNode.xaml (workspace Outputs). */
  rightPins: VisualPinSpec[];
}

export type GeometryConfidence = 'exact' | 'derived' | 'dynamic' | 'fallback';

export interface NodePortGeometry {
  id: string;
  label: string;
  type: string;
  side: 'left' | 'right';
  index: number;
  /** Vertical connector center relative to the node's top-left world position. */
  centerY: number;
  confidence: GeometryConfidence;
}

export interface NodeGeometry {
  width: number;
  height: number;
  contentWidth: number;
  contentHeight: number;
  leftPinWidth: number;
  leftPinHeight: number;
  rightPinWidth: number;
  rightPinHeight: number;
  leftPorts: NodePortGeometry[];
  rightPorts: NodePortGeometry[];
  widthConfidence: GeometryConfidence;
  heightConfidence: GeometryConfidence;
  source: 'hytale-normal-profile' | 'unknown-node-fallback';
  reasons: string[];
}

export interface GeometrySummary {
  files: number;
  nodes: number;
  positioned: number;
  unpositioned: number;
  known: number;
  exactHeight: number;
  derived: number;
  dynamic: number;
  fallback: number;
}
