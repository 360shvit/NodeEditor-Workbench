import { diagnosticErrorName, safeDiagnosticData, safeDiagnosticName } from './diagnosticPrivacy.js';
import { RELEASE_CANONICAL_RUN_REQUIRED, RELEASE_DISPLAY_VERSION, RELEASE_FEATURE_FREEZE, RELEASE_MILESTONE, RELEASE_VALIDATION_PROFILE } from './releaseIdentity.generated.js';
declare global {
  interface Window {
    __HYTALE_DESKTOP_BRIDGE__?: boolean;
    __HYTALE_PERSISTENT_LOG__?: {
      append: (entries: RuntimeEvent[]) => Promise<PersistentLogNativeStatus>;
      status: () => Promise<PersistentLogNativeStatus>;
      clear: () => Promise<PersistentLogNativeStatus>;
    };
  }
}

export type RuntimeLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface RuntimeEvent {
  id: number;
  timestamp: string;
  level: RuntimeLogLevel;
  event: string;
  traceId?: string;
  message?: string;
  durationMs?: number;
  data?: Record<string, unknown>;
}

export interface PersistentLogNativeStatus {
  enabled: boolean;
  format: 'jsonl' | string;
  currentFile: string;
  maxFileBytes: number;
  retainedFiles: number;
  currentBytes: number;
}

export interface PersistentLogSupportSnapshot extends PersistentLogNativeStatus {
  available: boolean;
  privacy: 'paths-always-redacted';
  queuedEvents: number;
  droppedEvents: number;
  lastError?: string;
}

export interface PerformanceThresholds {
  noteworthyMs: number;
  slowMs: number;
  verySlowMs: number;
}

export type PerformanceClassification = 'normal' | 'noteworthy' | 'slow' | 'very-slow';

export interface RuntimeMetric {
  name: string;
  count: number;
  lastMs: number;
  minMs: number;
  maxMs: number;
  averageMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  noteworthyCount: number;
  slowCount: number;
  verySlowCount: number;
}

export interface RuntimeSlowOperation {
  name: string;
  maxMs: number;
  p95Ms: number;
  slowCount: number;
  verySlowCount: number;
}


export interface RuntimeTraceSummary {
  traceId: string;
  eventCount: number;
  startedAt: string;
  endedAt: string;
  phases: Array<{ event: string; durationMs: number }>;
}

export interface ProjectSupportSnapshot {
  host: 'desktop' | 'browser';
  sourceKind?: 'directory' | 'snapshot';
  writable?: boolean;
  inventoryFiles: number;
  semanticInputs: number;
  projectFiles: number;
  nodes: number;
  symbols: number;
  semanticReferences: number;
  environmentReferences: number;
  prefabReferences: number;
  projectDiagnostics: { errors: number; warnings: number; info: number };
  workspaces: number;
  discoveryRoots: number;
}


export interface WorkbenchLayoutSupportSnapshot {
  version: number;
  sidebarWidth: number;
  splitRatio: number;
  splitViewEnabled: boolean;
  persisted: boolean;
  defaultSidebarWidth: number;
  minSidebarWidth: number;
  maxSidebarWidth: number;
  defaultSplitRatio: number;
  minSplitRatio: number;
  maxSplitRatio: number;
}

export interface DiagnosticReportOptions {
  includeProjectPaths: boolean;
  includeLogs: boolean;
  includePerformance: boolean;
}

const REPORT_SCHEMA_VERSION = 8;
const MAX_EVENTS = 500;
// Event JSON is at most 4,000 UTF-16 units (at most 12,000 UTF-8 bytes).
const MAX_EVENT_JSON_CHARACTERS = 4000;
const MAX_TRACE_SUMMARIES = 20;
const MAX_METRIC_SAMPLES = 96;
const MAX_METRIC_NAMES = 256;
const MAX_SLOW_OPERATIONS = 20;
const DETAILED_LOGGING_KEY = 'hytale-workbench.detailed-logging.v1';
const PERSISTENT_LOG_QUEUE_LIMIT = 1000;
const PERSISTENT_LOG_BATCH_SIZE = 50;
const PERSISTENT_LOG_FLUSH_DELAY_MS = 200;
const DEFAULT_PERSISTENT_EVENT_PREFIXES = [
  'app.',
  'lifecycle.',
  'project.open',
  'project.close',
  'project.snapshot.open',
  'project.external-change',
  'project.watcher',
  'project.workspace-state.restore',
  'changes.apply',
  'changes.project-copy',
  'changes.zip-export',
  'desktop.request.failed',
  'performance.slow-operation',
  'support.detailed-logging.changed',
];

let nextEventId = 1;
let nextTraceId = 1;
let evictedMetricNames = 0;
let events: RuntimeEvent[] = [];
let projectSnapshot: ProjectSupportSnapshot | undefined;
let workbenchLayoutSupport: WorkbenchLayoutSupportSnapshot | undefined;
let globalListenersInstalled = false;
const metrics = new Map<string, {
  count: number; lastMs: number; minMs: number; maxMs: number; totalMs: number; samples: number[];
  noteworthyCount: number; slowCount: number; verySlowCount: number;
}>();
let persistentLogQueue: RuntimeEvent[] = [];
let persistentLogFlushTimer: ReturnType<typeof setTimeout> | undefined;
let persistentLogFlushPromise: Promise<void> | undefined;
let persistentLogClearPromise: Promise<void> | undefined;
let persistentLogClearing = false;
let persistentLogDisabledForSession = false;
let persistentLogDroppedEvents = 0;
let persistentLogLastError: string | undefined;
let persistentLogNativeStatus: PersistentLogNativeStatus = {
  enabled: false,
  format: 'jsonl',
  currentFile: 'workbench-current.jsonl',
  maxFileBytes: 2 * 1024 * 1024,
  retainedFiles: 4,
  currentBytes: 0,
};

function storageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export function readDetailedLogging(): boolean {
  if (!storageAvailable()) return false;
  try {
    return window.localStorage.getItem(DETAILED_LOGGING_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistDetailedLogging(enabled: boolean): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(DETAILED_LOGGING_KEY, enabled ? '1' : '0');
  } catch {
    // Optional local preference. Diagnostics continue with the in-memory default.
  }
}

export function createRuntimeTraceId(prefix = 'operation'): string {
  const safePrefix = prefix.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'operation';
  return `${safePrefix}-${Date.now().toString(36)}-${(nextTraceId++).toString(36)}`;
}

function safeNumber(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function persistentLogBridge() {
  if (typeof window === 'undefined' || window.__HYTALE_DESKTOP_BRIDGE__ !== true) return undefined;
  return window.__HYTALE_PERSISTENT_LOG__;
}

function shouldPersistRuntimeEvent(entry: RuntimeEvent): boolean {
  if (persistentLogClearing) return false;
  if (!persistentLogBridge() || persistentLogDisabledForSession) return false;
  if (entry.level === 'warn' || entry.level === 'error') return true;
  if (readDetailedLogging()) return true;
  return DEFAULT_PERSISTENT_EVENT_PREFIXES.some((prefix) => entry.event.startsWith(prefix));
}

function persistentSafeEvent(entry: RuntimeEvent): RuntimeEvent {
  return redactPathFields(entry, false) as RuntimeEvent;
}

function schedulePersistentLogFlush(): void {
  if (persistentLogFlushTimer !== undefined || persistentLogDisabledForSession || !persistentLogBridge()) return;
  persistentLogFlushTimer = setTimeout(() => {
    persistentLogFlushTimer = undefined;
    void flushPersistentRuntimeLog();
  }, PERSISTENT_LOG_FLUSH_DELAY_MS);
}

function enqueuePersistentRuntimeEvent(entry: RuntimeEvent): void {
  if (!shouldPersistRuntimeEvent(entry)) return;
  if (persistentLogQueue.length >= PERSISTENT_LOG_QUEUE_LIMIT) {
    persistentLogQueue.shift();
    persistentLogDroppedEvents += 1;
  }
  persistentLogQueue.push(persistentSafeEvent(entry));
  if (persistentLogQueue.length >= PERSISTENT_LOG_BATCH_SIZE) {
    void flushPersistentRuntimeLog();
  } else {
    schedulePersistentLogFlush();
  }
}

export function persistentLogSupportSnapshot(): PersistentLogSupportSnapshot {
  return {
    ...persistentLogNativeStatus,
    available: !!persistentLogBridge() && !persistentLogDisabledForSession,
    privacy: 'paths-always-redacted',
    queuedEvents: persistentLogQueue.length,
    droppedEvents: persistentLogDroppedEvents,
    lastError: persistentLogLastError,
  };
}

export async function initializePersistentRuntimeLogging(): Promise<void> {
  const bridge = persistentLogBridge();
  if (!bridge) return;
  try {
    persistentLogNativeStatus = await bridge.status();
    persistentLogDisabledForSession = false;
    persistentLogLastError = undefined;
  } catch (error) {
    persistentLogDisabledForSession = true;
    persistentLogDroppedEvents += persistentLogQueue.length;
    persistentLogQueue = [];
    persistentLogLastError = 'Persistent log operation failed (' + diagnosticErrorName(error) + ').';
    recordRuntimeEvent('support.persistent-log.init-failed', { level: 'warn', message: persistentLogLastError, skipPersistent: true });
  }
}

export async function flushPersistentRuntimeLog(): Promise<void> {
  if (persistentLogFlushTimer !== undefined) {
    clearTimeout(persistentLogFlushTimer);
    persistentLogFlushTimer = undefined;
  }
  if (persistentLogFlushPromise) return persistentLogFlushPromise;
  const bridge = persistentLogBridge();
  if (!bridge || persistentLogDisabledForSession || persistentLogClearing || persistentLogQueue.length === 0) return;
  persistentLogFlushPromise = (async () => {
    try {
      while (persistentLogQueue.length > 0 && !persistentLogDisabledForSession) {
        const batch = persistentLogQueue.splice(0, PERSISTENT_LOG_BATCH_SIZE);
        try {
          persistentLogNativeStatus = await Promise.resolve().then(() => bridge.append(batch));
          persistentLogLastError = undefined;
        } catch (error) {
          persistentLogDroppedEvents += batch.length + persistentLogQueue.length;
          persistentLogQueue = [];
          persistentLogDisabledForSession = true;
          persistentLogLastError = 'Persistent log operation failed (' + diagnosticErrorName(error) + ').';
          recordRuntimeEvent('support.persistent-log.write-failed', { level: 'warn', message: persistentLogLastError, skipPersistent: true });
        }
      }
    } finally {
      persistentLogFlushPromise = undefined;
      if (persistentLogQueue.length > 0) schedulePersistentLogFlush();
    }
  })();
  return persistentLogFlushPromise;
}

export async function clearPersistentRuntimeLogs(): Promise<void> {
  if (persistentLogClearPromise) return persistentLogClearPromise;
  const bridge = persistentLogBridge();
  if (!bridge) throw new Error('Persistent application logs are available only in the desktop host.');
  if (persistentLogFlushTimer !== undefined) {
    clearTimeout(persistentLogFlushTimer);
    persistentLogFlushTimer = undefined;
  }
  persistentLogClearing = true;
  persistentLogQueue = [];
  persistentLogClearPromise = (async () => {
    try {
      if (persistentLogFlushPromise) await persistentLogFlushPromise;
      persistentLogNativeStatus = await Promise.resolve().then(() => bridge.clear());
      persistentLogDisabledForSession = false;
      persistentLogDroppedEvents = 0;
      persistentLogLastError = undefined;
      recordRuntimeEvent('support.persistent-log.cleared', { skipPersistent: true });
    } finally {
      persistentLogClearing = false;
      persistentLogClearPromise = undefined;
    }
  })();
  return persistentLogClearPromise;
}

export function recordRuntimeEvent(
  event: string,
  options: {
    level?: RuntimeLogLevel;
    traceId?: string;
    message?: string;
    durationMs?: number;
    data?: Record<string, unknown>;
    detailed?: boolean;
    thresholds?: PerformanceThresholds;
    skipMetric?: boolean;
    skipPersistent?: boolean;
  } = {},
): RuntimeEvent | undefined {
  if (options.detailed && !readDetailedLogging()) return undefined;
  const entry: RuntimeEvent = {
    id: nextEventId++,
    timestamp: new Date().toISOString(),
    level: options.level ?? 'info',
    event: safeDiagnosticName(event),
    traceId: options.traceId ? safeDiagnosticName(options.traceId) : undefined,
    message: options.message ? '<details-redacted>' : undefined,
    durationMs: options.durationMs === undefined ? undefined : safeNumber(options.durationMs),
    data: safeDiagnosticData(options.data),
  };
  if (JSON.stringify(entry).length > MAX_EVENT_JSON_CHARACTERS) entry.data = { diagnosticDataOmitted: true };
  events = [...events.slice(-(MAX_EVENTS - 1)), entry];
  if (entry.durationMs !== undefined && !options.skipMetric) recordRuntimeMetric(event, entry.durationMs, options.thresholds);
  if (!options.skipPersistent) enqueuePersistentRuntimeEvent(entry);
  return cloneEvent(entry);
}

export function performanceThresholdsFor(name: string): PerformanceThresholds {
  const lower = name.toLowerCase();
  if (lower.startsWith('search.') || lower.startsWith('quick-open.')) return { noteworthyMs: 50, slowMs: 150, verySlowMs: 500 };
  if (lower.startsWith('layout.') || lower.startsWith('graph.')) return { noteworthyMs: 100, slowMs: 500, verySlowMs: 2000 };
  if (lower.startsWith('project.open') || lower.startsWith('desktop.project')) return { noteworthyMs: 500, slowMs: 2000, verySlowMs: 5000 };
  if (lower.startsWith('changes.') || lower.startsWith('export.') || lower.startsWith('project.rescan') || lower.startsWith('project.watcher')) return { noteworthyMs: 250, slowMs: 1000, verySlowMs: 3000 };
  return { noteworthyMs: 100, slowMs: 500, verySlowMs: 2000 };
}

export function performanceClassification(
  name: string,
  durationMs: number,
  thresholds: PerformanceThresholds = performanceThresholdsFor(name),
): PerformanceClassification {
  if (durationMs >= thresholds.verySlowMs) return 'very-slow';
  if (durationMs >= thresholds.slowMs) return 'slow';
  if (durationMs >= thresholds.noteworthyMs) return 'noteworthy';
  return 'normal';
}

function percentile(samples: number[], percent: number): number {
  if (!samples.length) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((percent / 100) * sorted.length) - 1);
  return safeNumber(sorted[Math.min(index, sorted.length - 1)] ?? 0);
}

export function recordRuntimeMetric(name: string, durationMs: number, thresholds?: PerformanceThresholds): void {
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  name = safeDiagnosticName(name);
  const value = safeNumber(durationMs);
  const classification = performanceClassification(name, value, thresholds);
  const current = metrics.get(name);
  // Keep recent operation families bounded even if callers produce dynamic names.
  if (current) metrics.delete(name);
  else if (metrics.size >= MAX_METRIC_NAMES) {
    metrics.delete(metrics.keys().next().value!);
    evictedMetricNames += 1;
  }
  const samples = [...(current?.samples ?? []), value].slice(-MAX_METRIC_SAMPLES);
  metrics.set(name, current ? {
    count: current.count + 1,
    lastMs: value,
    minMs: Math.min(current.minMs, value),
    maxMs: Math.max(current.maxMs, value),
    totalMs: current.totalMs + value,
    samples,
    noteworthyCount: current.noteworthyCount + Number(classification === 'noteworthy'),
    slowCount: current.slowCount + Number(classification === 'slow'),
    verySlowCount: current.verySlowCount + Number(classification === 'very-slow'),
  } : {
    count: 1, lastMs: value, minMs: value, maxMs: value, totalMs: value, samples,
    noteworthyCount: Number(classification === 'noteworthy'),
    slowCount: Number(classification === 'slow'),
    verySlowCount: Number(classification === 'very-slow'),
  });
  if ((classification === 'slow' || classification === 'very-slow') && name !== 'performance.slow-operation') {
    recordRuntimeEvent('performance.slow-operation', {
      data: { operation: name, durationMs: value, classification },
      skipMetric: true,
    });
  }
}

export function recordRuntimeError(
  event: string,
  error: unknown,
  data?: Record<string, unknown>,
  traceId?: string,
): RuntimeEvent | undefined {
  return recordRuntimeEvent(event, {
    level: 'error',
    traceId,
    data: { ...safeDiagnosticData(data), errorName: diagnosticErrorName(error) },
  });
}


export function setWorkbenchLayoutSupportSnapshot(snapshot: WorkbenchLayoutSupportSnapshot | undefined): void {
  workbenchLayoutSupport = snapshot ? { ...snapshot } : undefined;
}

export function setProjectSupportSnapshot(snapshot: ProjectSupportSnapshot | undefined): void {
  projectSnapshot = snapshot ? { ...snapshot, projectDiagnostics: { ...snapshot.projectDiagnostics } } : undefined;
}

export function projectSupportSnapshot(): ProjectSupportSnapshot | undefined {
  return projectSnapshot ? { ...projectSnapshot, projectDiagnostics: { ...projectSnapshot.projectDiagnostics } } : undefined;
}

function cloneEvent(entry: RuntimeEvent): RuntimeEvent {
  return JSON.parse(JSON.stringify(entry)) as RuntimeEvent;
}

export function runtimeEvents(): RuntimeEvent[] {
  return events.map(cloneEvent);
}

export function runtimeMetrics(): RuntimeMetric[] {
  return [...metrics.entries()].map(([name, value]) => ({
    name,
    count: value.count,
    lastMs: safeNumber(value.lastMs),
    minMs: safeNumber(value.minMs),
    maxMs: safeNumber(value.maxMs),
    averageMs: safeNumber(value.totalMs / value.count),
    p50Ms: percentile(value.samples, 50),
    p95Ms: percentile(value.samples, 95),
    p99Ms: percentile(value.samples, 99),
    noteworthyCount: value.noteworthyCount,
    slowCount: value.slowCount,
    verySlowCount: value.verySlowCount,
  })).sort((left, right) => left.name.localeCompare(right.name));
}

export function runtimeSlowOperations(): RuntimeSlowOperation[] {
  return runtimeMetrics()
    .filter((metric) => metric.slowCount > 0 || metric.verySlowCount > 0)
    .sort((left, right) => right.maxMs - left.maxMs || right.p95Ms - left.p95Ms)
    .slice(0, MAX_SLOW_OPERATIONS)
    .map((metric) => ({ name: metric.name, maxMs: metric.maxMs, p95Ms: metric.p95Ms, slowCount: metric.slowCount, verySlowCount: metric.verySlowCount }));
}

export function runtimeTraceSummaries(): RuntimeTraceSummary[] {
  const grouped = new Map<string, RuntimeEvent[]>();
  for (const event of events) {
    if (!event.traceId) continue;
    const list = grouped.get(event.traceId) ?? [];
    list.push(event);
    grouped.set(event.traceId, list);
  }
  return [...grouped.entries()]
    .map(([traceId, traceEvents]) => ({
      traceId,
      eventCount: traceEvents.length,
      startedAt: traceEvents[0]?.timestamp ?? '',
      endedAt: traceEvents.at(-1)?.timestamp ?? '',
      phases: traceEvents
        .filter((event) => event.durationMs !== undefined)
        .map((event) => ({ event: event.event, durationMs: event.durationMs! })),
    }))
    .slice(-MAX_TRACE_SUMMARIES);
}

export function runtimeDiagnosticSummary() {
  const snapshot = runtimeEvents();
  return {
    eventCount: snapshot.length,
    errorCount: snapshot.filter((event) => event.level === 'error').length,
    warningCount: snapshot.filter((event) => event.level === 'warn').length,
    metricCount: metrics.size,
    evictedMetricNames,
    slowOperationCount: runtimeSlowOperations().length,
    traceCount: runtimeTraceSummaries().length,
    detailedLogging: readDetailedLogging(),
  };
}

function scrubProjectRelativePaths(value: string): string {
  return value
    .replace(/\b(?:Server|Client|HytaleGenerator|WorldStructures|Biomes|Environments|Prefabs)(?:[\\/][^\s,;:)}\]]+)+/gi, '<project-path-redacted>')
    .replace(/\b[^\s"']+[\\/][^\s"']+\.(?:json|bson|prefab|prefab\.json)\b/gi, '<project-path-redacted>');
}

function pathLikeField(key: string): boolean {
  const lower = key.toLowerCase();
  return lower === 'path' || lower.endsWith('path') || lower.endsWith('paths');
}

function redactPathFields(value: unknown, includePaths: boolean): unknown {
  if (Array.isArray(value)) return value.map((item) => redactPathFields(item, includePaths));
  if (typeof value === 'string') return includePaths ? value : scrubProjectRelativePaths(value);
  if (!value || typeof value !== 'object') return value;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    // Key names are only a hint. Never change booleans/numbers/null into redaction strings.
    // This keeps privacy metadata such as includeProjectPaths:false type-stable.
    if (!includePaths && pathLikeField(key) && typeof item === 'string') {
      output[key] = '<project-path-redacted>';
    } else if (!includePaths && pathLikeField(key) && Array.isArray(item) && item.every((entry) => typeof entry === 'string')) {
      output[key] = item.map(() => '<project-path-redacted>');
    } else {
      output[key] = redactPathFields(item, includePaths);
    }
  }
  return output;
}

export function createDiagnosticReport(options: DiagnosticReportOptions) {
  const summary = runtimeDiagnosticSummary();
  const report = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    application: {
      name: 'Hytale Generator Workbench',
      version: RELEASE_DISPLAY_VERSION,
      host: projectSnapshot?.host ?? (typeof window !== 'undefined' && window.__HYTALE_DESKTOP_BRIDGE__ ? 'desktop' : 'browser'),
    },
    environment: {
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
    },
    windowState: {
      enabled: typeof window !== 'undefined' && window.__HYTALE_DESKTOP_BRIDGE__ === true,
      trackedWindow: 'main',
      persisted: ['size', 'position', 'maximized'],
      source: 'tauri-plugin-window-state',
    },
    workbenchLayout: workbenchLayoutSupport,
    persistentLogging: persistentLogSupportSnapshot(),
    releaseValidation: {
      milestone: RELEASE_MILESTONE,
      profile: RELEASE_VALIDATION_PROFILE,
      featureFreeze: RELEASE_FEATURE_FREEZE,
      canonicalRunRequired: RELEASE_CANONICAL_RUN_REQUIRED,
    },
    privacy: {
      projectContentsIncluded: false,
      projectPathsIncluded: options.includeProjectPaths,
      recentLogsIncluded: options.includeLogs,
      performanceIncluded: options.includePerformance,
      automaticUpload: false,
    },
    project: projectSnapshot,
    workbenchRuntime: summary,
    performance: options.includePerformance ? runtimeMetrics() : undefined,
    slowOperations: options.includePerformance ? runtimeSlowOperations() : undefined,
    traces: options.includePerformance ? runtimeTraceSummaries() : undefined,
    events: options.includeLogs ? runtimeEvents() : undefined,
  };
  return redactPathFields(report, options.includeProjectPaths);
}

export function diagnosticReportJson(options: DiagnosticReportOptions): string {
  return `${JSON.stringify(createDiagnosticReport(options), null, 2)}\n`;
}

export async function copyDiagnosticReport(options: DiagnosticReportOptions): Promise<void> {
  if (!navigator?.clipboard?.writeText) throw new Error('Clipboard access is not available in this host.');
  await navigator.clipboard.writeText(diagnosticReportJson(options));
  recordRuntimeEvent('support.report.copied', { data: { includeProjectPaths: options.includeProjectPaths } });
}

export function downloadDiagnosticReport(options: DiagnosticReportOptions): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const blob = new Blob([diagnosticReportJson(options)], { type: 'application/json;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `Hytale-Generator-Workbench-Diagnostic-${timestamp}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
  recordRuntimeEvent('support.report.exported', { data: { includeProjectPaths: options.includeProjectPaths } });
}

export function installGlobalRuntimeDiagnostics(): void {
  if (globalListenersInstalled || typeof window === 'undefined') return;
  globalListenersInstalled = true;
  void initializePersistentRuntimeLogging();
  recordRuntimeEvent('app.start', { data: { version: RELEASE_DISPLAY_VERSION, desktop: window.__HYTALE_DESKTOP_BRIDGE__ === true } });
  if (window.__HYTALE_DESKTOP_BRIDGE__ === true) {
    recordRuntimeEvent('desktop.window-state.enabled', {
      data: { trackedWindow: 'main', size: true, position: true, maximized: true },
    });
  }
  window.addEventListener('error', (event) => {
    recordRuntimeError('runtime.window-error', event.error ?? event.message, {
      source: event.filename ? '<app-source>' : undefined,
      line: event.lineno,
      column: event.colno,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    recordRuntimeError('runtime.unhandled-rejection', event.reason);
  });
}
