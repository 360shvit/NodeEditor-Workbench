import { ProjectExplorer } from './ProjectExplorer';
import { SearchSidebar } from './SearchSidebar';
import { ProjectGraphSidebar } from '../features/project-graph/ProjectGraphSidebar';
import { VisualLayoutSidebar } from '../features/visual/VisualLayoutSidebar';
import { useWorkbenchStore } from '../store';

export function WorkbenchSidebar() {
  const sidebarVisible = useWorkbenchStore((state) => state.sidebarVisible);
  const sidebarView = useWorkbenchStore((state) => state.sidebarView);
  const toolSidebarOverride = useWorkbenchStore((state) => state.toolSidebarOverride);
  const tabs = useWorkbenchStore((state) => state.tabs);
  const activeTabId = useWorkbenchStore((state) => state.activeTabId);
  if (!sidebarVisible) return null;

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  if (!toolSidebarOverride && activeTab?.kind === 'project-graph') return <ProjectGraphSidebar />;
  if (!toolSidebarOverride && activeTab?.kind === 'visual') return <VisualLayoutSidebar />;
  const globalView = toolSidebarOverride ?? sidebarView;
  return globalView === 'search' ? <SearchSidebar /> : <ProjectExplorer />;
}
