import { flushPersistentRuntimeLog, recordRuntimeEvent, recordRuntimeMetric } from '../support/runtimeDiagnostics';
export interface DesktopSemanticFileInfo {
  path: string;
  format: 'node-editor' | 'structured-json' | 'structured-text' | string;
  domain: string;
  role: 'graph-document' | 'flow-orchestrator' | 'flow-entrypoint' | 'runtime-config' | 'workspace-config' | 'known-json' | string;
  workspace?: string;
  workspaceId?: string;
  discoverySource: 'default' | 'detector' | 'manual-probe' | string;
  detector: string;
}


export type DesktopUpdateChannel = 'stable' | 'preview';

export interface DesktopUpdateCheckResult {
  configured: boolean;
  channel: DesktopUpdateChannel;
  currentVersion: string;
  available: boolean;
  version?: string;
  notes?: string;
  pubDate?: string;
  reason?: string;
}

export interface DesktopUpdateInstallResult {
  started: boolean;
  version: string;
}

export interface DesktopNativeTracePhase {
  name: string;
  durationMs: number;
  data?: Record<string, number | string | boolean>;
}

export interface DesktopNativeTrace {
  traceId?: string;
  phases: DesktopNativeTracePhase[];
}

export interface DesktopProjectScan {
  root: string;
  label: string;
  files: Array<{ path: string; text: string }>;
  entries: string[];
  semanticFiles: DesktopSemanticFileInfo[];
  discoveryRoots: string[];
  nativeTrace?: DesktopNativeTrace;
}

export interface DesktopProjectProbeResult {
  scan: DesktopProjectScan;
  probedRoot: string;
  detected: DesktopSemanticFileInfo[];
}

export interface DesktopProjectTextPreview {
  path: string;
  size: number;
  kind: 'text' | 'binary' | 'too-large' | string;
  text?: string;
}

export interface DesktopOutputDirectory {
  kind: 'desktop-output';
  token: string;
  name: string;
  isSource?: boolean;
}

export interface DesktopWorldgenLogSelection {
  token: string;
  name: string;
  sourceKind: 'file' | 'folder';
}

export interface DesktopWorldgenStageMetric {
  name: string;
  stage: number;
  durationMs: number;
  preparationMs?: number;
  executionMs?: number;
  asyncProcessesStartMs?: number;
}

export interface DesktopWorldgenNamedTimingMetric {
  label: string;
  durationMs: number;
}

export interface DesktopWorldgenMemoryGridMetric {
  name: string;
  index: number;
  memoryFootprintMb?: number;
  bufferCount?: number;
}

export interface DesktopWorldgenContextDependencyMetric {
  name: string;
  stage: number;
  outputBufferX?: number;
  outputBufferZ?: number;
  outputChunkX?: number;
  outputChunkZ?: number;
}

export interface DesktopWorldgenPerformanceReport {
  timestamp: string;
  sampleCount: number;
  worldStructureName: string;
  totalMs: number;
  contentGenerationMs: number;
  accessInitializationMs?: number;
  dataTransferMs: number;
  dataTransferTimings: DesktopWorldgenNamedTimingMetric[];
  buffersMemoryMb: number;
  memoryGrids: DesktopWorldgenMemoryGridMetric[];
  contextDependencies: DesktopWorldgenContextDependencyMetric[];
  totalCacheBufferRequests: number;
  missedCacheBufferRequests: number;
  missedTotalRatioPercent: number;
  stages: DesktopWorldgenStageMetric[];
  rawReport: string;
}

export interface DesktopWorldgenPerformanceResult {
  name: string;
  bytesScanned: number;
  linesScanned: number;
  truncated: boolean;
  report?: DesktopWorldgenPerformanceReport;
}

declare global {
  interface Window {
    __HYTALE_DESKTOP_BRIDGE__?: boolean;
  }
}

export function hasDesktopBridge(): boolean {
  return window.__HYTALE_DESKTOP_BRIDGE__ === true;
}

const tracedRequestDurations = new Map<string, number>();

export interface DesktopAppCloseRequested {
  pendingChanges: number;
}

export interface DesktopProjectFilesChanged {
  root: string;
  paths: string[];
  kind: 'create' | 'modify' | 'remove' | 'rename' | 'other';
}

export function subscribeDesktopProjectChanges(listener: (event: DesktopProjectFilesChanged) => void): () => void {
  if (!hasDesktopBridge()) return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<DesktopProjectFilesChanged>).detail;
    if (!detail || !Array.isArray(detail.paths)) return;
    listener(detail);
  };
  window.addEventListener('hgw:project-files-changed', handler);
  return () => window.removeEventListener('hgw:project-files-changed', handler);
}

export function subscribeDesktopAppCloseRequested(listener: (event: DesktopAppCloseRequested) => void): () => void {
  if (!hasDesktopBridge()) return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<DesktopAppCloseRequested>).detail;
    listener(detail ?? { pendingChanges: 0 });
  };
  window.addEventListener('hgw:app-close-requested', handler);
  return () => window.removeEventListener('hgw:app-close-requested', handler);
}

async function jsonRequest<T>(path: string, init?: RequestInit, traceId?: string): Promise<T> {
  const started = performance.now();
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const durationMs = performance.now() - started;
  recordRuntimeMetric(`desktop.request:${path}`, durationMs);
  if (traceId) tracedRequestDurations.set(traceId, durationMs);
  recordRuntimeEvent('desktop.request.completed', {
    detailed: !traceId,
    traceId,
    durationMs,
    data: { endpoint: path, status: response.status },
  });
  if (response.status === 204) throw new DOMException('The user aborted a request.', 'AbortError');
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json() as { error?: string };
      if (payload?.error) message = payload.error;
    } catch {
      // Keep the HTTP status when the launcher did not return JSON.
    }
    recordRuntimeEvent('desktop.request.failed', { level: 'error', traceId, data: { endpoint: path, status: response.status, statusText: response.statusText } });
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function ingestNativeProjectTrace(scan: DesktopProjectScan, fallbackTraceId?: string): void {
  const nativeTrace = scan.nativeTrace;
  if (!nativeTrace) return;
  const traceId = nativeTrace.traceId ?? fallbackTraceId;
  for (const phase of nativeTrace.phases) {
    recordRuntimeEvent(phase.name, {
      traceId,
      durationMs: phase.durationMs,
      data: phase.data,
    });
  }
  if (traceId) {
    const requestMs = tracedRequestDurations.get(traceId);
    const nativeTotalMs = nativeTrace.phases.find((phase) => phase.name === 'desktop.project.native-open.total')?.durationMs;
    if (requestMs !== undefined && nativeTotalMs !== undefined) {
      recordRuntimeEvent('desktop.project.bridge-overhead', {
        traceId,
        durationMs: Math.max(0, requestMs - nativeTotalMs),
        data: { requestMs, nativeTotalMs },
      });
    }
    tracedRequestDurations.delete(traceId);
  }
}

export async function desktopOpenProject(traceId?: string): Promise<DesktopProjectScan> {
  const scan = await jsonRequest<DesktopProjectScan>('/api/project/open', {
    method: 'POST',
    body: JSON.stringify({ traceId }),
  }, traceId);
  ingestNativeProjectTrace(scan, traceId);
  return scan;
}

export async function desktopOpenProjectAt(root: string, traceId?: string): Promise<DesktopProjectScan> {
  try {
    const scan = await jsonRequest<DesktopProjectScan>('/api/project/open-recent', {
      method: 'POST',
      body: JSON.stringify({ root, traceId }),
    }, traceId);
    ingestNativeProjectTrace(scan, traceId);
    return scan;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('REAUTHORIZE_RECENT:')) {
      // v0.9.5 stops treating a path stored in WebView localStorage as filesystem authority.
      // Existing v0.9.4 recent entries therefore require one native picker confirmation.
      return desktopOpenProject(traceId);
    }
    throw error;
  }
}

export async function desktopRevokeRecentProject(root: string): Promise<void> {
  await jsonRequest<{ revoked: boolean }>('/api/project/recent/revoke', {
    method: 'POST',
    body: JSON.stringify({ root }),
  });
}

export async function desktopReloadProject(): Promise<DesktopProjectScan> {
  return jsonRequest<DesktopProjectScan>('/api/project/reload', { method: 'POST' });
}

export async function desktopProbeProjectPath(path: string): Promise<DesktopProjectProbeResult> {
  return jsonRequest<DesktopProjectProbeResult>('/api/project/probe', {
    method: 'POST',
    body: JSON.stringify({ path }),
  });
}

export async function desktopSelectProjectProbePath(): Promise<DesktopProjectProbeResult> {
  return jsonRequest<DesktopProjectProbeResult>('/api/project/probe/select', { method: 'POST' });
}

export async function desktopRemoveProjectProbePath(path: string): Promise<DesktopProjectScan> {
  return jsonRequest<DesktopProjectScan>('/api/project/probe/remove', {
    method: 'POST',
    body: JSON.stringify({ path }),
  });
}

export async function desktopResetProjectProbePaths(): Promise<DesktopProjectScan> {
  return jsonRequest<DesktopProjectScan>('/api/project/probe/reset', { method: 'POST' });
}

export async function desktopReadProjectTextPreview(path: string): Promise<DesktopProjectTextPreview> {
  return jsonRequest<DesktopProjectTextPreview>(`/api/project/text-preview?path=${encodeURIComponent(path)}`);
}

export async function desktopReadProjectFile(path: string): Promise<Blob> {
  const response = await fetch(`/api/project/file?path=${encodeURIComponent(path)}`);
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json() as { error?: string };
      if (payload?.error) message = payload.error;
    } catch {
      // Binary endpoint may not return JSON on unexpected errors.
    }
    throw new Error(message);
  }
  return response.blob();
}

export async function desktopCheckConflicts(originals: Map<string, string>): Promise<string[]> {
  const payload = await jsonRequest<{ conflicts: string[] }>('/api/project/conflicts', {
    method: 'POST',
    body: JSON.stringify({ files: [...originals].map(([path, text]) => ({ path, text })) }),
  });
  return payload.conflicts;
}

export async function desktopApplyProjectFiles(
  originals: Map<string, string>,
  textsByPath: Map<string, string>,
): Promise<string[]> {
  const files = [...textsByPath].map(([path, text]) => ({
    path,
    expected: originals.get(path) ?? '',
    text,
  }));
  const payload = await jsonRequest<{ conflicts: string[]; written: number }>('/api/project/apply', {
    method: 'POST',
    body: JSON.stringify({ files }),
  });
  return payload.conflicts;
}

export async function desktopChooseWorldgenLog(): Promise<DesktopWorldgenLogSelection> {
  return jsonRequest<DesktopWorldgenLogSelection>('/api/worldgen/log/select', { method: 'POST' });
}

export async function desktopChooseWorldgenLogFolder(): Promise<DesktopWorldgenLogSelection> {
  return jsonRequest<DesktopWorldgenLogSelection>('/api/worldgen/log/folder/select', { method: 'POST' });
}

export async function desktopReadWorldgenPerformance(token: string): Promise<DesktopWorldgenPerformanceResult> {
  return jsonRequest<DesktopWorldgenPerformanceResult>('/api/worldgen/performance', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function desktopRevokeWorldgenLog(token: string): Promise<void> {
  await jsonRequest<{ revoked: boolean }>('/api/worldgen/log/revoke', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function desktopChooseOutputDirectory(): Promise<DesktopOutputDirectory> {
  return jsonRequest<DesktopOutputDirectory>('/api/output/select', { method: 'POST' });
}

export async function desktopExistingTargetFiles(target: DesktopOutputDirectory, paths: Iterable<string>): Promise<string[]> {
  const payload = await jsonRequest<{ existing: string[] }>('/api/output/existing', {
    method: 'POST',
    body: JSON.stringify({ token: target.token, paths: [...paths] }),
  });
  return payload.existing;
}

export async function desktopExportToDirectory(
  target: DesktopOutputDirectory,
  scope: 'full' | 'changed',
  changedTexts: Map<string, string>,
  allowOverwrite = false,
): Promise<number> {
  const payload = await jsonRequest<{ written: number }>('/api/output/export', {
    method: 'POST',
    body: JSON.stringify({
      token: target.token,
      scope,
      changedFiles: [...changedTexts].map(([path, text]) => ({ path, text })),
      allowOverwrite,
    }),
  });
  return payload.written;
}

export async function desktopSaveZip(filename: string, blob: Blob): Promise<void> {
  await jsonRequest<{ saved: boolean }>(`/api/output/save-zip?name=${encodeURIComponent(filename)}`, {
    method: 'POST',
    body: blob,
    headers: { 'Content-Type': 'application/zip' },
  });
}

export async function desktopSetPendingChangeCount(count: number): Promise<void> {
  await jsonRequest<{ pendingChanges: number }>('/api/app/pending-changes', {
    method: 'POST',
    body: JSON.stringify({ count: Math.max(0, Math.floor(count)) }),
  });
}

export async function desktopCheckForUpdate(channel: DesktopUpdateChannel): Promise<DesktopUpdateCheckResult> {
  return jsonRequest<DesktopUpdateCheckResult>('/api/app/update/check', {
    method: 'POST',
    body: JSON.stringify({ channel }),
  });
}

export async function desktopInstallUpdate(channel: DesktopUpdateChannel, expectedVersion: string): Promise<DesktopUpdateInstallResult> {
  recordRuntimeEvent('app.update.install-requested', { data: { channel, expectedVersion } });
  await flushPersistentRuntimeLog();
  return jsonRequest<DesktopUpdateInstallResult>('/api/app/update/install', {
    method: 'POST',
    body: JSON.stringify({ channel, expectedVersion }),
  });
}

export async function desktopCloseProject(): Promise<void> {
  await jsonRequest<{ closed: boolean }>('/api/project/close', { method: 'POST' });
}

export async function desktopExitApplication(): Promise<void> {
  recordRuntimeEvent('app.shutdown.requested');
  await flushPersistentRuntimeLog();
  await jsonRequest<{ exiting: boolean }>('/api/app/exit', { method: 'POST' });
}
