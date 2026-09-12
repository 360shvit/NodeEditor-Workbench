import type { ChangeSet, DiagnosticSeverity, ProjectModel } from '../core';

export interface FileStateNotice {
  paths: string[];
  invalidatedChangePaths?: string[];
}

export interface FileUiState {
  stagedCount: number;
  diagnosticCount: number;
  diagnosticSeverity?: DiagnosticSeverity;
  externallyReloaded: boolean;
  externalConflict: boolean;
}

export interface FileUiStateIndex {
  byPath: Map<string, Omit<FileUiState, 'externallyReloaded' | 'externalConflict'>>;
  externalPaths: string[];
  conflictPaths: string[];
}

const EMPTY_BASE: Omit<FileUiState, 'externallyReloaded' | 'externalConflict'> = {
  stagedCount: 0,
  diagnosticCount: 0,
};

export function normalizeFileStatePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
}

function pathAffected(filePath: string, changedPath: string): boolean {
  const file = normalizeFileStatePath(filePath);
  const changed = normalizeFileStatePath(changedPath);
  if (!file || !changed) return false;
  return file === changed || file.startsWith(`${changed}/`) || changed.startsWith(`${file}/`);
}

function strongerSeverity(left: DiagnosticSeverity | undefined, right: DiagnosticSeverity): DiagnosticSeverity {
  const rank: Record<DiagnosticSeverity, number> = { info: 0, warning: 1, error: 2 };
  return !left || rank[right] > rank[left] ? right : left;
}

export function buildFileUiStateIndex(
  project: ProjectModel,
  changeSet: ChangeSet,
  notice?: FileStateNotice,
): FileUiStateIndex {
  const byPath = new Map<string, Omit<FileUiState, 'externallyReloaded' | 'externalConflict'>>();
  const pathForFileId = new Map(project.files.map((file) => [file.id, file.path]));

  const ensure = (path: string) => {
    const key = normalizeFileStatePath(path);
    const existing = byPath.get(key);
    if (existing) return existing;
    const next = { ...EMPTY_BASE };
    byPath.set(key, next);
    return next;
  };

  for (const change of changeSet.changes) {
    ensure(change.filePath).stagedCount += 1;
  }

  for (const diagnostic of project.diagnostics) {
    if (!diagnostic.fileId) continue;
    const path = pathForFileId.get(diagnostic.fileId);
    if (!path) continue;
    const state = ensure(path);
    state.diagnosticCount += 1;
    state.diagnosticSeverity = strongerSeverity(state.diagnosticSeverity, diagnostic.severity);
  }

  return {
    byPath,
    externalPaths: (notice?.paths ?? []).map(normalizeFileStatePath).filter(Boolean),
    conflictPaths: (notice?.invalidatedChangePaths ?? []).map(normalizeFileStatePath).filter(Boolean),
  };
}

export function fileUiStateForPath(index: FileUiStateIndex, path: string): FileUiState {
  const key = normalizeFileStatePath(path);
  const base = index.byPath.get(key) ?? EMPTY_BASE;
  return {
    ...base,
    externallyReloaded: index.externalPaths.some((changed) => pathAffected(key, changed)),
    externalConflict: index.conflictPaths.some((changed) => pathAffected(key, changed)),
  };
}

export function fileUiStateTooltip(state: FileUiState): string[] {
  const lines: string[] = [];
  if (state.stagedCount) lines.push(`${state.stagedCount} staged change${state.stagedCount === 1 ? '' : 's'}`);
  if (state.diagnosticCount) lines.push(`${state.diagnosticCount} diagnostic${state.diagnosticCount === 1 ? '' : 's'}${state.diagnosticSeverity ? ` · highest: ${state.diagnosticSeverity}` : ''}`);
  if (state.externalConflict) lines.push('External conflict · affected staged changes were cleared');
  else if (state.externallyReloaded) lines.push('Reloaded after an external filesystem change');
  return lines;
}
