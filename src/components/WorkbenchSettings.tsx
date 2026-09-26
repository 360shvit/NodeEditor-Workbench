import { readUpdateChannel, persistUpdateChannel } from '../release/updatePreferences';
import { userFacingError } from '../support/userFacingError';
import { useEffect, useRef, useState } from 'react';
import { desktopCheckForUpdate, desktopInstallUpdate, hasDesktopBridge, type DesktopUpdateChannel, type DesktopUpdateCheckResult } from '../io/desktopBridge';
import { RELEASE_DISPLAY_VERSION, UPDATER_DEFAULT_CHANNEL, UPDATER_ENABLED, UPDATER_PREPARED } from '../release/releaseIdentity';
import {
  clearPersistentRuntimeLogs,
  copyDiagnosticReport,
  downloadDiagnosticReport,
  persistentLogSupportSnapshot,
  recordRuntimeError,
  runtimeDiagnosticSummary,
} from '../support/runtimeDiagnostics';
import { useWorkbenchStore } from '../store';
import {
  WORKBENCH_UI_SCALE_STEPS,
  formatWorkbenchUiScale,
  type WorkbenchUiScale,
} from '../workbench/appearancePreferences';
import { LucideIcon } from './LucideIcon';
import { HotkeySettings } from './HotkeySettings';
import { useModalFocusTrap } from '../workbench/modalFocus';

type SettingsPage = 'appearance' | 'workbench' | 'keyboard' | 'diagnostics' | 'about';

interface WorkbenchSettingsProps {
  onClose: () => void;
  sidebarWidth: number;
  splitRatio: number;
  onResetLayout: () => void;
  uiScale: WorkbenchUiScale;
  onUiScaleChange: (uiScale: WorkbenchUiScale) => void;
  onResetUiScale: () => void;
}

const SETTINGS_PAGES: Array<{ id: SettingsPage; label: string; detail: string }> = [
  { id: 'appearance', label: 'Appearance', detail: 'Scale and readability' },
  { id: 'workbench', label: 'Workbench', detail: 'Layout and panes' },
  { id: 'keyboard', label: 'Keyboard', detail: 'Global shortcuts' },
  { id: 'diagnostics', label: 'Diagnostics', detail: 'Logs and support' },
  { id: 'about', label: 'About', detail: 'Runtime and version' },
];

export function WorkbenchSettings({
  onClose,
  sidebarWidth,
  splitRatio,
  onResetLayout,
  uiScale,
  onUiScaleChange,
  onResetUiScale,
}: WorkbenchSettingsProps) {
  const developerMode = useWorkbenchStore((state) => state.developerMode);
  const setDeveloperMode = useWorkbenchStore((state) => state.setDeveloperMode);
  const detailedLogging = useWorkbenchStore((state) => state.detailedLogging);
  const setDetailedLogging = useWorkbenchStore((state) => state.setDetailedLogging);
  const workspace = useWorkbenchStore((state) => state.workspace);
  const pendingChangeCount = useWorkbenchStore((state) => state.changeSet.changes.length);
  const desktop = hasDesktopBridge();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [activePage, setActivePage] = useState<SettingsPage>('appearance');
  const [includeProjectPaths, setIncludeProjectPaths] = useState(false);
  const [includeLogs, setIncludeLogs] = useState(true);
  const [includePerformance, setIncludePerformance] = useState(true);
  const [reportStatus, setReportStatus] = useState<string>();
  const [reportBusy, setReportBusy] = useState(false);
  const reportInFlight = useRef(false);
  const [persistentLogStatus, setPersistentLogStatus] = useState<string>();
  const [persistentLogRevision, setPersistentLogRevision] = useState(0);
  const [updateChannel, setUpdateChannel] = useState<DesktopUpdateChannel>(() => readUpdateChannel(UPDATER_DEFAULT_CHANNEL as DesktopUpdateChannel));
  const [updateCheck, setUpdateCheck] = useState<DesktopUpdateCheckResult>();
  const [updateStatus, setUpdateStatus] = useState<string>();
  const [updateBusy, setUpdateBusy] = useState(false);
  const summary = runtimeDiagnosticSummary();
  const persistentLog = persistentLogSupportSnapshot();
  void persistentLogRevision;
  const closeSettings = () => { if (!updateBusy) onClose(); };
  useModalFocusTrap({ containerRef: dialogRef, initialFocusRef: closeButtonRef, onEscape: closeSettings });

  const reportOptions = { includeProjectPaths, includeLogs, includePerformance };

  useEffect(() => {
    if (!desktop) return undefined;
    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ phase?: string; version?: string; downloadedBytes?: number; totalBytes?: number }>).detail;
      if (!detail?.phase) return;
      if (detail.phase === 'downloading') {
        const total = detail.totalBytes ?? 0;
        const downloaded = detail.downloadedBytes ?? 0;
        const percent = total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : undefined;
        setUpdateStatus(percent === undefined
          ? `Downloading ${detail.version ?? 'update'}…`
          : `Downloading ${detail.version ?? 'update'}… ${percent}%`);
      } else if (detail.phase === 'downloaded') {
        setUpdateStatus(`Downloaded and signature-verified ${detail.version ?? 'update'}. Rechecking staged changes…`);
      } else if (detail.phase === 'installing') {
        setUpdateStatus(`Installing ${detail.version ?? 'update'}… the app will restart when installation completes.`);
      } else if (detail.phase === 'blocked') {
        setUpdateStatus('The signed update is downloaded, but installation was blocked because staged project changes appeared. Resolve them and check again.');
      }
    };
    window.addEventListener('hgw:app-update-progress', onProgress);
    return () => window.removeEventListener('hgw:app-update-progress', onProgress);
  }, [desktop]);

  const clearPersistentLogs = async () => {
    setPersistentLogStatus(undefined);
    try {
      await clearPersistentRuntimeLogs();
      setPersistentLogRevision((value) => value + 1);
      setPersistentLogStatus('Persistent application logs cleared.');
    } catch (error) {
      recordRuntimeError('support.persistent-log.clear-failed', error);
      setPersistentLogStatus(userFacingError(error));
    }
  };

  const copyReport = async () => {
    setReportStatus(undefined);
    try {
      await copyDiagnosticReport(reportOptions);
      setReportStatus('Diagnostic report copied to the clipboard. Review it before sharing.');
    } catch (error) {
      recordRuntimeError('support.report.copy-failed', error);
      setReportStatus(userFacingError(error));
    }
  };

  const saveReport = async () => {
    if (reportInFlight.current) return;
    reportInFlight.current = true;
    setReportBusy(true);
    setReportStatus(undefined);
    try {
      const outcome = await downloadDiagnosticReport(reportOptions);
      setReportStatus(outcome === 'saved' ? 'Diagnostic report saved. Review it before sharing.' : outcome === 'cancelled' ? 'Save cancelled. No report was saved.' : 'Diagnostic JSON download started.');
    } catch (error) {
      recordRuntimeError('support.report.export-failed', error);
      setReportStatus(userFacingError(error));
    } finally {
      reportInFlight.current = false;
      setReportBusy(false);
    }
  };

  const chooseUpdateChannel = (channel: DesktopUpdateChannel) => {
    setUpdateChannel(channel);
    setUpdateCheck(undefined);
    setUpdateStatus(undefined);
    persistUpdateChannel(channel);
  };

  const checkForUpdates = async () => {
    setUpdateCheck(undefined);
    setUpdateBusy(true);
    setUpdateStatus('Checking for updates…');
    try {
      const result = await desktopCheckForUpdate(updateChannel);
      setUpdateCheck(result);
      setUpdateStatus(!result.configured
        ? (result.reason ?? 'Updater deployment is not configured for this build.')
        : result.available
          ? `Version ${result.version} is available.`
          : `You are up to date on the ${updateChannel} channel.`);
    } catch (error) {
      recordRuntimeError('app.update.check-failed', error);
      setUpdateStatus(userFacingError(error));
    } finally {
      setUpdateBusy(false);
    }
  };

  const installCheckedUpdate = async () => {
    if (!updateCheck?.available || !updateCheck.version) return;
    if (pendingChangeCount > 0) {
      setUpdateStatus(`Resolve ${pendingChangeCount} staged project change(s) before installing the update.`);
      return;
    }
    setUpdateBusy(true);
    setUpdateStatus(`Downloading ${updateCheck.version}… the app will restart after installation.`);
    try {
      await desktopInstallUpdate(updateChannel, updateCheck.version);
    } catch (error) {
      recordRuntimeError('app.update.install-failed', error);
      setUpdateStatus(userFacingError(error));
      setUpdateBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={closeSettings}>
      <section ref={dialogRef} className="settings-modal settings-modal-v2" role="dialog" aria-modal="true" aria-labelledby="workbench-settings-title" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h3 id="workbench-settings-title">Settings</h3>
            <small>Workbench preferences are global and do not modify the current Hytale project.</small>
          </div>
          <button ref={closeButtonRef} onClick={closeSettings} disabled={updateBusy} aria-label={updateBusy ? "Close settings (disabled while update is installing)" : "Close settings"}><LucideIcon name="x" size={16} /></button>
        </header>

        <div className="settings-shell">
          <nav className="settings-navigation" aria-label="Settings categories">
            {SETTINGS_PAGES.map((page) => (
              <button
                key={page.id}
                className={activePage === page.id ? 'active' : ''}
                onClick={() => setActivePage(page.id)}
                aria-current={activePage === page.id ? 'page' : undefined}
              >
                <strong>{page.label}</strong>
                <small>{page.detail}</small>
              </button>
            ))}
          </nav>

          <div className="settings-body settings-page-body">
            {activePage === 'appearance' && (
              <div className="settings-page">
                <div className="settings-page-heading">
                  <span className="settings-page-kicker">Appearance</span>
                  <h4>Make the Workbench comfortable to read</h4>
                  <p>UI scale changes the entire application surface. Windows display scaling and Project Graph camera zoom remain independent.</p>
                </div>

                <section className="settings-section settings-section-spacious">
                  <div className="settings-row settings-row-stack">
                    <div>
                      <strong>UI scale</strong>
                      <small>Choose a fixed, tested scale. 100% is the default. Larger ranges remain intentionally unavailable until the next reflow-hardening milestone.</small>
                    </div>
                    <div className="ui-scale-picker" role="group" aria-label="UI scale">
                      {WORKBENCH_UI_SCALE_STEPS.map((scale) => (
                        <button
                          key={scale}
                          className={uiScale === scale ? 'active' : ''}
                          aria-pressed={uiScale === scale}
                          onClick={() => onUiScaleChange(scale)}
                        >
                          {formatWorkbenchUiScale(scale)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="settings-row">
                    <div>
                      <strong>Current scale</strong>
                      <small>Keyboard: Ctrl/Cmd + Plus, Ctrl/Cmd + Minus, and Ctrl/Cmd + 0.</small>
                    </div>
                    <div className="settings-value-actions">
                      <span className="settings-value-badge">{formatWorkbenchUiScale(uiScale)}</span>
                      <button className="settings-layout-reset" onClick={onResetUiScale} disabled={uiScale === 1}>Reset</button>
                    </div>
                  </div>
                  <div className="settings-inline-note">
                    <LucideIcon name="circle-check" size={16} />
                    <span><strong>Separate from Windows DPI.</strong> The desktop host scales its WebView only; project data and Project Graph camera state are unchanged.</span>
                  </div>
                </section>
              </div>
            )}

            {activePage === 'workbench' && (
              <div className="settings-page">
                <div className="settings-page-heading">
                  <span className="settings-page-kicker">Workbench</span>
                  <h4>Layout and pane preferences</h4>
                  <p>These preferences belong to the application, not to a ProjectSession.</p>
                </div>
                <section className="settings-section settings-section-spacious">
                  <div className="settings-row">
                    <div>
                      <strong>Workbench layout</strong>
                      <small>Sidebar: {Math.round(sidebarWidth)} px · split ratio: {Math.round(splitRatio * 100)}/{100 - Math.round(splitRatio * 100)}. Resize either divider directly; Reset restores the layout defaults.</small>
                    </div>
                    <button className="settings-layout-reset" onClick={onResetLayout}>Reset</button>
                  </div>
                  <div className="settings-inline-note neutral">
                    <LucideIcon name="columns-2" size={16} />
                    <span>Split mode itself remains transient. Pane-local tab references and globally unique document instances keep their existing v0.11.21 contract.</span>
                  </div>
                </section>
              </div>
            )}

            {activePage === 'keyboard' && (
              <div className="settings-page">
                <div className="settings-page-heading">
                  <span className="settings-page-kicker">Keyboard</span>
                  <h4>Global Workbench shortcuts</h4>
                  <p>Record, unassign, or restore command shortcuts. Widget-local keyboard behavior remains local.</p>
                </div>
                <HotkeySettings />
              </div>
            )}

            {activePage === 'diagnostics' && (
              <div className="settings-page">
                <div className="settings-page-heading">
                  <span className="settings-page-kicker">Diagnostics</span>
                  <h4>Logging, support and developer details</h4>
                  <p>Diagnostics stay local unless you explicitly copy or save a report.</p>
                </div>

                <section className="settings-section">
                  <div className="settings-section-title">Logging</div>
                  <div className="settings-row">
                    <div>
                      <strong>Detailed logging</strong>
                      <small>Records additional structured diagnostic events in memory and, on desktop, into the bounded persistent log. Logs stay local and are never uploaded automatically.</small>
                    </div>
                    <button className={`settings-toggle ${detailedLogging ? 'active' : ''}`} onClick={() => setDetailedLogging(!detailedLogging)} aria-pressed={detailedLogging}>{detailedLogging ? 'On' : 'Off'}</button>
                  </div>
                  <div className="settings-row">
                    <div>
                      <strong>Persistent application log</strong>
                      <small>{desktop ? `JSONL in the native app-log directory · ${persistentLog.retainedFiles} files max · ${Math.round(persistentLog.maxFileBytes / (1024 * 1024))} MiB each. Warnings, errors and lifecycle events are kept by default; Detailed logging adds the full structured event stream. Project paths are always redacted. Raw error text and stacks are omitted.` : 'Available in the Tauri desktop host. Browser/dev sessions keep the existing in-memory diagnostics only.'}</small>
                      <small>Clear logs removes disk history. Current session events stay in memory until restart.</small>
                      {persistentLog.lastError && <small className="settings-warning">File sink unavailable for this session: {persistentLog.lastError}</small>}
                      {persistentLogStatus && <small className="support-report-status" role="status">{persistentLogStatus}</small>}
                    </div>
                    <button className="settings-layout-reset" onClick={() => void clearPersistentLogs()} disabled={!desktop}>Clear logs</button>
                  </div>
                  <div className="settings-row">
                    <div>
                      <strong>Developer mode</strong>
                      <small>Shows runtime and diagnostic details inside the release app. This does not start Node, hot reload, or a localhost development server.</small>
                    </div>
                    <button className={`settings-toggle ${developerMode ? 'active' : ''}`} onClick={() => setDeveloperMode(!developerMode)} aria-pressed={developerMode}>{developerMode ? 'On' : 'Off'}</button>
                  </div>
                </section>

                <section className="settings-section support-report-section">
                  <div className="settings-section-title">Support report</div>
                  <div className="support-report-intro">
                    <div>
                      <strong>Create diagnostic report</strong>
                      <small>Creates a local JSON report that can be attached to a bug report. Reports contain operation metadata and error categories, with raw error text and stacks omitted. Workbench does not add project file contents and does not upload the report.</small>
                    </div>
                    <div className="support-report-counters" aria-label="Current diagnostic session summary">
                      <span><strong>{summary.eventCount}</strong> events</span>
                      <span><strong>{summary.errorCount}</strong> errors</span>
                      <span><strong>{summary.warningCount}</strong> warnings</span>
                      <span><strong>{summary.metricCount}</strong> metrics</span>
                      <span><strong>{summary.slowOperationCount}</strong> slow ops</span>
                      <span><strong>{summary.traceCount}</strong> traces</span>
                    </div>
                  </div>
                  <label className="support-report-option"><input type="checkbox" checked={includeLogs} onChange={(event) => setIncludeLogs(event.target.checked)} /><span><strong>Include recent application logs</strong><small>Structured Workbench events only; the in-memory log is capped.</small></span></label>
                  <label className="support-report-option"><input type="checkbox" checked={includePerformance} onChange={(event) => setIncludePerformance(event.target.checked)} /><span><strong>Include performance metrics</strong><small>Unified timing summaries with p50/p95/p99, slow-operation ranking and correlated operation traces.</small></span></label>
                  <label className="support-report-option privacy-sensitive"><input type="checkbox" checked={includeProjectPaths} onChange={(event) => setIncludeProjectPaths(event.target.checked)} /><span><strong>Include project-relative paths</strong><small>Off by default. Enable only when filenames and relative paths are useful for reproducing the issue.</small></span></label>
                  <div className="support-report-privacy"><LucideIcon name="circle-check" size={16} /><span><strong>Private by default.</strong> No automatic upload, no project file contents, and project-path fields are redacted unless you opt in. Review the JSON before sharing it.</span></div>
                  <div className="support-report-actions">
                    <button onClick={() => void copyReport()}><LucideIcon name="file-text" size={14} /> Copy report</button>
                    <button className="primary" disabled={reportBusy} onClick={() => void saveReport()}><LucideIcon name="corner-down-left" size={14} /> Save diagnostic JSON</button>
                  </div>
                  {reportStatus && <small className="support-report-status" role="status">{reportStatus}</small>}
                </section>
              </div>
            )}

            {activePage === 'about' && (
              <div className="settings-page">
                <div className="settings-page-heading">
                  <span className="settings-page-kicker">About</span>
                  <h4>Hytale Generator Workbench</h4>
                  <p>Runtime identity and current distribution state.</p>
                </div>
                <section className="settings-section runtime-settings">
                  <div className="settings-runtime-grid settings-runtime-grid-v2">
                    <span><strong>Version</strong>{RELEASE_DISPLAY_VERSION}</span>
                    <span><strong>Host</strong>{desktop ? 'Tauri Desktop' : 'Browser / Dev'}</span>
                    <span><strong>Frontend</strong>{desktop ? 'Embedded' : 'Web / Dev'}</span>
                    <span><strong>Filesystem</strong>{desktop ? 'Native Rust authority' : 'Browser APIs'}</span>
                    <span><strong>TCP server</strong>{desktop ? 'None' : 'Depends on host'}</span>
                    <span><strong>Project source</strong>{workspace ? (workspace.sourceKind === 'directory' ? 'Opened folder' : 'Folder snapshot') : 'None'}</span>
                    <span><strong>Write access</strong>{workspace?.writable ? 'Read / Write' : workspace ? 'Read only' : '—'}</span>
                    <span><strong>Distribution</strong>Windows NSIS Setup</span>
                    <span><strong>Automatic updates</strong>{UPDATER_ENABLED ? 'Installed builds / user-controlled' : UPDATER_PREPARED ? 'Prepared / disabled' : 'Not configured'}</span>
                  </div>
                </section>
                <section className="settings-section updater-settings">
                  <div className="settings-section-title">Updates</div>
                  <div className="settings-row updater-channel-row">
                    <div>
                      <strong>Update channel</strong>
                      <small>Stable receives release builds only. Preview may also receive prerelease builds.</small>
                    </div>
                    <select value={updateChannel} onChange={(event) => chooseUpdateChannel(event.target.value as DesktopUpdateChannel)} disabled={!desktop || updateBusy}>
                      <option value="stable">Stable</option>
                      <option value="preview">Preview</option>
                    </select>
                  </div>
                  <div className="settings-row">
                    <div>
                      <strong>Check and install</strong>
                      <small>Checks run only when you request them. The signed package is downloaded first, then native authority rechecks staged project changes immediately before installation/restart.</small>
                      {updateCheck?.available && updateCheck.notes && <small className="updater-release-notes">{updateCheck.notes}</small>}
                      {updateStatus && <small className="support-report-status" role="status">{updateStatus}</small>}
                    </div>
                    <div className="updater-actions">
                      <button className="settings-layout-reset" onClick={() => void checkForUpdates()} disabled={!desktop || !UPDATER_ENABLED || updateBusy}>Check</button>
                      {updateCheck?.available && updateCheck.version && (
                        <button className="primary" onClick={() => void installCheckedUpdate()} disabled={updateBusy || pendingChangeCount > 0}>Install & restart</button>
                      )}
                    </div>
                  </div>
                  {pendingChangeCount > 0 && <div className="settings-inline-note neutral"><LucideIcon name="info" size={16} /><span>{pendingChangeCount} staged project change(s) currently block update installation.</span></div>}
                </section>
                <div className="settings-about-note">
                  Installed NSIS builds can use signed updates after deployment is bootstrapped. The native host refuses automatic update configuration for raw/development builds. Existing pre-updater installations require one manual upgrade to the first updater-enabled release.
                </div>
              </div>
            )}
          </div>
        </div>

        <footer>
          <button className="primary" onClick={closeSettings} disabled={updateBusy}>{updateBusy ? "Update in progress…" : "Done"}</button>
        </footer>
      </section>
    </div>
  );
}
