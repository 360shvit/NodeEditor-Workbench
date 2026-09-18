import { useWorkbenchStore, type SidebarView } from '../store';
import { LucideIcon, type LucideIconName } from './LucideIcon';

function RailButton({
  label,
  icon,
  active,
  badge,
  onClick,
  className = '',
  pressed,
  current,
}: {
  label: string;
  icon: LucideIconName;
  active?: boolean;
  badge?: number;
  onClick: () => void;
  className?: string;
  pressed?: boolean;
  current?: boolean;
}) {
  return (
    <button
      className={`rail-button ${active ? 'active' : ''} ${className}`}
      onClick={onClick}
      data-tooltip={label}
      data-tooltip-side="right"
      aria-label={label}
      aria-pressed={pressed}
      aria-current={current ? 'page' : undefined}
    >
      <span className="rail-icon" aria-hidden="true"><LucideIcon name={icon} size={20} /></span>
      {badge !== undefined && badge > 0 && <span className="rail-badge">{badge > 99 ? '99+' : badge}</span>}
    </button>
  );
}

export function WorkbenchRail({ onOpenSettings }: { onOpenSettings: () => void }) {
  const sidebarView = useWorkbenchStore((state) => state.sidebarView);
  const toolSidebarOverride = useWorkbenchStore((state) => state.toolSidebarOverride);
  const sidebarVisible = useWorkbenchStore((state) => state.sidebarVisible);
  const activateSidebar = useWorkbenchStore((state) => state.activateSidebar);
  const activeTabId = useWorkbenchStore((state) => state.activeTabId);
  const tabs = useWorkbenchStore((state) => state.tabs);
  const project = useWorkbenchStore((state) => state.project);
  const changeCount = useWorkbenchStore((state) => state.changeSet.changes.length);
  const editing = useWorkbenchStore((state) => state.editing);
  const setEditing = useWorkbenchStore((state) => state.setEditing);
  const openDiagnosticsTab = useWorkbenchStore((state) => state.openDiagnosticsTab);
  const openChangesTab = useWorkbenchStore((state) => state.openChangesTab);
  const openVisualTab = useWorkbenchStore((state) => state.openVisualTab);
  const openWorldgenPerformanceTab = useWorkbenchStore((state) => state.openWorldgenPerformanceTab);
  const openProjectGraphTab = useWorkbenchStore((state) => state.openProjectGraphTab);
  const actionableDiagnostics = project?.diagnostics.filter((item) => item.severity !== 'info').length ?? 0;
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const toolSidebarActive = activeTab?.kind === 'visual' || activeTab?.kind === 'project-graph';
  const globalSidebarActive = !toolSidebarActive || Boolean(toolSidebarOverride);
  const effectiveGlobalSidebarView = toolSidebarOverride ?? sidebarView;

  const sidebarButton = (view: SidebarView, label: string, icon: LucideIconName) => (
    <RailButton
      label={`${label}${sidebarVisible && globalSidebarActive && effectiveGlobalSidebarView === view ? ' — hide sidebar' : ''}`}
      icon={icon}
      active={sidebarVisible && globalSidebarActive && effectiveGlobalSidebarView === view}
      pressed={sidebarVisible && globalSidebarActive && effectiveGlobalSidebarView === view}
      onClick={() => activateSidebar(view)}
    />
  );

  return (
    <nav className="workbench-rail" aria-label="Workbench tools">
      <div className="rail-group rail-sidebar-group">
        {sidebarButton('explorer', 'Explorer', 'folder-tree')}
        {sidebarButton('search', 'Search', 'search')}
      </div>

      <div className="rail-separator" />

      <div className="rail-group rail-tool-group">
        <RailButton
          label="Diagnostics"
          icon="triangle-alert"
          badge={actionableDiagnostics}
          active={!!activeTabId?.startsWith('tab:diagnostics:')}
          current={!!activeTabId?.startsWith('tab:diagnostics:')}
          onClick={() => openDiagnosticsTab()}
        />
        <RailButton
          label="Changes"
          icon="git-compare-arrows"
          badge={changeCount}
          active={activeTabId === 'tab:changes:pending'}
          current={activeTabId === 'tab:changes:pending'}
          onClick={openChangesTab}
        />
        <RailButton
          label="Layout"
          icon="layout-grid"
          active={activeTabId === 'tab:visual'}
          current={activeTabId === 'tab:visual'}
          onClick={openVisualTab}
        />
        <RailButton
          label="WorldGen Performance"
          icon="circle-dot"
          active={activeTab?.kind === 'worldgen-performance'}
          current={activeTab?.kind === 'worldgen-performance'}
          onClick={openWorldgenPerformanceTab}
        />
        <RailButton
          label="Project Graph"
          icon="network"
          active={activeTab?.kind === 'project-graph'}
          current={activeTab?.kind === 'project-graph'}
          onClick={openProjectGraphTab}
        />
      </div>

      <div className="rail-spacer" />

      <div className="rail-group rail-global-group">
        <RailButton
          label={`Editing ${editing ? 'On' : 'Off'}`}
          icon="pencil"
          className={`editing-rail-button ${editing ? 'editing-on' : 'editing-off'}`}
          active={editing}
          pressed={editing}
          onClick={() => setEditing(!editing)}
        />
        <RailButton label="Settings" icon="settings" onClick={onOpenSettings} />
      </div>
    </nav>
  );
}
