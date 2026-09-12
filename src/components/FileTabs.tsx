import { useEffect, useRef, useState } from 'react';
import { projectGraphRoots, type ProjectModel } from '../core';
import { diagnosticLabel } from '../features/inspector/queryTabs';
import { useWorkbenchStore, type QueryWorkbenchTab, type WorkbenchPaneId, type WorkbenchTab } from '../store';
import { buildFileUiStateIndex, fileUiStateForPath } from '../features/fileState';
import { FileStateIndicators } from './FileStateIndicators';
import { LucideIcon, type LucideIconName } from './LucideIcon';

function queryTabMeta(tab: QueryWorkbenchTab) {
  switch (tab.queryKind) {
    case 'search': return { title: `Search: ${tab.query}`, icon: 'search' as LucideIconName, kindLabel: 'SEARCH', className: 'search-tab' };
    case 'references': return { title: `References: ${tab.symbolName}`, icon: 'link-2' as LucideIconName, kindLabel: 'REFS', className: 'reference-query-tab' };
    case 'resource-references': return { title: `Resource: ${tab.resourceName}`, icon: 'link-2' as LucideIconName, kindLabel: 'RESOURCE', className: 'resource-reference-query-tab' };
    case 'diagnostics': return { title: tab.diagnosticCode ? `Diagnostics: ${diagnosticLabel(tab.diagnosticCode)}` : 'Diagnostics', icon: 'triangle-alert' as LucideIconName, kindLabel: 'DIAG', className: 'diagnostic-query-tab' };
    case 'changes': return { title: 'Changes: Pending', icon: 'git-compare-arrows' as LucideIconName, kindLabel: 'CHANGES', className: 'changes-query-tab' };
  }
}

function tabTitle(tab: WorkbenchTab, project: ProjectModel): string {
  if (tab.kind === 'file') return project.fileMap.get(tab.fileId)?.name ?? 'File';
  if (tab.kind === 'source') return tab.path.replace(/\\/g, '/').split('/').filter(Boolean).at(-1) ?? tab.path;
  if (tab.kind === 'query') return queryTabMeta(tab).title;
  if (tab.kind === 'visual') return 'Layout';
  if (tab.kind === 'worldgen-performance') return 'WorldGen Performance';
  if (tab.canonical) return 'Project Graph';
  const root = projectGraphRoots(project).find((item) => item.path === tab.settings.selectedRootPath);
  return `Project Graph · ${root?.label ?? 'View'}`;
}

export function workbenchTabDomId(paneId: WorkbenchPaneId, tabId: string): string {
  return `workbench-tab-${paneId}-${tabId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

export function workbenchTabPanelDomId(paneId: WorkbenchPaneId): string {
  return `workbench-tabpanel-${paneId}`;
}

export function FileTabs({ paneId }: { paneId: WorkbenchPaneId }) {
  const project = useWorkbenchStore((state) => state.project);
  const tabs = useWorkbenchStore((state) => state.tabs);
  const activeTabId = useWorkbenchStore((state) => state.paneActiveTabIds[paneId]);
  const paneTabIds = useWorkbenchStore((state) => state.paneTabIds[paneId]);
  const projectVersion = useWorkbenchStore((state) => state.projectVersion);
  const changeVersion = useWorkbenchStore((state) => state.changeVersion);
  const changeSet = useWorkbenchStore((state) => state.changeSet);
  const externalChangeNotice = useWorkbenchStore((state) => state.externalChangeNotice);
  const selectTab = useWorkbenchStore((state) => state.selectTab);
  const closeTab = useWorkbenchStore((state) => state.closeTab);
  const closeOtherTabs = useWorkbenchStore((state) => state.closeOtherTabs);
  const closeTabsToRight = useWorkbenchStore((state) => state.closeTabsToRight);
  const closeAllTabs = useWorkbenchStore((state) => state.closeAllTabs);
  const revealFileInExplorer = useWorkbenchStore((state) => state.revealFileInExplorer);
  const revealPathInExplorer = useWorkbenchStore((state) => state.revealPathInExplorer);
  const openSourceTab = useWorkbenchStore((state) => state.openSourceTab);
  const [menu, setMenu] = useState<{ tabId: string; x: number; y: number; returnFocusId: string }>();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (restoreFocus = false) => {
      const returnFocusId = menu.returnFocusId;
      setMenu(undefined);
      if (restoreFocus) window.requestAnimationFrame(() => document.getElementById(returnFocusId)?.focus());
    };
    const pointer = () => close(false);
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])];
      if (!items.length) return;
      event.preventDefault();
      const current = document.activeElement instanceof HTMLElement ? items.indexOf(document.activeElement) : -1;
      const next = event.key === 'Home' ? 0
        : event.key === 'End' ? items.length - 1
        : event.key === 'ArrowDown' ? (current + 1 + items.length) % items.length
        : (current - 1 + items.length) % items.length;
      items[next].focus();
    };
    window.addEventListener('pointerdown', pointer);
    window.addEventListener('keydown', key);
    const frame = window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointerdown', pointer);
      window.removeEventListener('keydown', key);
    };
  }, [menu]);

  if (!project) return null;
  const fileStateIndex = buildFileUiStateIndex(project, changeSet, externalChangeNotice);
  const paneTabs = paneTabIds.map((id) => tabs.find((tab) => tab.id === id)).filter((tab): tab is WorkbenchTab => !!tab);
  const menuTab = menu ? tabs.find((tab) => tab.id === menu.tabId) : undefined;
  const menuIndex = menuTab ? paneTabIds.indexOf(menuTab.id) : -1;
  const menuFile = menuTab?.kind === 'file' ? project.fileMap.get(menuTab.fileId) : undefined;
  const menuPath = menuFile?.path ?? (menuTab?.kind === 'source' ? menuTab.path : undefined);

  const copyPath = async () => {
    if (!menuPath) return;
    try { await navigator.clipboard.writeText(menuPath); } catch { /* Clipboard is convenience only. */ }
    setMenu(undefined);
  };

  return (
    <>
      <div className="file-tabs" role="tablist" aria-label={`${paneId === 'primary' ? 'Pane A' : 'Pane B'} open tabs`}>
        {paneTabs.map((tab) => {
          const file = tab.kind === 'file' ? project.fileMap.get(tab.fileId) : undefined;
          if (tab.kind === 'file' && !file) return null;
          const sourceMeta = tab.kind === 'source' ? { title: tabTitle(tab, project), icon: 'file-text' as LucideIconName, kindLabel: 'SOURCE', className: 'source-tab-label' } : undefined;
          const queryMeta = tab.kind === 'query' ? queryTabMeta(tab) : undefined;
          const visualMeta = tab.kind === 'visual' ? { title: 'Layout', icon: 'layout-grid' as LucideIconName, kindLabel: 'VIEW', className: 'visual-tab-label' } : undefined;
          const worldgenMeta = tab.kind === 'worldgen-performance' ? { title: 'WorldGen Performance', icon: 'circle-dot' as LucideIconName, kindLabel: 'PERF', className: 'worldgen-performance-tab-label' } : undefined;
          const graphMeta = tab.kind === 'project-graph' ? { title: tabTitle(tab, project), icon: 'network' as LucideIconName, kindLabel: tab.canonical ? 'VIEW' : 'GRAPH', className: 'project-graph-tab-label' } : undefined;
          const stale = tab.kind === 'query' && tab.refreshPolicy === 'snapshot' && (tab.projectVersion !== projectVersion || tab.changeVersion !== changeVersion);
          const title = tabTitle(tab, project);
          const statePath = file?.path ?? (tab.kind === 'source' ? tab.path : undefined);
          const fileState = statePath ? fileUiStateForPath(fileStateIndex, statePath) : undefined;
          return (
            <div key={tab.id} className={`file-tab ${activeTabId === tab.id ? 'active' : ''} ${sourceMeta?.className ?? queryMeta?.className ?? visualMeta?.className ?? worldgenMeta?.className ?? graphMeta?.className ?? ''}`} onContextMenu={(event) => {
              event.preventDefault();
              const returnFocusId = workbenchTabDomId(paneId, tab.id);
              setMenu({ tabId: tab.id, x: Math.max(8, Math.min(event.clientX, window.innerWidth - 224)), y: Math.max(8, Math.min(event.clientY, window.innerHeight - 292)), returnFocusId });
            }}>
              <button
                id={workbenchTabDomId(paneId, tab.id)}
                role="tab"
                aria-selected={activeTabId === tab.id}
                aria-controls={workbenchTabPanelDomId(paneId)}
                tabIndex={activeTabId === tab.id ? 0 : -1}
                onClick={() => selectTab(tab.id, paneId)}
                onKeyDown={(event) => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const index = paneTabs.findIndex((item) => item.id === tab.id);
                  if (index < 0 || !paneTabs.length) return;
                  const nextIndex = event.key === 'Home' ? 0
                    : event.key === 'End' ? paneTabs.length - 1
                    : event.key === 'ArrowRight' ? (index + 1) % paneTabs.length
                    : (index - 1 + paneTabs.length) % paneTabs.length;
                  const nextTab = paneTabs[nextIndex];
                  selectTab(nextTab.id, paneId);
                  window.requestAnimationFrame(() => document.getElementById(workbenchTabDomId(paneId, nextTab.id))?.focus());
                }}
                data-tooltip={`${title}\nRight-click for tab actions`}
              >
                {(sourceMeta || queryMeta || visualMeta || worldgenMeta || graphMeta) && <span className="tab-query-icon"><LucideIcon name={(sourceMeta?.icon ?? queryMeta?.icon ?? visualMeta?.icon ?? worldgenMeta?.icon ?? graphMeta?.icon)!} size={14} /></span>}
                {(sourceMeta || queryMeta || visualMeta || worldgenMeta || graphMeta) && <span className="tab-kind-label">{sourceMeta?.kindLabel ?? queryMeta?.kindLabel ?? visualMeta?.kindLabel ?? worldgenMeta?.kindLabel ?? graphMeta?.kindLabel}</span>}
                <span>{title}</span>{fileState && <FileStateIndicators state={fileState} compact />}{stale && <span className="tab-stale-dot" data-tooltip="Snapshot results may have changed"><LucideIcon name="dot" size={14} strokeWidth={5} /></span>}
              </button>
              <button className="close-tab" onClick={() => closeTab(tab.id, paneId)} aria-label={`Close ${title}`}><LucideIcon name="x" size={13} /></button>
            </div>
          );
        })}
      </div>
      {menu && menuTab && (
        <div ref={menuRef} className="tab-context-menu" style={{ left: menu.x, top: menu.y }} onPointerDown={(event) => event.stopPropagation()} role="menu" aria-label={`Tab actions for ${tabTitle(menuTab, project)}`}>
          <strong>{tabTitle(menuTab, project)}</strong>
          <button role="menuitem" onClick={() => { closeTab(menuTab.id, paneId); setMenu(undefined); }}>Close</button>
          <button role="menuitem" disabled={paneTabs.length <= 1} onClick={() => { closeOtherTabs(menuTab.id, paneId); setMenu(undefined); }}>Close Others</button>
          <button role="menuitem" disabled={menuIndex < 0 || menuIndex === paneTabs.length - 1} onClick={() => { closeTabsToRight(menuTab.id, paneId); setMenu(undefined); }}>Close to the Right</button>
          <button role="menuitem" onClick={() => { closeAllTabs(paneId); setMenu(undefined); }}>Close All</button>
          {menuPath && <div className="tab-context-separator" />}
          {menuPath && <button role="menuitem" onClick={() => void copyPath()}>Copy Relative Path</button>}
          {menuFile && <button role="menuitem" onClick={() => { openSourceTab(menuFile.path); setMenu(undefined); }}>Open Read-only Source</button>}
          {menuFile && <button role="menuitem" onClick={() => { revealFileInExplorer(menuFile.id); setMenu(undefined); }}>Reveal in Explorer</button>}
          {menuTab.kind === 'source' && <button role="menuitem" onClick={() => { revealPathInExplorer(menuTab.path); setMenu(undefined); }}>Reveal in Explorer</button>}
        </div>
      )}
    </>
  );
}
