import type { ProjectFile, SymbolOccurrence, SymbolRecord } from './types.js';

export function symbolKey(symbolType: string, name: string): string {
  return JSON.stringify([symbolType, name]);
}

export function buildSymbolIndex(files: ProjectFile[]): Map<string, SymbolRecord> {
  const index = new Map<string, SymbolRecord>();

  for (const file of files) {
    for (const node of file.nodes) {
      for (const field of node.fields) {
        if ((field.category !== 'import' && field.category !== 'export') || typeof field.value !== 'string') continue;
        const symbolType = field.symbolType || 'Unknown';
        const key = symbolKey(symbolType, field.value);
        const record = index.get(key) ?? {
          key: { symbolType, name: field.value },
          definitions: [],
          references: [],
        };
        const occurrence: SymbolOccurrence = {
          symbolType,
          name: field.value,
          fileId: file.id,
          filePath: file.path,
          nodeId: node.id,
          nodeKind: node.nodeKind,
          field: field.key,
          location: node.location,
          jsonPath: field.jsonPath,
        };
        if (field.category === 'export') record.definitions.push(occurrence);
        else record.references.push(occurrence);
        index.set(key, record);
      }
    }
  }

  return index;
}

export function findNameCollisions(index: Map<string, SymbolRecord>): Map<string, SymbolRecord[]> {
  const names = new Map<string, SymbolRecord[]>();
  for (const record of index.values()) {
    const list = names.get(record.key.name) ?? [];
    list.push(record);
    names.set(record.key.name, list);
  }
  for (const [name, records] of [...names]) {
    const types = new Set(records.map((record) => record.key.symbolType));
    if (types.size < 2) names.delete(name);
  }
  return names;
}
