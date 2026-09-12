import type { FieldCategory, JsonPrimitive, ProjectField, RefactorBehavior } from './types.js';

const STRUCTURAL_FIELDS = new Set([
  '$NodeId', '$Position', '$Title', '$NodeEditorMetadata', '$FloatingNodes', '$Links', '$Groups', '$Comments', 'Inputs', 'Type',
]);

export interface NodeFieldRuleContext {
  nodeKind: string;
  type: string;
  key: string;
  value: JsonPrimitive;
}

export interface NodeFieldRuleResult {
  category: FieldCategory;
  refactorBehavior: RefactorBehavior;
  symbolType?: string;
}

export type NodeFieldRule = (context: NodeFieldRuleContext) => NodeFieldRuleResult | undefined;

export function normalizeNodeKind(nodeId: string | undefined, type: string | undefined): string {
  if (nodeId) {
    return nodeId.replace(/-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, '');
  }
  return type || 'Unknown';
}

export function inferSymbolType(nodeKind: string): string | undefined {
  const parts = nodeKind.split('.');
  if (parts.length > 1) return parts.at(-1);

  // Legacy generator ids used class-style names such as ImportedDensityNode-<uuid>.
  const legacyProviders = ['Density', 'VectorProvider', 'Curve', 'MaterialProvider', 'BlockSet', 'Pattern'];
  return legacyProviders.find((provider) => nodeKind.includes(provider));
}

function isImportedNode(nodeKind: string, type: string): boolean {
  return nodeKind.startsWith('Imported') || type === 'Imported';
}

export class NodeSchemaRegistry {
  private readonly rules: NodeFieldRule[] = [];

  register(rule: NodeFieldRule): this {
    this.rules.unshift(rule);
    return this;
  }

  classify(context: NodeFieldRuleContext): NodeFieldRuleResult {
    if (STRUCTURAL_FIELDS.has(context.key) || context.key.startsWith('$')) {
      return { category: 'structural', refactorBehavior: 'field' };
    }

    for (const rule of this.rules) {
      const result = rule(context);
      if (result) return result;
    }

    return { category: 'property', refactorBehavior: 'field' };
  }
}

export const defaultNodeSchemaRegistry = new NodeSchemaRegistry()
  .register(({ nodeKind, key, value }) => key === 'ExportAs' && typeof value === 'string' && value.trim() !== ''
    ? { category: 'export', refactorBehavior: 'symbol', symbolType: inferSymbolType(nodeKind) }
    : undefined)
  .register(({ nodeKind, type, key, value }) => key === 'Name' && isImportedNode(nodeKind, type) && typeof value === 'string' && value.trim() !== ''
    ? { category: 'import', refactorBehavior: 'symbol', symbolType: inferSymbolType(nodeKind) }
    : undefined)
  .register(({ key }) => key === 'Seed'
    ? { category: 'seed', refactorBehavior: 'literal' }
    : undefined);

export function classifyField(
  nodeKind: string,
  type: string,
  key: string,
  value: JsonPrimitive,
  jsonPath: Array<string | number>,
  registry: NodeSchemaRegistry = defaultNodeSchemaRegistry,
): ProjectField {
  const classification = registry.classify({ nodeKind, type, key, value });
  return { key, value, ...classification, jsonPath };
}

export function isScalar(value: unknown): value is JsonPrimitive {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}
