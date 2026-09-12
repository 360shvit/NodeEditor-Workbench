import type { Diagnostic, ProjectModel } from './types.js';

function diagnosticKey(item: Diagnostic): string {
  const symbol = item.symbol ? `${item.symbol.symbolType}:${item.symbol.name}` : '';
  return `${item.code}|${item.fileId ?? ''}|${item.nodeId ?? ''}|${symbol}|${item.message}`;
}

export interface ValidationDiff {
  added: Diagnostic[];
  removed: Diagnostic[];
  addedErrors: Diagnostic[];
  addedWarnings: Diagnostic[];
  safe: boolean;
}

export function compareDiagnostics(before: ProjectModel, after: ProjectModel): ValidationDiff {
  const beforeMap = new Map(before.diagnostics.map((item) => [diagnosticKey(item), item]));
  const afterMap = new Map(after.diagnostics.map((item) => [diagnosticKey(item), item]));
  const added = [...afterMap.entries()].filter(([key]) => !beforeMap.has(key)).map(([, item]) => item);
  const removed = [...beforeMap.entries()].filter(([key]) => !afterMap.has(key)).map(([, item]) => item);
  const addedErrors = added.filter((item) => item.severity === 'error');
  const addedWarnings = added.filter((item) => item.severity === 'warning');
  return { added, removed, addedErrors, addedWarnings, safe: addedErrors.length === 0 };
}
