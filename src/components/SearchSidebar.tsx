import { useMemo } from 'react';
import { searchProject, searchProjectNodes, type ProjectModel, type ProjectSearchResult } from '../core';
import { useWorkbenchStore } from '../store';
import { measurePerformanceSync } from '../support/performanceTracing';
import { LucideIcon } from './LucideIcon';

const IS_VALUES = ['import', 'export', 'unresolved', 'changed', 'live', 'floating'] as const;
type Suggestion = { value: string; detail?: string };

function quoteIfNeeded(value: string): string {
  return /\s/.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}

function activeOperatorToken(query: string): { name: string; prefix: string; tokenStart: number } | undefined {
  const match = /(?:^|\s)(is|workspace|field|node|type|location):([^\s]*)$/i.exec(query);
  if (!match || match.index === undefined) return undefined;
  const leadingSpace = match[0].startsWith(' ') ? 1 : 0;
  return { name: match[1].toLowerCase(), prefix: match[2].replace(/^['"]|['"]$/g, ''), tokenStart: match.index + leadingSpace };
}

function directScore(result: ProjectSearchResult, query: string): number {
  const needle = query.trim().toLowerCase();
  const title = result.title.toLowerCase();
  let score = result.kind === 'file' ? 400 : result.kind === 'resource' ? 350 : result.kind === 'symbol' ? 300 : result.kind === 'node' ? 180 : 100;
  if (title === needle) score += 500;
  else if (title.startsWith(needle)) score += 260;
  else if (title.includes(needle)) score += 100;
  if (result.subtitle.toLowerCase().includes(needle)) score += 20;
  return score;
}

function topDirectMatches(project: ProjectModel, query: string): ProjectSearchResult[] {
  return searchProject(project, query, 60)
    .filter((result) => !!result.fileId || result.kind === 'resource')
    .sort((a, b) => directScore(b, query) - directScore(a, query) || a.title.localeCompare(b.title))
    .slice(0, 3);
}

export function SearchSidebar() {
  const project = useWorkbenchStore((state) => state.project);
  const changeSet = useWorkbenchStore((state) => state.changeSet);
  const query = useWorkbenchStore((state) => state.searchSidebarQuery);
  const recentSearches = useWorkbenchStore((state) => state.recentSearches);
  const setQuery = useWorkbenchStore((state) => state.setSearchSidebarQuery);
  const openSearchTab = useWorkbenchStore((state) => state.openSearchTab);
  const recordRecentSearch = useWorkbenchStore((state) => state.recordRecentSearch);
  const selectFile = useWorkbenchStore((state) => state.selectFile);
  const focusNode = useWorkbenchStore((state) => state.focusNode);
  const openResourceReferenceTab = useWorkbenchStore((state) => state.openResourceReferenceTab);
  const preview = useMemo(() => project && query.trim() ? measurePerformanceSync('search.preview', () => searchProjectNodes(project, query, changeSet, 250), { aggregateOnly: true, data: { queryLength: query.trim().length, projectFiles: project.files.length } }) : undefined, [project, query, changeSet]);
  const directMatches = useMemo(() => project && query.trim() && !activeOperatorToken(query) ? measurePerformanceSync('search.direct-navigation', () => topDirectMatches(project, query), { aggregateOnly: true, data: { queryLength: query.trim().length, projectFiles: project.files.length, inventoryFiles: project.inventoryPaths.length } }) : [], [project, query]);
  const operator = useMemo(() => activeOperatorToken(query), [query]);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!project || !operator) return [];
    const values: Suggestion[] = [];
    if (operator.name === 'is') IS_VALUES.forEach((value) => values.push({ value }));
    else if (operator.name === 'location') ['live', 'floating'].forEach((value) => values.push({ value }));
    else if (operator.name === 'workspace') project.workspaces.forEach((workspace) => values.push({ value: workspace.label, detail: workspace.id }));
    else if (operator.name === 'field') {
      const counts = new Map<string, number>();
      for (const file of project.files) for (const node of file.nodes) for (const field of node.fields) counts.set(field.key, (counts.get(field.key) ?? 0) + 1);
      [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).forEach(([value, count]) => values.push({ value, detail: `${count} occurrence${count === 1 ? '' : 's'}` }));
    } else if (operator.name === 'node' || operator.name === 'type') {
      const counts = new Map<string, number>();
      for (const file of project.files) for (const node of file.nodes) counts.set(node.nodeKind, (counts.get(node.nodeKind) ?? 0) + 1);
      [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).forEach(([value, count]) => values.push({ value, detail: `${count} node${count === 1 ? '' : 's'}` }));
    }
    const prefix = operator.prefix.toLowerCase();
    return values.filter((item) => !prefix || item.value.toLowerCase().includes(prefix)).slice(0, 10);
  }, [project, operator]);

  const submit = () => {
    if (!project || !query.trim()) return;
    recordRecentSearch(query);
    openSearchTab(query);
  };

  const chooseSuggestion = (value: string) => {
    if (!operator) return;
    const replacement = `${operator.name}:${quoteIfNeeded(value)}`;
    setQuery(`${query.slice(0, operator.tokenStart)}${replacement}`);
  };

  const openDirect = (result: ProjectSearchResult) => {
    if (result.kind === 'resource' && result.resourceKind && result.resourceName) {
      openResourceReferenceTab(result.resourceKind, result.resourceName, result.resourcePath);
      return;
    }
    if (!result.fileId) return;
    if (result.nodeId && result.location) focusNode(result.fileId, result.nodeId, result.location);
    else selectFile(result.fileId);
  };

  if (!project) return null;

  return (
    <aside className="search-sidebar" aria-label="Search sidebar">
      <div className="sidebar-view-header"><strong>Search</strong><small>Enter opens a Search tab</small></div>
      <div className="search-sidebar-body">
        <label className="search-sidebar-input-label" htmlFor="project-search-input">Project query</label>
        <div className="search-sidebar-input-row search-with-recents">
          <input
            id="project-search-input"
            autoFocus
            value={query}
            placeholder="River or field:Seed"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') submit(); }}
          />
          <details className="search-recent-dropdown">
            <summary data-tooltip="Recent searches"><LucideIcon name="chevron-right" size={14} className="details-chevron" /></summary>
            <div className="search-recent-menu">
              <strong>Recent searches</strong>
              {recentSearches.length ? recentSearches.map((item) => <button key={item} onClick={(event) => { setQuery(item); (event.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open'); }}>{item}</button>) : <small>No confirmed searches yet.</small>}
            </div>
          </details>
          <button className="primary" disabled={!query.trim()} onClick={submit} data-tooltip="Open full Search tab"><LucideIcon name="corner-down-left" size={15} /></button>
        </div>

        {!operator && query.trim() && (
          <section className="search-sidebar-section search-top-matches">
            <div className="search-sidebar-section-title">Top matches</div>
            {directMatches.length ? directMatches.map((result) => (
              <button key={result.id} onClick={() => openDirect(result)}>
                <span><strong>{result.title}</strong><small>{result.subtitle}</small></span>
                <em>{result.kind}</em>
              </button>
            )) : <div className="search-top-empty">No direct file/symbol match. Enter still opens the full Search tab.</div>}
          </section>
        )}

        {operator && suggestions.length > 0 && (
          <section className="search-sidebar-section">
            <div className="search-sidebar-section-title">Suggestions for <code>{operator.name}:</code></div>
            <div className="search-sidebar-suggestions">
              {suggestions.map((suggestion) => (
                <button key={`${operator.name}:${suggestion.value}`} onClick={() => chooseSuggestion(suggestion.value)}>
                  <span>{suggestion.value}</span>{suggestion.detail && <small>{suggestion.detail}</small>}
                </button>
              ))}
            </div>
          </section>
        )}

        {query.trim() && preview && (
          <section className="search-sidebar-preview"><div><strong>{preview.total}</strong><span>matching node{preview.total === 1 ? '' : 's'}</span></div><button onClick={submit}>Open Search Tab</button></section>
        )}
        {preview?.parsed.unknownOperators.length ? <div className="search-query-warning">Unknown operator/value: {preview.parsed.unknownOperators.map((item) => `${item.name}:${item.value}`).join(', ')}</div> : null}
        <section className="search-sidebar-section search-sidebar-help">
          <div className="search-sidebar-section-title">Query syntax</div><code>field:Seed River</code><code>value:900</code><code>is:unresolved</code><code>is:changed</code><code>workspace:Density</code>
        </section>
      </div>
    </aside>
  );
}
