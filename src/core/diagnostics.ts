import { findNameCollisions } from './symbolIndex.js';
import type { Diagnostic, ProjectFile, SemanticReference, SymbolRecord } from './types.js';

export function buildDiagnostics(files: ProjectFile[], symbolIndex: Map<string, SymbolRecord>, semanticReferences: SemanticReference[] = []): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const file of files) {
    if (file.parseError) {
      diagnostics.push({
        code: 'parse-error',
        severity: 'error',
        fileId: file.id,
        message: `${file.path}: ${file.parseError}`,
      });
    }
  }

  for (const record of symbolIndex.values()) {
    if (record.references.length > 0 && record.definitions.length === 0) {
      diagnostics.push({
        code: 'unresolved-import',
        severity: 'error',
        symbol: record.key,
        message: `No ${record.key.symbolType} export found for ${record.key.name}.`,
        related: record.references,
      });
    }
    if (record.definitions.length > 1) {
      diagnostics.push({
        code: 'duplicate-export',
        severity: 'error',
        symbol: record.key,
        message: `${record.key.name} has ${record.definitions.length} ${record.key.symbolType} exports.`,
        related: record.definitions,
      });
    }
    if (record.definitions.length > 0 && record.references.length === 0) {
      diagnostics.push({
        code: 'unused-export',
        severity: 'info',
        symbol: record.key,
        message: `${record.key.name} has no references in the loaded project.`,
        related: record.definitions,
      });
    }
  }

  for (const [name, records] of findNameCollisions(symbolIndex)) {
    diagnostics.push({
      code: 'type-name-collision',
      severity: 'warning',
      message: `${name} exists in multiple symbol types: ${records.map((r) => r.key.symbolType).join(', ')}.`,
      related: records.flatMap((r) => [...r.definitions, ...r.references]),
    });
  }

  // Generic symbol imports already have the established unresolved/duplicate-export diagnostics above.
  // The semantic layer adds diagnostics for relationships that are not represented by the SymbolIndex,
  // e.g. Instance → WorldStructure, WorldStructure → Biome and BlockMask.Import.
  const seenSemanticProblems = new Set<string>();
  for (const reference of semanticReferences) {
    if (reference.relation === 'symbol-import' || reference.status === 'resolved') continue;
    const problemKey = `${reference.source.fileId}:${reference.relation}:${reference.target.type}:${reference.target.name}:${reference.status}`;
    if (seenSemanticProblems.has(problemKey)) continue;
    seenSemanticProblems.add(problemKey);
    const resourceDependency = reference.target.kind === 'resource';
    if (reference.status === 'unresolved') {
      diagnostics.push({
        code: 'unresolved-semantic-reference',
        severity: resourceDependency ? 'warning' : 'error',
        fileId: reference.source.fileId,
        nodeId: reference.source.nodeId,
        semanticReferenceId: reference.id,
        message: `${reference.source.filePath}: ${reference.relation} references missing ${reference.target.type} “${reference.target.name}”.`,
      });
    } else {
      diagnostics.push({
        code: 'ambiguous-semantic-reference',
        severity: resourceDependency ? 'warning' : 'error',
        fileId: reference.source.fileId,
        nodeId: reference.source.nodeId,
        semanticReferenceId: reference.id,
        message: `${reference.source.filePath}: ${reference.relation} references ${reference.target.type} “${reference.target.name}”, but ${reference.candidates.length} candidates match.`,
      });
    }
  }

  return diagnostics;
}
