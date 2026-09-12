export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject { [key: string]: JsonValue; }

export type NodeLocation = 'live' | 'floating';
export type WorkspaceDetectionSource = 'path' | 'content' | 'manual';

export interface WorkspaceInfo {
  /** Stable, normalized id. Dynamic for folders below HytaleGenerator. */
  id: string;
  /** Human readable label shown in the UI. */
  label: string;
  source: WorkspaceDetectionSource;
  matchedSegment?: string;
  /** True when the workspace was derived from a HytaleGenerator child folder. */
  worldgen: boolean;
}
export type FieldCategory = 'import' | 'export' | 'seed' | 'property' | 'structural';
export type RefactorBehavior = 'symbol' | 'literal' | 'field';

export interface SourceFileInput {
  path: string;
  text: string;
  workspaceHint?: WorkspaceInfo;
}

export interface ProjectField {
  key: string;
  value: JsonPrimitive;
  category: FieldCategory;
  refactorBehavior: RefactorBehavior;
  symbolType?: string;
  jsonPath: Array<string | number>;
}

export interface ProjectNode {
  id: string;
  nodeKind: string;
  type: string;
  fileId: string;
  location: NodeLocation;
  jsonPath: Array<string | number>;
  fields: ProjectField[];
}

export interface ScalarSpan { start: number; end: number; }

export interface ProjectFile {
  id: string;
  path: string;
  name: string;
  sourceText: string;
  scalarSpans: Map<string, ScalarSpan>;
  workspace: WorkspaceInfo;
  raw: JsonValue;
  nodes: ProjectNode[];
  parseError?: string;
}

export interface SymbolKey {
  symbolType: string;
  name: string;
}

export interface SymbolOccurrence {
  symbolType: string;
  name: string;
  fileId: string;
  filePath: string;
  nodeId: string;
  nodeKind: string;
  field: string;
  location: NodeLocation;
  jsonPath: Array<string | number>;
}

export interface SymbolRecord {
  key: SymbolKey;
  definitions: SymbolOccurrence[];
  references: SymbolOccurrence[];
}

export type SemanticReferenceStatus = 'resolved' | 'unresolved' | 'ambiguous';
export type SemanticReferenceRelation =
  | 'instance-worldstructure'
  | 'worldstructure-biome'
  | 'worldstructure-density'
  | 'biome-density'
  | 'symbol-import'
  | 'blockmask-import'
  | 'biome-environment'
  | 'assignment-prefab';

export interface SemanticReferenceSource {
  fileId: string;
  filePath: string;
  label?: string;
  nodeId?: string;
  jsonPath?: Array<string | number>;
  /** Optional owning exported symbol for nested graph imports. */
  ownerSymbol?: SymbolKey;
}

export interface SemanticReferenceCandidate {
  fileId?: string;
  filePath: string;
  label: string;
  nodeId?: string;
  symbolType?: string;
  symbolName?: string;
  resourceKind?: 'environment' | 'prefab';
  resourcePath?: string;
}

export interface SemanticReferenceTarget {
  kind: 'file' | 'symbol' | 'resource';
  type: string;
  name: string;
  fileId?: string;
  filePath?: string;
  nodeId?: string;
  symbolType?: string;
  symbolName?: string;
  resourceKind?: 'environment' | 'prefab';
  resourcePath?: string;
}

export interface SemanticReference {
  id: string;
  extractorId: string;
  relation: SemanticReferenceRelation;
  status: SemanticReferenceStatus;
  source: SemanticReferenceSource;
  target: SemanticReferenceTarget;
  candidates: SemanticReferenceCandidate[];
}

export type DiagnosticSeverity = 'info' | 'warning' | 'error';
export type DiagnosticCode =
  | 'unresolved-import'
  | 'duplicate-export'
  | 'unused-export'
  | 'type-name-collision'
  | 'parse-error'
  | 'unresolved-semantic-reference'
  | 'ambiguous-semantic-reference';

export interface Diagnostic {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  message: string;
  fileId?: string;
  nodeId?: string;
  symbol?: SymbolKey;
  related?: SymbolOccurrence[];
  semanticReferenceId?: string;
}

export type ProjectSearchResultKind = 'file' | 'symbol' | 'node' | 'field' | 'resource';

export interface ProjectSearchResult {
  id: string;
  kind: ProjectSearchResultKind;
  title: string;
  subtitle: string;
  fileId?: string;
  nodeId?: string;
  location?: NodeLocation;
  symbol?: SymbolKey;
  resourceKind?: 'environment' | 'prefab';
  resourceName?: string;
  resourcePath?: string;
}

export interface FieldOccurrence {
  fileId: string;
  filePath: string;
  workspaceId: string;
  nodeId: string;
  nodeKind: string;
  location: NodeLocation;
  field: ProjectField;
}

/** Project-wide presence index for primitive, non-semantic node values. */
export interface FieldIndexEntry {
  key: string;
  occurrences: FieldOccurrence[];
}

/** UI-facing statistics derived from the field index for the current global scope. */
export interface FieldStat {
  key: string;
  /** Scalar occurrences in the current scope. */
  count: number;
  /** Unique nodes carrying this field. */
  nodeCount: number;
  /** All nodes in the scope, including nodes without generic properties. */
  scopeNodeCount: number;
  /** Nodes in the scope that have at least one filterable generic property. */
  filterableNodeCount: number;
  /** Presence among filterable nodes. */
  frequency: number;
  nodeTypeCount: number;
  scopeNodeTypeCount: number;
  nodeTypeCoverage: number;
  fileCount: number;
  scopeFileCount: number;
  fileCoverage: number;
  /** Share of this field's nodes contributed by its single most common node kind. */
  dominantNodeTypeShare: number;
  /** Diversity-oriented relevance score used for Broad Quick Filters. */
  broadScore: number;
  /** Current-snapshot presence score used for Context Quick Filters. */
  contextScore: number;
  /** Presentation heuristic for grouping fields in the full picker. */
  common: boolean;
}

export type SearchIsPredicate = 'import' | 'export' | 'unresolved' | 'changed' | 'live' | 'floating';

export interface ParsedSearchQuery {
  raw: string;
  terms: string[];
  fields: string[];
  values: string[];
  workspaces: string[];
  nodeTypes: string[];
  locations: NodeLocation[];
  is: SearchIsPredicate[];
  unknownOperators: Array<{ name: string; value: string }>;
}

export interface SearchNodeMatch {
  fileId: string;
  nodeId: string;
  location: NodeLocation;
  /** Paths of fields that matched the text/query. Used to combine search with the normal field filters. */
  matchedFieldPaths: string[];
  matchedNodeMetadata: boolean;
}

export interface SearchSnapshot {
  query: string;
  parsed: ParsedSearchQuery;
  matches: SearchNodeMatch[];
  total: number;
  truncated: boolean;
}

export interface ProjectModel {
  files: ProjectFile[];
  fileMap: Map<string, ProjectFile>;
  symbolIndex: Map<string, SymbolRecord>;
  diagnostics: Diagnostic[];
  workspaces: WorkspaceInfo[];
  fieldMatchIndex: Map<string, FieldOccurrence[]>;
  fieldIndex: Map<string, FieldIndexEntry>;
  /** Typed, versioned cross-file/symbol/resource relationships shared by Graph and Diagnostics. */
  semanticReferences: SemanticReference[];
  /** Inventory-only paths used to resolve resource dependencies without loading resource contents. */
  inventoryPaths: string[];
}

export type ChangeSource = 'manual' | 'symbol-propagation' | 'suggestion' | 'layout';

export interface Change {
  id: string;
  fileId: string;
  filePath: string;
  nodeId: string;
  field: string;
  jsonPath: Array<string | number>;
  oldValue: JsonPrimitive;
  newValue: JsonPrimitive;
  location: NodeLocation;
  source: ChangeSource;
  symbolType?: string;
}

export interface RefactorRule {
  id: string;
  kind: 'symbolRename' | 'fieldValue';
  oldValue: JsonPrimitive;
  newValue: JsonPrimitive;
  symbolType?: string;
  nodeKind?: string;
  field?: string;
}

export interface ChangeSet {
  changes: Change[];
  rules: RefactorRule[];
}

export interface RenameSymbolOptions {
  includeLive?: boolean;
  includeFloating?: boolean;
  includeDefinition?: boolean;
  includeReferences?: boolean;
}

export interface ApplyResult {
  project: ProjectModel;
  changedFileIds: string[];
}
