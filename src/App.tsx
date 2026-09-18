import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { commandForKeyboardEvent, type WorkbenchCommandId } from './commands/commandRegistry';
import { ChangePanel } from './components/ChangePanel';
import { FolderOpenButton } from './components/FolderOpenButton';
import { ProjectStartScreen } from './components/ProjectStartScreen';
import { QuickOpen } from './components/QuickOpen';
import { WorkbenchRail } from './components/WorkbenchRail';
import { LucideIcon } from './components/LucideIcon';
import { WorkbenchSettings } from './components/WorkbenchSettings';
import { UniversalTooltip } from './components/UniversalTooltip';
import { WorkbenchSidebar } from './components/WorkbenchSidebar';
import { WorkbenchSplitter } from './components/WorkbenchSplitter';
import { InspectorPane } from './features/inspector/InspectorPane';
import { desktopRevokeWorldgenLog, hasDesktopBridge, subscribeDesktopProjectChanges } from './io/desktopBridge';
import { reloadDirectoryWorkspace } from './io/folderLoader';
import { useWorkbenchStore, type WorkbenchPaneId } from './store';
import { recordRuntimeError, recordRuntimeEvent, setWorkbenchLayoutSupportSnapshot } from './support/runtimeDiagnostics';
import { beginPerformanceOperation } from './support/performanceTracing';
import { RELEASE_MILESTONE, RELEASE_MILESTONE_NAME } from './release/releaseIdentity';
import {
  applyWorkbenchUiScale,
  persistWorkbenchAppearancePreferences,
  readWorkbenchAppearancePreferences,
  resetWorkbenchAppearancePreferences,
  stepWorkbenchUiScale,
  type WorkbenchUiScale,
} from './workbench/appearancePreferences';
import {
  WORKBENCH_SIDEBAR_DEFAULT_WIDTH,
  WORKBENCH_SIDEBAR_KEYBOARD_STEP,
  WORKBENCH_SIDEBAR_MAX_WIDTH,
  WORKBENCH_SIDEBAR_MIN_WIDTH,
  WORKBENCH_SPLIT_DEFAULT_RATIO,
  WORKBENCH_SPLIT_KEYBOARD_STEP,
  WORKBENCH_SPLIT_MAX_RATIO,
  WORKBENCH_SPLIT_MIN_RATIO,
  clampWorkbenchSidebarWidth,
  clampWorkbenchSplitRatio,
  persistWorkbenchLayoutPreferences,
  readWorkbenchLayoutPreferences,
  resetWorkbenchLayoutPreferences,
  workbenchLayoutSnapshot,
} from './workbench/workbenchLayoutPreferences';

export default function App() {
  const workspace = useWorkbenchStore((state) => state.workspace);
  const project = useWorkbenchStore((state) => state.project);
  const developerMode = useWorkbenchStore((state) => state.developerMode);
  const sidebarVisible = useWorkbenchStore((state) => state.sidebarVisible);
  const splitViewEnabled = useWorkbenchStore((state) => state.splitViewEnabled);
  const activePane = useWorkbenchStore((state) => state.activePane);
  const setActivePane = useWorkbenchStore((state) => state.setActivePane);
  const setSplitViewEnabled = useWorkbenchStore((state) => state.setSplitViewEnabled);
  const navigationPast = useWorkbenchStore((state) => state.navigationPast);
  const navigationFuture = useWorkbenchStore((state) => state.navigationFuture);
  const navigateBack = useWorkbenchStore((state) => state.navigateBack);
  const navigateForward = useWorkbenchStore((state) => state.navigateForward);
  const applyExternalWorkspaceReload = useWorkbenchStore((state) => state.applyExternalWorkspaceReload);
  const externalChangeNotice = useWorkbenchStore((state) => state.externalChangeNotice);
  const clearExternalChangeNotice = useWorkbenchStore((state) => state.clearExternalChangeNotice);
  const watcherPaths = useRef(new Set<string>());
  const workviewRef = useRef<HTMLDivElement>(null);
  const lastInteractedPaneRef = useRef<WorkbenchPaneId>('primary');
  const watcherTimer = useRef<number>();
  const watcherReloadGeneration = useRef(0);
  const lastWorldgenToken = useRef<string>();
  const [watcherError, setWatcherError] = useState<string>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => readWorkbenchLayoutPreferences().sidebarWidth);
  const [splitRatio, setSplitRatio] = useState(() => readWorkbenchLayoutPreferences().splitRatio);
  const [uiScale, setUiScale] = useState<WorkbenchUiScale>(() => readWorkbenchAppearancePreferences().uiScale);
  const worldgenToken = useWorkbenchStore((state) => state.tabs.find((tab) => tab.kind === 'worldgen-performance')?.selection?.token);
  const desktop = hasDesktopBridge();
  const projectRoot = workspace?.projectRoot;

  const publishWorkbenchLayoutSupport = useCallback((persisted: boolean, nextSidebarWidth = sidebarWidth, nextSplitRatio = splitRatio, splitEnabled = splitViewEnabled) => {
    setWorkbenchLayoutSupportSnapshot({
      version: 2,
      sidebarWidth: nextSidebarWidth,
      splitRatio: nextSplitRatio,
      splitViewEnabled: splitEnabled,
      persisted,
      defaultSidebarWidth: WORKBENCH_SIDEBAR_DEFAULT_WIDTH,
      minSidebarWidth: WORKBENCH_SIDEBAR_MIN_WIDTH,
      maxSidebarWidth: WORKBENCH_SIDEBAR_MAX_WIDTH,
      defaultSplitRatio: WORKBENCH_SPLIT_DEFAULT_RATIO,
      minSplitRatio: WORKBENCH_SPLIT_MIN_RATIO,
      maxSplitRatio: WORKBENCH_SPLIT_MAX_RATIO,
    });
  }, [sidebarWidth, splitRatio, splitViewEnabled]);

  const commitSidebarWidth = useCallback((value: number, source: 'pointer' | 'keyboard') => {
    const next = clampWorkbenchSidebarWidth(value);
    setSidebarWidth(next);
    const persisted = persistWorkbenchLayoutPreferences({ version: 2, sidebarWidth: next, splitRatio });
    publishWorkbenchLayoutSupport(persisted, next, splitRatio);
    recordRuntimeEvent('workbench.layout.sidebar-width.persist', {
      data: { sidebarWidth: next, source, persisted },
    });
  }, [publishWorkbenchLayoutSupport, splitRatio]);

  const commitSplitRatio = useCallback((value: number, source: 'pointer' | 'keyboard') => {
    const next = clampWorkbenchSplitRatio(value);
    setSplitRatio(next);
    const persisted = persistWorkbenchLayoutPreferences({ version: 2, sidebarWidth, splitRatio: next });
    publishWorkbenchLayoutSupport(persisted, sidebarWidth, next);
    recordRuntimeEvent('workbench.layout.split-ratio.persist', {
      data: { splitRatio: next, source, persisted },
    });
  }, [publishWorkbenchLayoutSupport, sidebarWidth]);

  const resetWorkbenchLayout = useCallback(() => {
    const defaults = resetWorkbenchLayoutPreferences();
    setSidebarWidth(defaults.sidebarWidth);
    setSplitRatio(defaults.splitRatio);
    publishWorkbenchLayoutSupport(false, defaults.sidebarWidth, defaults.splitRatio);
    recordRuntimeEvent('workbench.layout.reset', {
      data: { sidebarWidth: defaults.sidebarWidth, splitRatio: defaults.splitRatio },
    });
  }, [publishWorkbenchLayoutSupport]);

  const commitUiScale = useCallback((next: WorkbenchUiScale, source: 'settings' | 'keyboard' | 'reset') => {
    setUiScale(next);
    const persisted = persistWorkbenchAppearancePreferences(next);
    void applyWorkbenchUiScale(next).then((appliedBy) => {
      recordRuntimeEvent('workbench.appearance.ui-scale.changed', {
        data: { uiScale: next, percent: Math.round(next * 100), source, persisted, appliedBy },
      });
    }).catch((error) => recordRuntimeError('workbench.appearance.ui-scale.failed', error, { uiScale: next, source }));
  }, []);

  const resetUiScale = useCallback(() => {
    const defaults = resetWorkbenchAppearancePreferences();
    setUiScale(defaults.uiScale);
    void applyWorkbenchUiScale(defaults.uiScale).then((appliedBy) => {
      recordRuntimeEvent('workbench.appearance.ui-scale.reset', {
        data: { uiScale: defaults.uiScale, percent: Math.round(defaults.uiScale * 100), appliedBy },
      });
    }).catch((error) => recordRuntimeError('workbench.appearance.ui-scale.failed', error, { uiScale: defaults.uiScale, source: 'reset' }));
  }, []);

  const activatePane = useCallback((paneId: WorkbenchPaneId) => {
    lastInteractedPaneRef.current = paneId;
    setActivePane(paneId);
  }, [setActivePane]);

  const toggleSplitView = useCallback(() => {
    const next = !splitViewEnabled;
    const collapseFromPane = lastInteractedPaneRef.current;
    setSplitViewEnabled(next, next ? undefined : collapseFromPane);
    lastInteractedPaneRef.current = next ? 'secondary' : 'primary';
    const snapshot = workbenchLayoutSnapshot();
    publishWorkbenchLayoutSupport(snapshot.persisted, sidebarWidth, splitRatio, next);
    recordRuntimeEvent(next ? 'workbench.split.enabled' : 'workbench.split.disabled', {
      data: { splitRatio, retainedPane: next ? undefined : collapseFromPane },
    });
  }, [publishWorkbenchLayoutSupport, setSplitViewEnabled, sidebarWidth, splitRatio, splitViewEnabled]);

  useEffect(() => {
    const restored = readWorkbenchLayoutPreferences();
    const snapshot = workbenchLayoutSnapshot();
    setSidebarWidth(restored.sidebarWidth);
    setSplitRatio(restored.splitRatio);
    setWorkbenchLayoutSupportSnapshot({ ...snapshot, splitViewEnabled: false });
    recordRuntimeEvent('workbench.layout.restore', {
      data: {
        sidebarWidth: restored.sidebarWidth,
        splitRatio: restored.splitRatio,
        minSidebarWidth: WORKBENCH_SIDEBAR_MIN_WIDTH,
        maxSidebarWidth: WORKBENCH_SIDEBAR_MAX_WIDTH,
        minSplitRatio: WORKBENCH_SPLIT_MIN_RATIO,
        maxSplitRatio: WORKBENCH_SPLIT_MAX_RATIO,
      },
    });
  }, []);

  const executeCommand = useCallback((id: WorkbenchCommandId) => {
    const state = useWorkbenchStore.getState();
    if (!state.project && id !== 'quickOpen') return;
    switch (id) {
      case 'quickOpen': if (state.project) setQuickOpen(true); break;
      case 'showExplorer': state.activateSidebar('explorer'); break;
      case 'showSearch': state.activateSidebar('search'); break;
      case 'openDiagnostics': state.openDiagnosticsTab(); break;
      case 'openChanges': state.openChangesTab(); break;
      case 'openLayout': state.openVisualTab(); break;
      case 'openWorldgenPerformance': state.openWorldgenPerformanceTab(); break;
      case 'openProjectGraph': state.openProjectGraphTab(); break;
      case 'navigateBack': state.navigateBack(); break;
      case 'navigateForward': state.navigateForward(); break;
      case 'reopenClosedTab': state.reopenClosedFile(); break;
    }
  }, []);

  useEffect(() => {
    void applyWorkbenchUiScale(uiScale).then((appliedBy) => {
      recordRuntimeEvent('workbench.appearance.ui-scale.restore', {
        data: { uiScale, percent: Math.round(uiScale * 100), appliedBy },
      });
    }).catch((error) => recordRuntimeError('workbench.appearance.ui-scale.failed', error, { uiScale, source: 'restore' }));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && !event.altKey) {
        if (event.key === '+' || event.key === '=') {
          event.preventDefault();
          commitUiScale(stepWorkbenchUiScale(uiScale, 1), 'keyboard');
          return;
        }
        if (event.key === '-') {
          event.preventDefault();
          commitUiScale(stepWorkbenchUiScale(uiScale, -1), 'keyboard');
          return;
        }
        if (event.key === '0') {
          event.preventDefault();
          commitUiScale(1, 'keyboard');
          return;
        }
      }
      const command = commandForKeyboardEvent(event);
      if (!command) return;
      if (quickOpen && command.id !== 'quickOpen') return;
      event.preventDefault();
      executeCommand(command.id);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commitUiScale, executeCommand, quickOpen, uiScale]);

  useEffect(() => {
    const previous = lastWorldgenToken.current;
    lastWorldgenToken.current = worldgenToken;
    if (!desktop || !previous || previous === worldgenToken) return;
    void desktopRevokeWorldgenLog(previous).catch((error) => {
      recordRuntimeError('worldgen.log.revoke-failed', error);
    });
  }, [desktop, worldgenToken]);

  useEffect(() => {
    if (watcherTimer.current) {
      window.clearTimeout(watcherTimer.current);
      watcherTimer.current = undefined;
    }
    watcherPaths.current.clear();
    watcherReloadGeneration.current += 1;
    clearExternalChangeNotice();
    setWatcherError(undefined);
  }, [clearExternalChangeNotice, projectRoot]);

  useEffect(() => {
    if (!desktop) return;
    const unsubscribe = subscribeDesktopProjectChanges((event) => {
      const current = useWorkbenchStore.getState().workspace;
      if (!current?.desktopBridge || !current.projectRoot || current.projectRoot !== event.root) return;
      event.paths.forEach((path) => watcherPaths.current.add(path));
      if (watcherTimer.current) window.clearTimeout(watcherTimer.current);
      watcherTimer.current = window.setTimeout(() => {
        const changedPaths = [...watcherPaths.current];
        watcherPaths.current.clear();
        const reloadGeneration = ++watcherReloadGeneration.current;
        void (async () => {
          const before = useWorkbenchStore.getState().workspace;
          if (!before?.desktopBridge || before.projectRoot !== event.root) return;
          try {
            const reloadStarted = performance.now();
            const operation = beginPerformanceOperation('project.rescan', { data: { changedPathCount: changedPaths.length } });
            try {
              const next = await operation.phaseAsync('workspace-reload', () => reloadDirectoryWorkspace(before));
              const currentAfterReload = useWorkbenchStore.getState().workspace;
              if (watcherReloadGeneration.current !== reloadGeneration || currentAfterReload?.projectRoot !== next.projectRoot) {
                operation.end({ outcome: 'superseded' });
                return;
              }
              operation.phase('state-apply', () => applyExternalWorkspaceReload(next, changedPaths), { changedPathCount: changedPaths.length });
              operation.end({ inventoryFiles: next.sourceEntries.size, semanticInputs: next.files.length });
              recordRuntimeEvent('project.watcher.reload', { traceId: operation.traceId, durationMs: performance.now() - reloadStarted, data: { changedPathCount: changedPaths.length, changedPaths } });
              setWatcherError(undefined);
            } catch (error) {
              operation.fail(error);
              throw error;
            }
          } catch (reason) {
            recordRuntimeError('project.watcher.reload-failed', reason, { changedPathCount: changedPaths.length, changedPaths });
            setWatcherError(reason instanceof Error ? reason.message : String(reason));
          }
        })();
      }, 350);
    });
    return () => {
      unsubscribe();
      if (watcherTimer.current) window.clearTimeout(watcherTimer.current);
      watcherPaths.current.clear();
      watcherReloadGeneration.current += 1;
    };
  }, [applyExternalWorkspaceReload, desktop]);

  return (
    <div className={`app-shell ${developerMode ? 'developer-mode' : ''} ${project ? 'project-open' : 'project-closed'}`}>
      <header className="topbar">
        <div className="brand">
          <strong>Hytale Generator Workbench</strong>
          <small>{RELEASE_MILESTONE} · {RELEASE_MILESTONE_NAME}</small>
        </div>
        {project && <FolderOpenButton />}
        {project && (
          <div className="history-navigation" role="group" aria-label="Navigation history">
            <button disabled={!navigationPast.length} onClick={navigateBack} data-tooltip="Go Back (Alt+Left)" aria-label="Go Back"><LucideIcon name="arrow-left" size={17} /></button>
            <button disabled={!navigationFuture.length} onClick={navigateForward} data-tooltip="Go Forward (Alt+Right)" aria-label="Go Forward"><LucideIcon name="arrow-right" size={17} /></button>
          </div>
        )}
        {project && (
          <button
            className={`workview-split-toggle ${splitViewEnabled ? 'active' : ''}`}
            onClick={toggleSplitView}
            data-tooltip={splitViewEnabled ? 'Return to single Workview' : 'Split Workview into two panes'}
            aria-label={splitViewEnabled ? 'Return to single Workview' : 'Split Workview'}
            aria-pressed={splitViewEnabled}
          >
            <LucideIcon name="columns-2" size={17} />
          </button>
        )}
        {workspace && <span className="project-chip" data-tooltip={workspace.projectRoot ?? workspace.label}>{workspace.label}</span>}
        {developerMode && <span className="developer-badge" data-tooltip="Developer mode is enabled">DEV</span>}
        {!project && <button className="topbar-settings-button" onClick={() => setSettingsOpen(true)} data-tooltip="Workbench settings" aria-label="Workbench settings"><LucideIcon name="settings" size={18} /></button>}
      </header>

      {developerMode && project && (
        <div className="developer-runtime-bar">
          <strong>Developer mode</strong>
          <span>Host: {desktop ? 'Tauri Desktop' : 'Browser'}</span>
          <span>Frontend: {desktop ? 'Embedded' : 'Web / Dev'}</span>
          <span>Filesystem: {desktop ? 'Native Rust' : 'Browser APIs'}</span>
          <span>TCP server: {desktop ? 'None' : 'host-dependent'}</span>
          {workspace && <span>Source: {workspace.sourceKind === 'directory' ? 'opened folder' : 'folder snapshot'}</span>}
        </div>
      )}

      {(externalChangeNotice || watcherError) && project && (
        <div className={`external-change-toast ${watcherError ? 'error' : ''}`} role="status">
          <div>
            <strong>{watcherError ? 'File watcher refresh failed' : 'Project changed on disk'}</strong>
            {watcherError ? (
              <small>{watcherError}</small>
            ) : (
              <>
                <small>{externalChangeNotice!.paths.length} path{externalChangeNotice!.paths.length === 1 ? '' : 's'} reloaded from disk.</small>
                {externalChangeNotice!.invalidatedChanges > 0 && <small className="warning">Pending changes were cleared because an affected file changed externally.</small>}
                {externalChangeNotice!.invalidatedHistory && externalChangeNotice!.invalidatedChanges === 0 && <small className="warning">Undo/Redo was cleared because its history referenced an externally changed file.</small>}
              </>
            )}
          </div>
          <button onClick={() => { clearExternalChangeNotice(); setWatcherError(undefined); }} aria-label="Dismiss external change notice"><LucideIcon name="x" size={16} /></button>
        </div>
      )}

      {!project ? (
        <ProjectStartScreen />
      ) : (
        <div
          className={`workbench-body ${sidebarVisible ? 'sidebar-open' : 'sidebar-collapsed'}`}
          style={sidebarVisible ? { '--workbench-sidebar-width': `${sidebarWidth}px` } as CSSProperties : undefined}
        >
          <WorkbenchRail onOpenSettings={() => setSettingsOpen(true)} />
          <WorkbenchSidebar />
          {sidebarVisible && (
            <WorkbenchSplitter
              value={sidebarWidth}
              min={WORKBENCH_SIDEBAR_MIN_WIDTH}
              max={WORKBENCH_SIDEBAR_MAX_WIDTH}
              step={WORKBENCH_SIDEBAR_KEYBOARD_STEP}
              label="Resize Workbench sidebar"
              onChange={(value) => setSidebarWidth(clampWorkbenchSidebarWidth(value))}
              onCommit={commitSidebarWidth}
            />
          )}
          <div
            ref={workviewRef}
            className={`workview-host ${splitViewEnabled ? 'split' : 'single'}`}
            style={splitViewEnabled ? { gridTemplateColumns: `${splitRatio}fr 6px ${1 - splitRatio}fr` } : undefined}
          >
            <section
              className={`workbench-pane ${activePane === 'primary' ? 'active' : ''}`}
              data-workbench-pane="primary"
              onPointerDownCapture={() => activatePane('primary')}
              onFocusCapture={() => activatePane('primary')}
            >
              <InspectorPane paneId="primary" />
            </section>
            {splitViewEnabled && (
              <>
                <WorkbenchSplitter
                  value={splitRatio}
                  min={WORKBENCH_SPLIT_MIN_RATIO}
                  max={WORKBENCH_SPLIT_MAX_RATIO}
                  step={WORKBENCH_SPLIT_KEYBOARD_STEP}
                  shiftMultiplier={2}
                  label="Resize split Workview"
                  pointerValue={(event) => {
                    const rect = workviewRef.current?.getBoundingClientRect();
                    if (!rect || rect.width <= 6) return splitRatio;
                    return clampWorkbenchSplitRatio((event.clientX - rect.left) / rect.width);
                  }}
                  onChange={(value) => setSplitRatio(clampWorkbenchSplitRatio(value))}
                  onCommit={commitSplitRatio}
                />
                <section
                  className={`workbench-pane ${activePane === 'secondary' ? 'active' : ''}`}
                  data-workbench-pane="secondary"
                  onPointerDownCapture={() => activatePane('secondary')}
                  onFocusCapture={() => activatePane('secondary')}
                >
                  <InspectorPane paneId="secondary" />
                </section>
              </>
            )}
          </div>
        </div>
      )}

      {project && <ChangePanel />}
      {quickOpen && project && <QuickOpen onClose={() => setQuickOpen(false)} executeCommand={executeCommand} />}
      {settingsOpen && <WorkbenchSettings
        onClose={() => setSettingsOpen(false)}
        sidebarWidth={sidebarWidth}
        splitRatio={splitRatio}
        onResetLayout={resetWorkbenchLayout}
        uiScale={uiScale}
        onUiScaleChange={(next) => commitUiScale(next, 'settings')}
        onResetUiScale={resetUiScale}
      />}
      <UniversalTooltip />
    </div>
  );
}
