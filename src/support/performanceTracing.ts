import {
  createRuntimeTraceId,
  performanceClassification,
  recordRuntimeError,
  recordRuntimeEvent,
  recordRuntimeMetric,
  type PerformanceThresholds,
} from './runtimeDiagnostics.js';

export interface PerformanceOperationOptions {
  traceId?: string;
  data?: Record<string, unknown>;
  thresholds?: PerformanceThresholds;
  /** High-frequency operations keep aggregate metrics and only emit normal events in Detailed Logging. */
  aggregateOnly?: boolean;
}

export interface PerformanceOperation {
  readonly name: string;
  readonly traceId: string;
  phase<T>(phase: string, work: () => T, data?: Record<string, unknown>): T;
  phaseAsync<T>(phase: string, work: () => Promise<T>, data?: Record<string, unknown>): Promise<T>;
  end(data?: Record<string, unknown>): number;
  fail(error: unknown, data?: Record<string, unknown>): number;
}

function nowMs(): number {
  return (globalThis as { performance?: { now: () => number } }).performance?.now() ?? Date.now();
}

function mergedData(base: Record<string, unknown> | undefined, extra: Record<string, unknown> | undefined) {
  return base || extra ? { ...(base ?? {}), ...(extra ?? {}) } : undefined;
}

function recordMeasurement(
  name: string,
  durationMs: number,
  traceId: string | undefined,
  data: Record<string, unknown> | undefined,
  options: PerformanceOperationOptions,
): void {
  if (options.aggregateOnly) {
    recordRuntimeMetric(name, durationMs, options.thresholds);
    const classification = performanceClassification(name, durationMs, options.thresholds);
    if (classification === 'slow' || classification === 'very-slow') {
      recordRuntimeEvent(name, { traceId, durationMs, data, skipMetric: true });
    }
    return;
  }
  recordRuntimeEvent(name, { traceId, durationMs, data, thresholds: options.thresholds });
}


export function recordPerformanceDuration(
  name: string,
  durationMs: number,
  options: PerformanceOperationOptions = {},
): void {
  recordMeasurement(name, durationMs, options.traceId, options.data, options);
}

export function beginPerformanceOperation(name: string, options: PerformanceOperationOptions = {}): PerformanceOperation {
  const traceId = options.traceId ?? createRuntimeTraceId(name);
  const started = nowMs();
  let finished = false;
  if (!options.aggregateOnly) recordRuntimeEvent(`${name}.started`, { traceId, detailed: true, data: options.data });

  const phase = <T>(phaseName: string, work: () => T, data?: Record<string, unknown>): T => {
    const phaseStarted = nowMs();
    try {
      const value = work();
      recordMeasurement(`${name}.${phaseName}`, nowMs() - phaseStarted, traceId, data, options);
      return value;
    } catch (error) {
      const durationMs = nowMs() - phaseStarted;
      recordMeasurement(`${name}.${phaseName}`, durationMs, traceId, { ...(data ?? {}), status: 'failed' }, options);
      recordRuntimeError(`${name}.${phaseName}.failed`, error, data, traceId);
      throw error;
    }
  };

  const phaseAsync = async <T>(phaseName: string, work: () => Promise<T>, data?: Record<string, unknown>): Promise<T> => {
    const phaseStarted = nowMs();
    try {
      const value = await work();
      recordMeasurement(`${name}.${phaseName}`, nowMs() - phaseStarted, traceId, data, options);
      return value;
    } catch (error) {
      const durationMs = nowMs() - phaseStarted;
      recordMeasurement(`${name}.${phaseName}`, durationMs, traceId, { ...(data ?? {}), status: 'failed' }, options);
      recordRuntimeError(`${name}.${phaseName}.failed`, error, data, traceId);
      throw error;
    }
  };

  const finish = (status: 'completed' | 'failed', data?: Record<string, unknown>): number => {
    if (finished) return 0;
    finished = true;
    const durationMs = nowMs() - started;
    recordMeasurement(`${name}.total`, durationMs, traceId, mergedData(options.data, { ...(data ?? {}), status }), options);
    return durationMs;
  };

  return {
    name,
    traceId,
    phase,
    phaseAsync,
    end: (data) => finish('completed', data),
    fail: (error, data) => {
      const durationMs = finish('failed', data);
      recordRuntimeError(`${name}.failed`, error, mergedData(options.data, data), traceId);
      return durationMs;
    },
  };
}

export function measurePerformanceSync<T>(
  name: string,
  work: () => T,
  options: PerformanceOperationOptions = {},
): T {
  const operation = beginPerformanceOperation(name, options);
  try {
    const value = work();
    operation.end();
    return value;
  } catch (error) {
    operation.fail(error);
    throw error;
  }
}

export async function measurePerformanceAsync<T>(
  name: string,
  work: () => Promise<T>,
  options: PerformanceOperationOptions = {},
): Promise<T> {
  const operation = beginPerformanceOperation(name, options);
  try {
    const value = await work();
    operation.end();
    return value;
  } catch (error) {
    operation.fail(error);
    throw error;
  }
}
