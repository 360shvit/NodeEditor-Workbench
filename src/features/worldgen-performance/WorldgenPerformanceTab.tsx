import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  desktopChooseWorldgenLog,
  desktopChooseWorldgenLogFolder,
  desktopReadWorldgenPerformance,
  hasDesktopBridge,
  type DesktopWorldgenPerformanceResult,
} from '../../io/desktopBridge';
import { LucideIcon } from '../../components/LucideIcon';
import { useWorkbenchStore, type WorldgenPerformanceWorkbenchTab } from '../../store';

const REFRESH_INTERVAL_MS = 60_000;

function formatMs(value: number | undefined): string {
  return value === undefined ? '—' : `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} ms`;
}

function formatCount(value: number | undefined): string {
  return value === undefined ? '—' : value.toLocaleString();
}

function formatMb(value: number | undefined): string {
  return value === undefined ? '—' : `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} MB`;
}

function formatVector(x: number | undefined, z: number | undefined): string {
  if (x === undefined || z === undefined) return '—';
  return `{x=${x}, z=${z}}`;
}

function formatCheckedAt(timestamp?: number): string {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function WorldgenPerformanceTab({ tab }: { tab: WorldgenPerformanceWorkbenchTab }) {
  const setSelection = useWorkbenchStore((state) => state.setWorldgenPerformanceLogSelection);
  const [result, setResult] = useState<DesktopWorldgenPerformanceResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [checkedAt, setCheckedAt] = useState<number>();
  const activeSelectionKeyRef = useRef<string>();
  const inFlightSelectionKeyRef = useRef<string>();
  const desktop = hasDesktopBridge();
  const selectionKey = tab.selection?.token;
  activeSelectionKeyRef.current = selectionKey;

  const refresh = useCallback(async () => {
    const selection = tab.selection;
    const key = selectionKey;
    if (!selection || !key || !desktop || inFlightSelectionKeyRef.current === key) return;
    inFlightSelectionKeyRef.current = key;
    setLoading(true);
    try {
      const next = await desktopReadWorldgenPerformance(selection.token);
      if (activeSelectionKeyRef.current !== key) return;
      setResult(next);
      setCheckedAt(Date.now());
      setError(undefined);
    } catch (nextError) {
      if (activeSelectionKeyRef.current !== key) return;
      setCheckedAt(Date.now());
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      if (inFlightSelectionKeyRef.current === key) inFlightSelectionKeyRef.current = undefined;
      if (activeSelectionKeyRef.current === key) setLoading(false);
    }
  }, [desktop, selectionKey, tab.selection]);

  useEffect(() => {
    setResult(undefined);
    setError(undefined);
    setCheckedAt(undefined);
    if (!tab.selection?.token || !desktop) return;
    void refresh();
    const interval = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [desktop, refresh, selectionKey, tab.selection?.token]);

  const chooseLog = useCallback(async () => {
    if (!desktop) return;
    try {
      const selection = await desktopChooseWorldgenLog();
      setSelection({ ...selection, sourceKind: 'file' });
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === 'AbortError') return;
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  }, [desktop, setSelection]);

  const chooseFolder = useCallback(async () => {
    if (!desktop) return;
    try {
      const selection = await desktopChooseWorldgenLogFolder();
      setSelection({ ...selection, sourceKind: 'folder' });
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === 'AbortError') return;
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  }, [desktop, setSelection]);

  const report = result?.report;
  const summaryMetrics = useMemo(() => {
    if (!report) return undefined;
    const stageDuration = (matcher: RegExp) => report.stages.find((stage) => matcher.test(stage.name))?.durationMs;
    const materialTimings = report.dataTransferTimings.filter((timing) => /^Materials? Section\b/i.test(timing.label));
    const materialSumMs = materialTimings.length > 0
      ? materialTimings.reduce((sum, timing) => sum + timing.durationMs, 0)
      : undefined;
    return {
      biomeStageMs: stageDuration(/^BiomeStage$/i),
      terrainStageMs: stageDuration(/^TerrainStage$/i),
      propStageMs: stageDuration(/^PropStage/i),
      tintStageMs: stageDuration(/^TintStage$/i),
      materialTimings,
      materialSumMs,
      otherTransferTimings: report.dataTransferTimings.filter((timing) => !/^Materials? Section\b/i.test(timing.label)),
    };
  }, [report]);
  const scanSummary = useMemo(() => {
    if (!result) return undefined;
    const bytes = result.bytesScanned >= 1024 * 1024
      ? `${(result.bytesScanned / (1024 * 1024)).toFixed(1)} MiB`
      : `${Math.max(1, Math.round(result.bytesScanned / 1024))} KiB`;
    return `${result.linesScanned} lines · ${bytes}`;
  }, [result]);

  if (!desktop) {
    return (
      <section className="worldgen-performance-view worldgen-performance-empty">
        <div className="worldgen-performance-empty-card">
          <span className="worldgen-performance-kicker">WorldGen Performance</span>
          <h2>Desktop host required</h2>
          <p>Log selection is intentionally handled by the native Rust host and is unavailable in browser/dev mode.</p>
        </div>
      </section>
    );
  }

  if (!tab.selection) {
    return (
      <section className="worldgen-performance-view worldgen-performance-empty">
        <div className="worldgen-performance-empty-card">
          <span className="worldgen-performance-kicker">WorldGen Performance</span>
          <h2>No log selected</h2>
          <p>Select one Hytale log directly or open a log folder. Folder mode automatically follows the newest top-level .log file; .log.lck files are ignored.</p>
          <div className="worldgen-performance-empty-actions">
            <button className="primary" onClick={() => void chooseLog()}>Select log file</button>
            <button onClick={() => void chooseFolder()}>Open log folder</button>
          </div>
          {error && <div className="worldgen-performance-error" role="alert">{error}</div>}
        </div>
      </section>
    );
  }

  return (
    <section className="worldgen-performance-view" aria-label="WorldGen Performance">
      <header className="worldgen-performance-header">
        <div className="worldgen-performance-title-group">
          <span className="worldgen-performance-title-icon"><LucideIcon name="circle-dot" size={16} /></span>
          <div className="worldgen-performance-title-copy">
            <h2>WorldGen Performance</h2>
            <p>{tab.selection.name}</p>
            {tab.selection.sourceKind === 'folder' && result?.name && <small>Newest log: <code>{result.name}</code></small>}
          </div>
        </div>
        <div className="worldgen-performance-actions">
          <button onClick={() => void refresh()} disabled={loading}>{loading ? 'Checking…' : 'Refresh now'}</button>
          {tab.selection.sourceKind === 'folder'
            ? <button onClick={() => void chooseFolder()}>Change folder</button>
            : <button onClick={() => void chooseLog()}>Change log</button>}
        </div>
      </header>

      <div className="worldgen-performance-status" aria-live="polite">
        <span className="worldgen-performance-status-mode">
          <LucideIcon name="circle-dot" size={11} />
          {tab.selection.sourceKind === 'folder' ? 'Newest .log in folder' : 'Selected log file'}
        </span>
        <span><strong>Last check</strong>{formatCheckedAt(checkedAt)}</span>
        {scanSummary && <span><strong>Scanned</strong>{scanSummary}</span>}
        <span><strong>Refresh</strong>60 s</span>
        {tab.selection.sourceKind === 'folder' && <span className="worldgen-performance-status-note">Top-level .log only · .log.lck ignored</span>}
      </div>

      {error && <div className="worldgen-performance-error" role="alert"><strong>WorldGen monitor error</strong><span>{error}</span></div>}

      {!error && !loading && result && !report && (
        <div className="worldgen-performance-no-report" role="status">
          <LucideIcon name="circle-dot" size={18} />
          <div><h3>No complete WorldGen performance report found</h3><p>The source stays active and will be checked again automatically.</p></div>
        </div>
      )}

      {report && summaryMetrics && (
        <>
          <div className="worldgen-performance-report-bar">
            <div className="worldgen-performance-sample-count" aria-label="Current sample count">
              <span>Sample Count</span>
              <strong>{formatCount(report.sampleCount)}</strong>
            </div>
            <div className="worldgen-performance-report-identity">
              <span>World Structure</span>
              <strong>{report.worldStructureName}</strong>
              <small>{report.timestamp || 'Timestamp unavailable'} · latest complete report</small>
            </div>
          </div>

          <div className="worldgen-performance-metrics worldgen-performance-kpi-grid" aria-label="WorldGen summary metrics">
            <div className="worldgen-performance-metric primary-metric"><span>Total</span><strong>{formatMs(report.totalMs)}</strong></div>
            <div className="worldgen-performance-metric"><span>Content Generation</span><strong>{formatMs(report.contentGenerationMs)}</strong></div>
            <div className="worldgen-performance-metric"><span>Access Init</span><strong>{formatMs(report.accessInitializationMs)}</strong></div>
            <div className="worldgen-performance-metric"><span>BiomeStage</span><strong>{formatMs(summaryMetrics.biomeStageMs)}</strong></div>
            <div className="worldgen-performance-metric"><span>TerrainStage</span><strong>{formatMs(summaryMetrics.terrainStageMs)}</strong></div>
            <div className="worldgen-performance-metric"><span>PropStage</span><strong>{formatMs(summaryMetrics.propStageMs)}</strong></div>
            <div className="worldgen-performance-metric"><span>TintStage</span><strong>{formatMs(summaryMetrics.tintStageMs)}</strong></div>
            <div className="worldgen-performance-metric"><span>Data Transfer</span><strong>{formatMs(report.dataTransferMs)}</strong></div>
            <div className="worldgen-performance-metric"><span>Material (Sum)</span><strong>{formatMs(summaryMetrics.materialSumMs)}</strong><small>{summaryMetrics.materialTimings.length} section{summaryMetrics.materialTimings.length === 1 ? '' : 's'}</small></div>
          </div>

          <div className="worldgen-performance-details-stack">
            <details className="worldgen-performance-section worldgen-performance-collapsible">
              <summary className="worldgen-performance-section-title">
                <div><h3>Content Generation</h3><p>Exact stage totals, preparation, execution and async start.</p></div>
                <span className="worldgen-performance-summary-value">{formatMs(report.contentGenerationMs)}</span>
                <LucideIcon name="chevron-right" size={15} className="worldgen-performance-chevron" />
              </summary>
              <div className="worldgen-performance-stage-table-wrap">
                <table className="worldgen-performance-stage-table">
                  <thead><tr><th>Stage</th><th>Total</th><th>Preparation</th><th>Execution</th><th>Async Start</th></tr></thead>
                  <tbody>
                    {report.stages.map((stage) => (
                      <tr key={`${stage.stage}-${stage.name}`}>
                        <th scope="row"><span className="worldgen-stage-index">{stage.stage}</span>{stage.name}</th>
                        <td>{formatMs(stage.durationMs)}</td>
                        <td>{formatMs(stage.preparationMs)}</td>
                        <td>{formatMs(stage.executionMs)}</td>
                        <td>{formatMs(stage.asyncProcessesStartMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <details className="worldgen-performance-section worldgen-performance-collapsible">
              <summary className="worldgen-performance-section-title">
                <div><h3>Material Sections</h3><p>Exact values contributing to the Material (Sum) KPI.</p></div>
                <span className="worldgen-performance-summary-value">{formatMs(summaryMetrics.materialSumMs)}</span>
                <LucideIcon name="chevron-right" size={15} className="worldgen-performance-chevron" />
              </summary>
              <div className="worldgen-performance-value-grid">
                {summaryMetrics.materialTimings.length > 0 ? summaryMetrics.materialTimings.map((timing, index) => (
                  <div key={`${timing.label}-${index}`}><span>{timing.label}</span><strong>{formatMs(timing.durationMs)}</strong></div>
                )) : <p className="worldgen-performance-section-empty">No material section timings in this report.</p>}
              </div>
            </details>

            <details className="worldgen-performance-section worldgen-performance-collapsible">
              <summary className="worldgen-performance-section-title">
                <div><h3>Data Transfer</h3><p>Environment, write, tint, entity and block-state timings.</p></div>
                <span className="worldgen-performance-summary-value">{formatMs(report.dataTransferMs)}</span>
                <LucideIcon name="chevron-right" size={15} className="worldgen-performance-chevron" />
              </summary>
              <div className="worldgen-performance-stage-table-wrap">
                <table className="worldgen-performance-stage-table worldgen-performance-key-value-table">
                  <thead><tr><th>Entry</th><th>Time</th></tr></thead>
                  <tbody>
                    {summaryMetrics.otherTransferTimings.map((timing, index) => (
                      <tr key={`${timing.label}-${index}`}><th scope="row">{timing.label}</th><td>{formatMs(timing.durationMs)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <details className="worldgen-performance-section worldgen-performance-collapsible">
              <summary className="worldgen-performance-section-title">
                <div><h3>Memory Usage</h3><p>Buffer memory and per-grid allocation.</p></div>
                <span className="worldgen-performance-summary-value">{formatMb(report.buffersMemoryMb)}</span>
                <LucideIcon name="chevron-right" size={15} className="worldgen-performance-chevron" />
              </summary>
              <div className="worldgen-performance-stage-table-wrap">
                <table className="worldgen-performance-stage-table">
                  <thead><tr><th>Grid</th><th>Index</th><th>Memory</th><th>Buffers</th></tr></thead>
                  <tbody>
                    {report.memoryGrids.map((grid) => (
                      <tr key={`${grid.index}-${grid.name}`}>
                        <th scope="row">{grid.name}</th>
                        <td>{grid.index}</td>
                        <td>{formatMb(grid.memoryFootprintMb)}</td>
                        <td>{formatCount(grid.bufferCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <details className="worldgen-performance-section worldgen-performance-collapsible">
              <summary className="worldgen-performance-section-title">
                <div><h3>Context Dependencies</h3><p>Buffer-column and chunk-column output sizes.</p></div>
                <span className="worldgen-performance-summary-value">{report.contextDependencies.length} stages</span>
                <LucideIcon name="chevron-right" size={15} className="worldgen-performance-chevron" />
              </summary>
              <div className="worldgen-performance-stage-table-wrap">
                <table className="worldgen-performance-stage-table">
                  <thead><tr><th>Stage</th><th>Buffer Column</th><th>Chunk Column</th></tr></thead>
                  <tbody>
                    {report.contextDependencies.map((dependency) => (
                      <tr key={`${dependency.stage}-${dependency.name}`}>
                        <th scope="row"><span className="worldgen-stage-index">{dependency.stage}</span>{dependency.name}</th>
                        <td>{formatVector(dependency.outputBufferX, dependency.outputBufferZ)}</td>
                        <td>{formatVector(dependency.outputChunkX, dependency.outputChunkZ)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <details className="worldgen-performance-section worldgen-performance-collapsible">
              <summary className="worldgen-performance-section-title">
                <div><h3>Buffer Cache</h3><p>Requests, misses and miss ratio.</p></div>
                <span className="worldgen-performance-summary-value">{report.missedTotalRatioPercent}% missed</span>
                <LucideIcon name="chevron-right" size={15} className="worldgen-performance-chevron" />
              </summary>
              <div className="worldgen-performance-cache-grid">
                <div><span>Total requests</span><strong>{formatCount(report.totalCacheBufferRequests)}</strong></div>
                <div><span>Missed requests</span><strong>{formatCount(report.missedCacheBufferRequests)}</strong></div>
                <div><span>Miss ratio</span><strong>{report.missedTotalRatioPercent}%</strong></div>
              </div>
            </details>

            <details className="worldgen-performance-section worldgen-performance-collapsible worldgen-performance-raw">
              <summary className="worldgen-performance-section-title">
                <div><h3>Raw Performance Report</h3><p>Original normalized block for exact inspection.</p></div>
                <span className="worldgen-performance-summary-value">Raw</span>
                <LucideIcon name="chevron-right" size={15} className="worldgen-performance-chevron" />
              </summary>
              <pre>{report.rawReport}</pre>
            </details>
          </div>
        </>
      )}
    </section>
  );
}
