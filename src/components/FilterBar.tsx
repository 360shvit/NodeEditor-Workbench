import { useWorkbenchPaneId } from '../workbench/WorkbenchPaneContext';
import { useMemo, useState } from 'react';
import { getAdaptiveQuickFieldStats, getScopedFieldStats, type FieldStat, type QuickFieldStat } from '../core';
import { nodeVisibleInProject } from '../features/inspector/visibility';
import { queryTabNodeRefs, queryTabVisibleMatches } from '../features/inspector/queryTabs';
import { allInspectorFilters, filtersAreAll, useWorkbenchStore, type InspectorFilters, type WorkbenchTab } from '../store';
import { LucideIcon } from './LucideIcon';

function FilterChip({ label, active, onClick, title, className = '' }: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <button className={`filter-chip ${active ? 'active' : ''} ${className}`.trim()} onClick={onClick} data-tooltip={title}>
      <span>{label}</span>{active && <span className="filter-chip-x" aria-hidden><LucideIcon name="x" size={10} /></span>}
    </button>
  );
}

function contextNodeRefs(
  project: NonNullable<ReturnType<typeof useWorkbenchStore.getState>['project']>,
  tab: WorkbenchTab | undefined,
  changeSet: ReturnType<typeof useWorkbenchStore.getState>['changeSet'],
) {
  if (tab?.kind === 'file') {
    const file = project.fileMap.get(tab.fileId);
    return file?.nodes.map((node) => ({ fileId: file.id, nodeId: node.id, location: node.location })) ?? [];
  }
  if (tab?.kind === 'query') return queryTabNodeRefs(project, tab, changeSet);
  return project.files.flatMap((file) => file.nodes.map((node) => ({ fileId: file.id, nodeId: node.id, location: node.location })));
}

function AddFilterPicker({ stats, quickStats, onClose }: { stats: FieldStat[]; quickStats: QuickFieldStat[]; onClose: () => void }) {
  const project = useWorkbenchStore((state) => state.project)!;
  const filters = useWorkbenchStore((state) => state.filters);
  const setFilters = useWorkbenchStore((state) => state.setFilters);
  const toggleValueField = useWorkbenchStore((state) => state.toggleValueField);
  const resetFilters = useWorkbenchStore((state) => state.resetFilters);
  const [needle, setNeedle] = useState('');
  const semanticAll = filters.imports && filters.exports && filters.seeds;
  const locationAll = filters.live && filters.floating;
  const selectedValues = new Set(filters.valueFields);
  const quickRoleByField = new Map(quickStats.map((item) => [item.key, item.quickRole]));
  const query = needle.trim().toLowerCase();
  const visibleStats = query ? stats.filter((item) => item.key.toLowerCase().includes(query)) : stats;
  const common = visibleStats
    .filter((item) => item.common)
    .sort((a, b) => ((0.60 * b.broadScore) + (0.40 * b.contextScore)) - ((0.60 * a.broadScore) + (0.40 * a.contextScore)) || b.nodeCount - a.nodeCount || a.key.localeCompare(b.key));
  const other = visibleStats.filter((item) => !item.common);
  const availableKeys = new Set(stats.map((item) => item.key));
  const selectedOutsideScope = filters.valueFields.filter((key) => !availableKeys.has(key));

  const option = (label: string, active: boolean, onClick: () => void, meta?: string) => (
    <button className={`add-filter-option ${active ? 'active' : ''}`} onClick={onClick} key={label}>
      <span>{label}</span>{meta && <small>{meta}</small>}{active && <span className="option-check"><LucideIcon name="check" size={12} /></span>}
    </button>
  );

  const fieldGroup = (title: string, items: FieldStat[]) => items.length ? (
    <section className="add-filter-section values-section">
      <header><strong>{title}</strong><small>{items.length}</small></header>
      <div className="add-filter-options field-options">
        {items.map((item) => (
          <button
            key={item.key}
            className={`add-filter-option ${selectedValues.has(item.key) ? 'active' : ''}`}
            onClick={() => toggleValueField(item.key)}
            data-tooltip={`${item.nodeCount}/${item.filterableNodeCount} filterable node(s) · ${item.nodeTypeCount}/${item.scopeNodeTypeCount} node kind(s) · ${item.fileCount}/${item.scopeFileCount} file(s) · dominant kind ${Math.round(item.dominantNodeTypeShare * 100)}% · broad ${item.broadScore.toFixed(2)} · context ${item.contextScore.toFixed(2)}`}
          >
            <span>{quickRoleByField.has(item.key) && <span className="quick-star" data-tooltip={`Quick ${quickRoleByField.get(item.key)} field`}><LucideIcon name="star" size={11} /></span>}{item.key}</span>
            <small>{item.count}</small>
            {selectedValues.has(item.key) && <span className="option-check"><LucideIcon name="check" size={12} /></span>}
          </button>
        ))}
      </div>
    </section>
  ) : null;

  return (
    <div className="add-filter-popover">
      <header>
        <div><strong>Add filter</strong><small>Normal view filters apply equally to file and Query tabs.</small></div>
        <button className="popover-close" onClick={onClose} aria-label="Close filter picker"><LucideIcon name="x" size={15} /></button>
      </header>
      <div className="add-filter-scroll">
        <section className="add-filter-section">
          <header><strong>Semantic</strong></header>
          <div className="add-filter-options">
            {option('All semantic', semanticAll, () => setFilters({ imports: true, exports: true, seeds: true }), 'No semantic restriction')}
            {option('Imports', filters.imports, () => setFilters({ imports: !filters.imports }))}
            {option('Exports', filters.exports, () => setFilters({ exports: !filters.exports }))}
            {option('Seeds', filters.seeds, () => setFilters({ seeds: !filters.seeds }))}
          </div>
        </section>
        <section className="add-filter-section">
          <header><strong>Location</strong></header>
          <div className="add-filter-options">
            {option('All locations', locationAll, () => setFilters({ live: true, floating: true }), 'No location restriction')}
            {option('Live', filters.live, () => setFilters({ live: !filters.live }))}
            {option('Floating', filters.floating, () => setFilters({ floating: !filters.floating }))}
          </div>
        </section>
        <section className="add-filter-section">
          <header><strong>Workspace</strong><small>View/query filter — separate from Explorer navigation</small></header>
          <div className="add-filter-options workspace-options">
            {option('All workspaces', filters.workspace === 'all', () => setFilters({ workspace: 'all' }))}
            {project.workspaces.map((workspace) => option(
              workspace.label,
              filters.workspace === workspace.id,
              () => setFilters({ workspace: workspace.id }),
            ))}
          </div>
        </section>
        <section className="add-filter-section values-search-section">
          <header><strong>Node values</strong><small>{stats.length} field types in current view-filter scope</small></header>
          <div className="add-filter-options">
            {option('All values', filters.allValues, () => setFilters({ allValues: true, valueFields: [] }), 'No property-field restriction')}
          </div>
          <input value={needle} onChange={(event) => setNeedle(event.target.value)} placeholder="Find field…" autoFocus />
        </section>
        {selectedOutsideScope.length > 0 && (
          <section className="add-filter-section values-section outside-scope">
            <header><strong>Selected outside scope</strong><small>{selectedOutsideScope.length}</small></header>
            <div className="add-filter-options field-options">
              {selectedOutsideScope.map((field) => option(field, true, () => toggleValueField(field), '0'))}
            </div>
          </section>
        )}
        {fieldGroup('Common', common)}
        {fieldGroup('Other', other)}
        {!visibleStats.length && !selectedOutsideScope.length && <div className="add-filter-empty">No node-value fields in this scope.</div>}
      </div>
      <footer>
        <span>{filters.allValues ? 'All value fields visible' : `${filters.valueFields.length} value filter${filters.valueFields.length === 1 ? '' : 's'} selected`}</span>
        <button onClick={() => { resetFilters(); setNeedle(''); }}>Reset filters</button>
      </footer>
    </div>
  );
}

function visibleCount(
  project: NonNullable<ReturnType<typeof useWorkbenchStore.getState>['project']>,
  tab: WorkbenchTab | undefined,
  filters: InspectorFilters,
  changeSet: ReturnType<typeof useWorkbenchStore.getState>['changeSet'],
) {
  if (tab?.kind === 'file') {
    const file = project.fileMap.get(tab.fileId);
    if (!file) return { shown: 0, total: 0 };
    return { shown: file.nodes.filter((node) => nodeVisibleInProject(project, node, filters)).length, total: file.nodes.length };
  }
  if (tab?.kind === 'query') {
    const total = queryTabNodeRefs(project, tab, changeSet).length;
    return { shown: queryTabVisibleMatches(project, tab, changeSet, filters).length, total };
  }
  const all = project.files.flatMap((file) => file.nodes);
  return { shown: all.filter((node) => nodeVisibleInProject(project, node, filters)).length, total: all.length };
}

export function FilterBar() {
  const paneId = useWorkbenchPaneId();
  const project = useWorkbenchStore((state) => state.project);
  const tabs = useWorkbenchStore((state) => state.tabs);
  const activeTabId = useWorkbenchStore((state) => state.paneActiveTabIds[paneId]);
  const filters = useWorkbenchStore((state) => state.filters);
  const changeSet = useWorkbenchStore((state) => state.changeSet);
  const setFilters = useWorkbenchStore((state) => state.setFilters);
  const toggleValueField = useWorkbenchStore((state) => state.toggleValueField);
  const resetFilters = useWorkbenchStore((state) => state.resetFilters);
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const quickStats = useMemo(() => {
    if (!project) return [];
    // Stable per file/search snapshot: quick slots do not reshuffle when a filter button is toggled.
    return getAdaptiveQuickFieldStats(project, contextNodeRefs(project, activeTab, changeSet), true, 2, 1);
  }, [project, activeTabId, activeTab, changeSet]);
  const quickFields = quickStats.map((item) => item.key);

  const pickerStats = useMemo(() => project ? getScopedFieldStats(project, {
    workspace: filters.workspace,
    live: filters.live,
    floating: filters.floating,
    hideEmpty: filters.hideEmpty,
  }) : [], [project, filters.workspace, filters.live, filters.floating, filters.hideEmpty]);

  const counts = useMemo(() => project ? visibleCount(project, activeTab, filters, changeSet) : { shown: 0, total: 0 }, [project, activeTab, filters, changeSet]);
  const extraValues = filters.valueFields.filter((field) => !quickFields.includes(field));
  const allActive = filtersAreAll(filters);

  if (!project) return <div className="filter-bar filter-bar-disabled"><span className="filter-label">Filters</span><span>Open a project to enable filters.</span></div>;

  return (
    <div className="filter-bar quick-filter-bar">
      <span className="filter-label">Filters</span>
      <div className="quick-filter-group master-filter" data-tooltip="Show all normal node and field categories in the current tab/project scope">
        <FilterChip label="ALL" active={allActive} onClick={() => allActive ? resetFilters() : setFilters(allInspectorFilters)} className="master" />
      </div>
      <span className="filter-separator" />
      <div className="quick-filter-group hard-filters" data-tooltip="Always available Quick Filters">
        <FilterChip label="Imports" active={filters.imports} onClick={() => setFilters({ imports: !filters.imports })} />
        <FilterChip label="Exports" active={filters.exports} onClick={() => setFilters({ exports: !filters.exports })} />
        <FilterChip label="Live" active={filters.live} onClick={() => setFilters({ live: !filters.live })} />
        <FilterChip label="Floating" active={filters.floating} onClick={() => setFilters({ floating: !filters.floating })} />
      </div>
      <span className="filter-separator" />
      <div className="quick-filter-group adaptive-filters" data-tooltip="Adaptive quick values for the current view">
        {quickStats.map((field) => (
          <FilterChip
            key={field.key}
            label={field.key}
            active={filters.valueFields.includes(field.key)}
            onClick={() => toggleValueField(field.key)}
            title={`${field.quickRole === 'broad' ? 'Broad common' : 'Context common'} · ${field.nodeCount}/${field.filterableNodeCount} filterable nodes · ${field.nodeTypeCount}/${field.scopeNodeTypeCount} node kinds · ${field.fileCount}/${field.scopeFileCount} files · dominant kind ${Math.round(field.dominantNodeTypeShare * 100)}%`}
            className="adaptive"
          />
        ))}
        {!quickStats.length && <span className="quick-filter-empty">No common values</span>}
      </div>
      <div className="extra-filter-chips">
        {filters.seeds && <FilterChip label="Seeds" active onClick={() => setFilters({ seeds: false })} className="extra" />}
        {filters.workspace !== 'all' && (
          <FilterChip label={`Workspace: ${project.workspaces.find((item) => item.id === filters.workspace)?.label ?? filters.workspace}`}  active onClick={() => setFilters({ workspace: 'all' })} className="extra workspace" />
        )}
        {extraValues.map((field) => <FilterChip key={field} label={field} active onClick={() => toggleValueField(field)} className="extra" />)}
      </div>
      <div className="add-filter-wrap">
        <button className={`add-filter-button ${pickerOpen ? 'active' : ''}`} onClick={() => setPickerOpen((value) => !value)}>+ Filter</button>
        {pickerOpen && <AddFilterPicker stats={pickerStats} quickStats={quickStats} onClose={() => setPickerOpen(false)} />}
      </div>
      <span className="filter-result-count">{counts.shown} / {counts.total} nodes</span>
    </div>
  );
}
