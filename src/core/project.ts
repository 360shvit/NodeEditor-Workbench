import { buildDiagnostics } from './diagnostics.js';
import { buildFieldIndex } from './fieldIndex.js';
import { buildFieldMatchIndex } from './matches.js';
import { parseProjectFile } from './parser.js';
import { buildSymbolIndex } from './symbolIndex.js';
import { buildSemanticReferences } from './semanticReferences.js';
import type { ProjectModel, SourceFileInput } from './types.js';

export interface ProjectBuildTraceSink {
  phase: (name: string, durationMs: number, data?: Record<string, unknown>) => void;
}

function nowMs(): number {
  return (globalThis as { performance?: { now: () => number } }).performance?.now() ?? Date.now();
}

function timed<T>(
  trace: ProjectBuildTraceSink | undefined,
  name: string,
  data: Record<string, unknown> | undefined,
  work: () => T,
): T {
  const started = nowMs();
  const value = work();
  trace?.phase(name, nowMs() - started, data);
  return value;
}

export function buildProject(
  inputs: SourceFileInput[],
  inventoryPaths: Iterable<string> = inputs.map((file) => file.path),
  trace?: ProjectBuildTraceSink,
): ProjectModel {
  // LoadedWorkspace already enforces the semantic loading policy. Structured semantic
  // documents are therefore parsed regardless of extension (for example Hytale instance.bson).
  const files = timed(trace, 'parse', { inputCount: inputs.length }, () => inputs.map(parseProjectFile));
  const fileMap = timed(trace, 'file-map', { fileCount: files.length }, () => new Map(files.map((file) => [file.id, file])));
  const symbolIndex = timed(trace, 'symbol-index', { fileCount: files.length }, () => buildSymbolIndex(files));
  const inventory = timed(trace, 'inventory-materialize', undefined, () => [...inventoryPaths]);
  const semanticReferences = timed(
    trace,
    'semantic-references',
    { fileCount: files.length, symbolCount: symbolIndex.size, inventoryFiles: inventory.length },
    () => buildSemanticReferences(files, symbolIndex, undefined, inventory),
  );
  const diagnostics = timed(
    trace,
    'diagnostics',
    { fileCount: files.length, semanticReferences: semanticReferences.length },
    () => buildDiagnostics(files, symbolIndex, semanticReferences),
  );
  const fieldMatchIndex = timed(trace, 'field-match-index', { fileCount: files.length }, () => buildFieldMatchIndex(files));
  const fieldIndex = timed(trace, 'field-index', { fileCount: files.length }, () => buildFieldIndex(files));
  const workspaces = timed(trace, 'workspace-index', { fileCount: files.length }, () => (
    [...new Map(files.map((file) => [file.workspace.id, file.workspace])).values()]
      .sort((a, b) => a.label.localeCompare(b.label))
  ));
  return { files, fileMap, symbolIndex, diagnostics, workspaces, fieldMatchIndex, fieldIndex, semanticReferences, inventoryPaths: inventory };
}
