import { useEffect, useMemo } from 'react';
import { buildProjectGraph, projectGraphRoots } from '../../core';
import { useWorkbenchStore, type ProjectGraphWorkbenchTab } from '../../store';
import { LucideIcon } from '../../components/LucideIcon';
import { ToolSidebar } from '../../components/ToolSidebar';
import { recordPerformanceDuration } from '../../support/performanceTracing';

export function ProjectGraphSidebar() {
  const project = useWorkbenchStore((state) => state.project);
  const activeTabId = useWorkbenchStore((state) => state.activeTabId);
  const graphTab = useWorkbenchStore((state) => state.tabs.find((tab): tab is ProjectGraphWorkbenchTab => tab.id === activeTabId && tab.kind === 'project-graph'));
  const graphSettings = graphTab?.settings;
  const setProjectGraphSettings = useWorkbenchStore((state) => state.setProjectGraphSettings);
  const requestProjectGraphFit = useWorkbenchStore((state) => state.requestProjectGraphFit);
  const openProjectGraphAsNew = useWorkbenchStore((state) => state.openProjectGraphAsNew);
  const setGraphSettings = (settings: Parameters<typeof setProjectGraphSettings>[0]) => graphTab && setProjectGraphSettings(settings, graphTab.id);
  const requestFit = () => graphTab && requestProjectGraphFit(graphTab.id);
  const roots = useMemo(() => project ? projectGraphRoots(project) : [], [project]);
  const selectedRoot = roots.find((root) => root.path === graphSettings?.selectedRootPath) ?? roots[0];

  useEffect(() => {
    const nextPath = selectedRoot?.path;
    if (graphTab && nextPath !== graphSettings?.selectedRootPath) setGraphSettings({ selectedRootPath: nextPath, viewport: undefined });
  }, [selectedRoot?.path, graphSettings?.selectedRootPath, graphTab?.id]);

  const graph = useMemo(() => project
    ? buildProjectGraph(project, selectedRoot?.fileId, graphSettings?.densityDepth ?? 8, graphSettings?.includeResources ?? false)
    : undefined, [project, selectedRoot?.fileId, graphSettings?.densityDepth, graphSettings?.includeResources]);

  if (!project || !graph || !graphSettings || !graphTab) return null;
  const densityAssets = graph.nodes.filter((node) => node.kind === 'density-symbol').length;
  const unresolved = graph.nodes.filter((node) => node.unresolved).length;
  const zoom = graphSettings.viewport?.zoom ?? 1;

  const changeTopology = (settings: Parameters<typeof setGraphSettings>[0]) => setGraphSettings({ ...settings, viewport: undefined });

  return (
    <ToolSidebar title="Project Graph" subtitle="Flow & view" ariaLabel="Project Graph settings" className="project-graph-sidebar" bodyClassName="project-graph-sidebar-body">
        <section className="project-graph-sidebar-section">
          <div className="project-graph-sidebar-section-title">Flow</div>
          <label className="project-graph-sidebar-field">
            <span>Flow root</span>
            <select value={selectedRoot?.fileId ?? ''} onChange={(event) => {
              const root = roots.find((item) => item.fileId === event.target.value);
              changeTopology({ selectedRootPath: root?.path });
            }} disabled={!roots.length}>
              {!roots.length && <option value="">None detected</option>}
              {roots.map((root) => <option key={root.fileId} value={root.fileId}>{root.kind === 'instance' ? 'Instance' : 'WorldStructure'} · {root.label}</option>)}
            </select>
          </label>
          <button className="project-graph-open-new" onClick={() => openProjectGraphAsNew(selectedRoot?.path)} disabled={!selectedRoot}>
            <LucideIcon name="network" size={13} /> Open as new graph
          </button>
          <small className="project-graph-open-new-help">Creates an independent graph instance. The toolbar Project Graph remains a singleton.</small>
          <label className="project-graph-sidebar-field">
            <span>Density depth</span>
            <select value={graphSettings.densityDepth} onChange={(event) => changeTopology({ densityDepth: Number(event.target.value) })}>
              {[4, 6, 8, 12].map((depth) => <option key={depth} value={depth}>{depth}</option>)}
            </select>
          </label>
          <label className="project-graph-sidebar-toggle">
            <input type="checkbox" checked={graphSettings.includeResources} onChange={(event) => changeTopology({ includeResources: event.target.checked })} />
            <span><strong>Resources</strong><small>Include known resource dependencies in this view.</small></span>
          </label>
        </section>

        <section className="project-graph-sidebar-section">
          <div className="project-graph-sidebar-section-title">View</div>
          <div className="project-graph-camera-status"><strong>{Math.round(zoom * 100)}%</strong><span>camera zoom</span></div>
          <div className="project-graph-camera-actions">
            <button className="primary" onClick={requestFit}>Fit graph</button>
            <button onClick={() => {
              const started = performance.now();
              setGraphSettings({ viewport: { panX: 0, panY: 0, zoom: 1 } });
              recordPerformanceDuration('graph.camera.reset', performance.now() - started, { aggregateOnly: true });
            }}><LucideIcon name="rotate-ccw" size={13} /> Reset 100%</button>
          </div>
          <small className="project-graph-camera-help">Drag empty space to pan · mouse wheel zooms around the pointer. The graph layout itself is never recalculated by camera movement.</small>
        </section>

        <section className="project-graph-sidebar-section">
          <div className="project-graph-sidebar-section-title">Summary</div>
          <div className="project-graph-sidebar-summary">
            <span><strong>{graph.linkedInstanceCount}</strong><small>/ {graph.detectedInstanceCount} linked Instances</small></span>
            <span><strong>{graph.detectedWorldStructureCount}</strong><small>WorldStructures</small></span>
            <span><strong>{graph.linkedBiomeCount}</strong><small>/ {graph.detectedBiomeCount} linked Biomes</small></span>
            <span><strong>{densityAssets}</strong><small>Density assets</small></span>
            <span className={unresolved ? 'warning' : ''}><strong>{unresolved}</strong><small>unresolved</small></span>
          </div>
        </section>

        {graph.notes.length > 0 && (
          <section className="project-graph-sidebar-section">
            <div className="project-graph-sidebar-section-title">Notes</div>
            <div className="project-graph-sidebar-notes">{graph.notes.map((note) => <div key={note}>{note}</div>)}</div>
          </section>
        )}
    </ToolSidebar>
  );
}
