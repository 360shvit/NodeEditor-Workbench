import { useEffect, useMemo, useState } from 'react';
import { readWorkspaceTextPreview, type WorkspaceTextPreview } from '../../io/folderLoader';
import {
  workspaceCssClass,
  workspaceLabel,
  type DiagnosticCode,
  type ProjectFile,
  type SemanticReference,
  type SymbolRecord,
} from '../../core';
import { FileTabs, workbenchTabDomId, workbenchTabPanelDomId } from '../../components/FileTabs';
import { LucideIcon } from '../../components/LucideIcon';
import { FilterBar } from '../../components/FilterBar';
import { VisualLayoutTab } from '../visual/VisualLayoutTab';
import { ProjectGraphView } from '../project-graph/ProjectGraphView';
import { WorldgenPerformanceTab } from '../worldgen-performance/WorldgenPerformanceTab';
import { NodeCard } from '../../components/NodeCard';
import { ReferenceDrawer } from '../../components/ReferenceDrawer';
import {
  useWorkbenchStore,
  type ChangesQueryTab,
  type DiagnosticsQueryTab,
  type QueryWorkbenchTab,
  type ReferenceQueryTab,
  type ResourceReferenceQueryTab,
  type SearchQueryTab,
  type VirtualNodeMatch,
  type WorkbenchPaneId,
} from '../../store';
import { WorkbenchPaneProvider, useWorkbenchPaneId } from '../../workbench/WorkbenchPaneContext';
import { nodeVisible } from './visibility';
import {
  DIAGNOSTIC_ORDER,
  diagnosticLabel,
  nonNodeDiagnostics,
  queryTabDiagnostics,
  queryTabVisibleMatches,
} from './queryTabs';

function ReferenceDrawerHost({ record, onClose }: { record: SymbolRecord; onClose: () => void }) {
  const focusNode = useWorkbenchStore((state) => state.focusNode);
  const setFilters = useWorkbenchStore((state) => state.setFilters);
  const openReferenceTab = useWorkbenchStore((state) => state.openReferenceTab);
  return (
    <ReferenceDrawer
      record={record}
      onClose={onClose}
      onOpenAsTab={(item) => {
        openReferenceTab(item.key.symbolType, item.key.name);
        onClose();
      }}
      onOpenOccurrence={(item) => {
        if (item.field === 'ExportAs') setFilters({ exports: true });
        if (item.field === 'Name') setFilters({ imports: true });
        focusNode(item.fileId, item.nodeId, item.location);
        onClose();
      }}
    />
  );
}

function FileInspectorContent({ file }: { file: ProjectFile }) {
  const paneId = useWorkbenchPaneId();
  const project = useWorkbenchStore((state) => state.project)!;
  const filters = useWorkbenchStore((state) => state.filters);
  const focusedNode = useWorkbenchStore((state) => state.focusedNode);
  const activePane = useWorkbenchStore((state) => state.activePane);
  const [references, setReferences] = useState<SymbolRecord>();
  const [liveOpen, setLiveOpen] = useState(true);
  const [floatingOpen, setFloatingOpen] = useState(false);
  const openSourceTab = useWorkbenchStore((state) => state.openSourceTab);
  const openResourceReferenceTab = useWorkbenchStore((state) => state.openResourceReferenceTab);
  const resourceReferences = useMemo(() => {
    const unique = new Map<string, SemanticReference>();
    for (const reference of project.semanticReferences) {
      if (reference.source.fileId !== file.id || reference.target.kind !== 'resource' || !reference.target.resourceKind) continue;
      const key = `${reference.target.resourceKind}:${reference.target.resourcePath ?? reference.target.name}`;
      if (!unique.has(key)) unique.set(key, reference);
    }
    return [...unique.values()];
  }, [project, file.id]);

  const groups = useMemo(() => {
    if (filters.workspace !== 'all' && file.workspace.id !== filters.workspace) return { live: [], floating: [] };
    return {
      live: file.nodes.filter((node) => node.location === 'live' && nodeVisible(node, filters)),
      floating: file.nodes.filter((node) => node.location === 'floating' && nodeVisible(node, filters)),
    };
  }, [file, filters]);

  useEffect(() => {
    if (activePane !== paneId || !focusedNode || focusedNode.fileId !== file.id) return;
    if (focusedNode.location === 'live') setLiveOpen(true);
    if (focusedNode.location === 'floating') setFloatingOpen(true);
    const timer = window.setTimeout(() => {
      const element = document.getElementById(`node-${paneId}-${encodeURIComponent(focusedNode.nodeId)}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element?.classList.add('node-focus-flash');
      window.setTimeout(() => element?.classList.remove('node-focus-flash'), 1400);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [activePane, focusedNode, file.id, paneId]);

  return (
    <>
      <div className="file-heading">
        <div>
          <div className="heading-line"><h2>{file.name}</h2><span className={`workspace-badge ${workspaceCssClass(file.workspace)}`}>{workspaceLabel(file.workspace)}</span></div>
          <small>{file.path}</small>
        </div>
        <div className="file-stats">
          <span>{groups.live.length} relevant live</span>
          <span>{groups.floating.length} relevant floating</span>
          <span>{file.nodes.length} total nodes</span>
          <button className="source-open-button" onClick={() => openSourceTab(file.path)}><LucideIcon name="file-text" size={13} /> Source</button>
        </div>
      </div>

      {resourceReferences.length > 0 && (
        <div className="resource-reference-strip">
          <span className="resource-reference-strip-label"><LucideIcon name="link-2" size={12} /> Resources</span>
          <div className="resource-reference-strip-items">
            {resourceReferences.map((reference) => (
              <button
                key={reference.id}
                className={`resource-reference-chip ${reference.status}`}
                onClick={() => openResourceReferenceTab(reference.target.resourceKind!, reference.target.name, reference.target.resourcePath)}
                data-tooltip={`${reference.relation} · ${reference.status}`}
              >
                <span>{reference.target.type}</span><strong>{reference.target.name}</strong>
              </button>
            ))}
          </div>
        </div>
      )}

      {file.parseError && (
        <div className="source-parse-error" role="alert">
          <div><strong>JSON parse error</strong><span>{file.parseError}</span></div>
          <button onClick={() => openSourceTab(file.path)}>Open read-only source</button>
        </div>
      )}

      {filters.live && (
        <section className="node-section">
          <button className="section-toggle" onClick={() => setLiveOpen((value) => !value)}>
            <span><LucideIcon name={liveOpen ? 'chevron-down' : 'chevron-right'} size={13} /> Live nodes</span><small>{groups.live.length}</small>
          </button>
          {liveOpen && (groups.live.length
            ? groups.live.map((node) => <NodeCard key={`live-${node.id}`} node={node} onShowReferences={setReferences} />)
            : <div className="section-empty">No live nodes match the normal filters.</div>)}
        </section>
      )}

      {filters.floating && (
        <section className="node-section floating-section">
          <button className="section-toggle" onClick={() => setFloatingOpen((value) => !value)}>
            <span><LucideIcon name={floatingOpen ? 'chevron-down' : 'chevron-right'} size={13} /> Floating / editor-only nodes</span><small>{groups.floating.length}</small>
          </button>
          {floatingOpen && (groups.floating.length
            ? groups.floating.map((node) => <NodeCard key={`floating-${node.id}`} node={node} onShowReferences={setReferences} />)
            : <div className="section-empty">No floating nodes match the normal filters.</div>)}
        </section>
      )}

      {references && <ReferenceDrawerHost record={references} onClose={() => setReferences(undefined)} />}
    </>
  );
}

function humanBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KiB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MiB`;
}

function SourceInspectorContent({ path }: { path: string }) {
  const workspace = useWorkbenchStore((state) => state.workspace)!;
  const project = useWorkbenchStore((state) => state.project)!;
  const [preview, setPreview] = useState<WorkspaceTextPreview>();
  const [error, setError] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);
  const semanticFile = project.files.find((file) => file.path === path);
  const openResourceReferenceTab = useWorkbenchStore((state) => state.openResourceReferenceTab);
  const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
  const resourceReferences = useMemo(() => {
    const unique = new Map<string, SemanticReference>();
    for (const reference of project.semanticReferences) {
      if (reference.target.kind !== 'resource' || !reference.target.resourceKind) continue;
      const paths = [reference.target.resourcePath, reference.target.filePath, ...reference.candidates.map((candidate) => candidate.resourcePath ?? candidate.filePath)]
        .filter((value): value is string => !!value)
        .map((value) => value.replace(/\\/g, '/').replace(/\/+$/g, '').toLowerCase());
      const matchesPath = paths.includes(normalizedPath)
        || (reference.target.resourceKind === 'prefab' && paths.some((candidatePath) => normalizedPath.startsWith(`${candidatePath}/`)));
      if (!matchesPath) continue;
      const key = `${reference.target.resourceKind}:${reference.target.resourcePath ?? reference.target.name}`;
      if (!unique.has(key)) unique.set(key, reference);
    }
    return [...unique.values()];
  }, [project, normalizedPath]);

  useEffect(() => {
    let cancelled = false;
    setPreview(undefined);
    setError(undefined);
    void readWorkspaceTextPreview(workspace, path).then((value) => {
      if (!cancelled) setPreview(value);
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
    });
    return () => { cancelled = true; };
  }, [workspace, path, reloadToken]);

  const name = path.replace(/\\/g, '/').split('/').filter(Boolean).at(-1) ?? path;
  return (
    <div className="source-view">
      <div className="source-view-heading">
        <div>
          <div className="heading-line"><h2>{name}</h2><span className="virtual-tab-badge source">read only</span></div>
          <small>{path}</small>
        </div>
        <div className="source-view-actions">
          {resourceReferences.map((reference) => (
            <button key={reference.id} onClick={() => openResourceReferenceTab(reference.target.resourceKind!, reference.target.name, reference.target.resourcePath ?? path)}>
              <LucideIcon name="link-2" size={13} /> {reference.target.type} references
            </button>
          ))}
          <button onClick={() => setReloadToken((value) => value + 1)} disabled={!preview && !error}><LucideIcon name="rotate-ccw" size={13} /> Re-read</button>
        </div>
      </div>
      {semanticFile?.parseError && <div className="source-parse-error" role="alert"><div><strong>Parse error</strong><span>{semanticFile.parseError}</span></div></div>}
      {!preview && !error && <div className="source-preview-state">Reading bounded source preview…</div>}
      {error && <div className="source-preview-state error">{error}</div>}
      {preview && (
        <>
          <div className="source-preview-meta">
            <span>{humanBytes(preview.size)}</span>
            <span>{preview.kind === 'text' ? 'UTF-8 text' : preview.kind === 'binary' ? 'Binary / non-UTF-8' : preview.kind === 'too-large' ? 'Preview limit exceeded' : preview.kind}</span>
            <span>{semanticFile ? 'semantic file · source view only' : 'inventory only'}</span>
          </div>
          {preview.kind === 'text' && preview.text !== undefined
            ? <pre className="raw-source-code"><code>{preview.text}</code></pre>
            : <div className="source-preview-state">
                <strong>{preview.kind === 'too-large' ? 'Source preview disabled for this file size.' : 'No safe text preview available.'}</strong>
                <span>{preview.kind === 'too-large' ? 'The file stays inventory-only in this view; no content was transferred to the editor.' : 'The file is kept as metadata only because it is not valid UTF-8 text.'}</span>
              </div>}
        </>
      )}
    </div>
  );
}

function QueryNodeResults({
  tab,
  emptyTitle,
  emptyText,
  matchedFieldLabel,
  matchedNodeLabel,
}: {
  tab: QueryWorkbenchTab;
  emptyTitle: string;
  emptyText: string;
  matchedFieldLabel: string;
  matchedNodeLabel?: string;
}) {
  const project = useWorkbenchStore((state) => state.project)!;
  const filters = useWorkbenchStore((state) => state.filters);
  const changeSet = useWorkbenchStore((state) => state.changeSet);
  const [references, setReferences] = useState<SymbolRecord>();

  const visibleMatches = useMemo(
    () => queryTabVisibleMatches(project, tab, changeSet, filters),
    [project, tab, changeSet, filters],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, { file: ProjectFile; items: Array<{ match: VirtualNodeMatch; node: (typeof visibleMatches)[number]['node'] }> }>();
    for (const item of visibleMatches) {
      const group = groups.get(item.file.id) ?? { file: item.file, items: [] };
      group.items.push({ match: item.match, node: item.node });
      groups.set(item.file.id, group);
    }
    return [...groups.values()];
  }, [visibleMatches]);

  return (
    <>
      <div className="query-node-results">
        {grouped.map((group) => (
          <section className="search-file-group" key={group.file.id}>
            <header>
              <div><strong>{group.file.name}</strong><small>{group.file.path}</small></div>
              <div><span className={`workspace-badge ${workspaceCssClass(group.file.workspace)}`}>{workspaceLabel(group.file.workspace)}</span><small>{group.items.length} shown</small></div>
            </header>
            {group.items.map(({ node, match }) => (
              <NodeCard
                key={`${group.file.id}:${node.location}:${node.id}`}
                node={node}
                onShowReferences={setReferences}
                matchedFieldPaths={match.matchedFieldPaths}
                matchedNodeMetadata={match.matchedNodeMetadata}
                matchedFieldLabel={matchedFieldLabel}
                matchedNodeLabel={matchedNodeLabel}
              />
            ))}
          </section>
        ))}
        {!visibleMatches.length && (
          <div className="search-empty-state">
            <h3>{emptyTitle}</h3>
            <p>{emptyText}</p>
          </div>
        )}
      </div>
      {references && <ReferenceDrawerHost record={references} onClose={() => setReferences(undefined)} />}
    </>
  );
}

function SnapshotStaleBanner({ tab }: { tab: SearchQueryTab | ReferenceQueryTab | ResourceReferenceQueryTab }) {
  const projectVersion = useWorkbenchStore((state) => state.projectVersion);
  const changeVersion = useWorkbenchStore((state) => state.changeVersion);
  const refreshQueryTab = useWorkbenchStore((state) => state.refreshQueryTab);
  const stale = tab.projectVersion !== projectVersion || tab.changeVersion !== changeVersion;
  if (!stale) return null;
  return (
    <div className="search-stale-banner">
      <span>This snapshot may be outdated because staged values or the project changed. The normal filters remain live.</span>
      <button onClick={() => refreshQueryTab(tab.id)}>Refresh results</button>
    </div>
  );
}

function SearchInspectorContent({ tab }: { tab: SearchQueryTab }) {
  const project = useWorkbenchStore((state) => state.project)!;
  const filters = useWorkbenchStore((state) => state.filters);
  const changeSet = useWorkbenchStore((state) => state.changeSet);
  const visibleCount = useMemo(() => queryTabVisibleMatches(project, tab, changeSet, filters).length, [project, tab, changeSet, filters]);

  return (
    <>
      <div className="search-tab-heading">
        <div>
          <div className="heading-line"><h2>Search: {tab.query}</h2><span className="virtual-tab-badge">snapshot</span></div>
          <small>{tab.snapshot.total} node matches in snapshot · {visibleCount} shown by normal filters</small>
        </div>
        <div className="search-query-chips">
          {tab.snapshot.parsed.fields.map((value) => <code key={`field:${value}`}>field:{value}</code>)}
          {tab.snapshot.parsed.values.map((value) => <code key={`value:${value}`}>value:{value}</code>)}
          {tab.snapshot.parsed.is.map((value) => <code key={`is:${value}`}>is:{value}</code>)}
          {tab.snapshot.parsed.workspaces.map((value) => <code key={`workspace:${value}`}>workspace:{value}</code>)}
          {tab.snapshot.parsed.nodeTypes.map((value) => <code key={`node:${value}`}>node:{value}</code>)}
          {tab.snapshot.parsed.locations.map((value) => <code key={`location:${value}`}>location:{value}</code>)}
        </div>
      </div>
      <SnapshotStaleBanner tab={tab} />
      {tab.snapshot.truncated && <div className="search-stale-banner warning"><span>Snapshot is truncated to the result safety limit.</span></div>}
      {tab.snapshot.parsed.unknownOperators.length > 0 && (
        <div className="search-stale-banner warning"><span>Unknown query operator(s): {tab.snapshot.parsed.unknownOperators.map((item) => `${item.name}:${item.value}`).join(', ')}</span></div>
      )}
      <QueryNodeResults
        tab={tab}
        matchedFieldLabel="match"
        matchedNodeLabel="query match"
        emptyTitle="No nodes are visible with the normal filters."
        emptyText={`The search snapshot contains ${tab.snapshot.total} matching node${tab.snapshot.total === 1 ? '' : 's'}. Change the normal Quick / +Filter controls to reveal them. Explorer Workspace never limits Search results.`}
      />
    </>
  );
}

function ReferencesInspectorContent({ tab }: { tab: ReferenceQueryTab }) {
  const project = useWorkbenchStore((state) => state.project)!;
  const filters = useWorkbenchStore((state) => state.filters);
  const changeSet = useWorkbenchStore((state) => state.changeSet);
  const visibleCount = useMemo(() => queryTabVisibleMatches(project, tab, changeSet, filters).length, [project, tab, changeSet, filters]);
  const totalNodes = tab.matches.length;

  return (
    <>
      <div className="search-tab-heading reference-tab-heading">
        <div>
          <div className="heading-line"><h2>References: {tab.symbolName}</h2><span className="virtual-tab-badge reference">{tab.symbolType}</span><span className="virtual-tab-badge">snapshot</span></div>
          <small>{tab.definitionCount} definition(s) · {tab.referenceCount} reference(s) · {totalNodes} node(s) in snapshot · {visibleCount} shown</small>
        </div>
      </div>
      <SnapshotStaleBanner tab={tab} />
      <QueryNodeResults
        tab={tab}
        matchedFieldLabel="reference"
        emptyTitle="No symbol occurrences are visible with the normal filters."
        emptyText="Enable Imports / Exports or the relevant Live / Floating location to reveal occurrences from this reference snapshot."
      />
    </>
  );
}

function ResourceReferencesInspectorContent({ tab }: { tab: ResourceReferenceQueryTab }) {
  const project = useWorkbenchStore((state) => state.project)!;
  const workspace = useWorkbenchStore((state) => state.workspace)!;
  const openSourceTab = useWorkbenchStore((state) => state.openSourceTab);
  const revealPathInExplorer = useWorkbenchStore((state) => state.revealPathInExplorer);
  const references = tab.references;
  const resolved = references.filter((reference) => reference.status === 'resolved').length;
  const unresolved = references.filter((reference) => reference.status === 'unresolved').length;
  const ambiguous = references.filter((reference) => reference.status === 'ambiguous').length;
  const targetPath = tab.resourcePath
    ?? references.find((reference) => reference.target.resourcePath)?.target.resourcePath
    ?? references.flatMap((reference) => reference.candidates).find((candidate) => candidate.resourcePath)?.resourcePath;
  const targetSourcePath = targetPath && workspace.sourceEntries.has(targetPath)
    ? targetPath
    : targetPath && tab.resourceKind === 'prefab'
      ? [...workspace.sourceEntries.keys()]
          .filter((path) => path.replace(/\\/g, '/').toLowerCase().startsWith(`${targetPath.replace(/\\/g, '/').replace(/\/+$/g, '').toLowerCase()}/`))
          .sort()[0]
      : undefined;

  const openSource = (path: string) => {
    if (workspace.sourceEntries.has(path)) openSourceTab(path);
  };

  return (
    <>
      <div className="search-tab-heading reference-tab-heading resource-reference-heading">
        <div>
          <div className="heading-line">
            <h2>Resource: {tab.resourceName}</h2>
            <span className="virtual-tab-badge reference">{tab.resourceKind === 'environment' ? 'Environment' : 'Prefab'}</span>
            <span className="virtual-tab-badge">snapshot</span>
          </div>
          <small>{references.length} consumer reference(s) · {resolved} resolved · {unresolved} unresolved · {ambiguous} ambiguous</small>
          {targetPath && <code className="resource-reference-path">{targetPath}</code>}
        </div>
        {targetSourcePath && (
          <div className="resource-reference-heading-actions">
            <button onClick={() => openSource(targetSourcePath)}><LucideIcon name="file-text" size={13} /> Open resource source</button>
            <button onClick={() => revealPathInExplorer(targetSourcePath)}><LucideIcon name="folder-tree" size={13} /> Reveal in Explorer</button>
          </div>
        )}
      </div>
      <SnapshotStaleBanner tab={tab} />
      <div className="resource-reference-results">
        {references.map((reference) => (
          <section className={`resource-reference-card ${reference.status}`} key={reference.id}>
            <header>
              <div>
                <strong>{reference.source.label ?? reference.source.filePath.split('/').at(-1) ?? reference.source.filePath}</strong>
                <small>{reference.source.filePath}</small>
              </div>
              <span className={`resource-reference-status ${reference.status}`}>{reference.status}</span>
            </header>
            <div className="resource-reference-meta">
              <span>{reference.relation}</span>
              {reference.source.jsonPath?.length ? <code>{reference.source.jsonPath.map(String).join('.')}</code> : null}
            </div>
            <div className="resource-reference-actions">
              <button onClick={() => openSource(reference.source.filePath)}><LucideIcon name="file-text" size={12} /> Open consumer source</button>
            </div>
            {reference.status !== 'resolved' && (
              <div className="resource-reference-candidates">
                <strong>{reference.status === 'ambiguous' ? `Candidates (${reference.candidates.length})` : 'Resolution'}</strong>
                {reference.candidates.length ? reference.candidates.map((candidate, index) => (
                  <button key={`${candidate.filePath}:${index}`} onClick={() => openSource(candidate.resourcePath ?? candidate.filePath)}>
                    <span>{candidate.label}</span><small>{candidate.resourcePath ?? candidate.filePath}</small>
                  </button>
                )) : <span>No matching resource candidate in the loaded inventory.</span>}
              </div>
            )}
          </section>
        ))}
        {!references.length && (
          <div className="search-empty-state">
            <h3>No consumers currently reference this resource.</h3>
            <p>The resource remains searchable from inventory, but no Environment/Prefab semantic dependency points to it in the current project snapshot.</p>
          </div>
        )}
      </div>
    </>
  );
}

function DiagnosticsOverview({ tab }: { tab: DiagnosticsQueryTab }) {
  const project = useWorkbenchStore((state) => state.project)!;
  const openDiagnosticsTab = useWorkbenchStore((state) => state.openDiagnosticsTab);
  const diagnostics = project.diagnostics;
  const errors = diagnostics.filter((item) => item.severity === 'error').length;
  const warnings = diagnostics.filter((item) => item.severity === 'warning').length;
  const info = diagnostics.filter((item) => item.severity === 'info').length;

  return (
    <>
      <div className="search-tab-heading diagnostics-tab-heading">
        <div>
          <div className="heading-line"><h2>Diagnostics</h2><span className="virtual-tab-badge live-query">live</span></div>
          <small>{errors} errors · {warnings} warnings · {info} info · updates with the loaded project</small>
        </div>
      </div>
      <div className="diagnostics-overview-grid">
        {DIAGNOSTIC_ORDER.map((code) => {
          const items = diagnostics.filter((diagnostic) => diagnostic.code === code);
          if (!items.length) return null;
          const severity = items.some((item) => item.severity === 'error') ? 'error' : items.some((item) => item.severity === 'warning') ? 'warning' : 'info';
          return (
            <button key={code} className={`diagnostic-category-card ${severity}`} onClick={() => openDiagnosticsTab(code)}>
              <span><strong>{diagnosticLabel(code)}</strong><small>{items[0]?.message}</small></span>
              <b>{items.length}</b>
            </button>
          );
        })}
        {!diagnostics.length && <div className="diagnostics-clean"><strong><LucideIcon name="circle-check" size={15} /> No diagnostics</strong><span>The loaded project currently has no indexed diagnostics.</span></div>}
      </div>
      {diagnostics.length > 0 && (
        <div className="diagnostics-overview-note">Choose a category to open the affected nodes as a normal filtered Query tab.</div>
      )}
    </>
  );
}

function DiagnosticsDetail({ tab }: { tab: DiagnosticsQueryTab & { diagnosticCode: DiagnosticCode } }) {
  const project = useWorkbenchStore((state) => state.project)!;
  const filters = useWorkbenchStore((state) => state.filters);
  const changeSet = useWorkbenchStore((state) => state.changeSet);
  const openDiagnosticsTab = useWorkbenchStore((state) => state.openDiagnosticsTab);
  const openSourceTab = useWorkbenchStore((state) => state.openSourceTab);
  const openResourceReferenceTab = useWorkbenchStore((state) => state.openResourceReferenceTab);
  const diagnostics = queryTabDiagnostics(project, tab);
  const visibleCount = useMemo(() => queryTabVisibleMatches(project, tab, changeSet, filters).length, [project, tab, changeSet, filters]);
  const fileOnly = nonNodeDiagnostics(project, tab);

  return (
    <>
      <div className="search-tab-heading diagnostics-tab-heading">
        <div>
          <div className="heading-line"><h2>Diagnostics: {diagnosticLabel(tab.diagnosticCode)}</h2><span className="virtual-tab-badge live-query">live</span></div>
          <small>{diagnostics.length} diagnostic(s) · {visibleCount} affected node(s) shown by normal filters</small>
        </div>
        <button onClick={() => openDiagnosticsTab()}>Diagnostics overview</button>
      </div>
      <div className="diagnostic-message-list">
        {diagnostics.map((diagnostic, index) => {
          const file = diagnostic.fileId ? project.fileMap.get(diagnostic.fileId) : undefined;
          const canOpenSource = Boolean(file && !diagnostic.nodeId);
          const semanticReference = diagnostic.semanticReferenceId
            ? project.semanticReferences.find((reference) => reference.id === diagnostic.semanticReferenceId)
            : undefined;
          const canOpenResourceReference = semanticReference?.target.kind === 'resource' && !!semanticReference.target.resourceKind;
          return (
            <div className={`diagnostic-message ${diagnostic.severity}`} key={`${diagnostic.code}:${index}`}>
              <span className="field-category">{diagnostic.severity}</span>
              <span>{diagnostic.message}</span>
              {canOpenResourceReference && <button className="diagnostic-source-button" onClick={() => openResourceReferenceTab(semanticReference!.target.resourceKind!, semanticReference!.target.name, semanticReference!.target.resourcePath)}><LucideIcon name="link-2" size={12} /> Resource refs</button>}
              {canOpenSource && <button className="diagnostic-source-button" onClick={() => openSourceTab(file!.path)}><LucideIcon name="file-text" size={12} /> Source</button>}
            </div>
          );
        })}
      </div>
      {fileOnly.length > 0 && (
        <div className="search-stale-banner warning"><span>{fileOnly.length} diagnostic(s) cannot be represented as NodeCards (for example file-level parse errors); use the Source action above to inspect the current file contents.</span></div>
      )}
      <QueryNodeResults
        tab={tab}
        matchedFieldLabel="diagnostic"
        matchedNodeLabel="diagnostic"
        emptyTitle="No affected nodes are visible with the normal filters."
        emptyText="The diagnostic category is still active. Enable the relevant semantic/location filters, or inspect the diagnostic messages above for file-level issues."
      />
    </>
  );
}

function DiagnosticsInspectorContent({ tab }: { tab: DiagnosticsQueryTab }) {
  return tab.diagnosticCode
    ? <DiagnosticsDetail tab={tab as DiagnosticsQueryTab & { diagnosticCode: DiagnosticCode }} />
    : <DiagnosticsOverview tab={tab} />;
}

function ChangesInspectorContent({ tab }: { tab: ChangesQueryTab }) {
  const project = useWorkbenchStore((state) => state.project)!;
  const filters = useWorkbenchStore((state) => state.filters);
  const changeSet = useWorkbenchStore((state) => state.changeSet);
  const visibleCount = useMemo(() => queryTabVisibleMatches(project, tab, changeSet, filters).length, [project, tab, changeSet, filters]);
  const changedFiles = new Set(changeSet.changes.map((change) => change.fileId)).size;

  return (
    <>
      <div className="search-tab-heading changes-tab-heading">
        <div>
          <div className="heading-line"><h2>Changes: Pending</h2><span className="virtual-tab-badge live-query">live</span></div>
          <small>{changeSet.changes.length} staged change(s) · {changedFiles} file(s) · {visibleCount} affected node(s) shown by normal filters</small>
        </div>
        <span className="query-tab-help">Review / Apply remains the final validation step.</span>
      </div>
      <QueryNodeResults
        tab={tab}
        matchedFieldLabel="changed"
        emptyTitle={changeSet.changes.length ? 'No changed nodes are visible with the normal filters.' : 'No pending changes.'}
        emptyText={changeSet.changes.length
          ? 'The ChangeSet is live. Enable the semantic/value/location filter matching the staged fields to reveal these nodes.'
          : 'Stage a refactor or field edit and this tab will update automatically.'}
      />
    </>
  );
}

function QueryInspectorContent({ tab }: { tab: QueryWorkbenchTab }) {
  switch (tab.queryKind) {
    case 'search': return <SearchInspectorContent tab={tab} />;
    case 'references': return <ReferencesInspectorContent tab={tab} />;
    case 'resource-references': return <ResourceReferencesInspectorContent tab={tab} />;
    case 'diagnostics': return <DiagnosticsInspectorContent tab={tab} />;
    case 'changes': return <ChangesInspectorContent tab={tab} />;
  }
}

export function InspectorPane({ paneId }: { paneId: WorkbenchPaneId }) {
  const project = useWorkbenchStore((state) => state.project);
  const tabs = useWorkbenchStore((state) => state.tabs);
  const activeTabId = useWorkbenchStore((state) => state.paneActiveTabIds[paneId]);
  const splitViewEnabled = useWorkbenchStore((state) => state.splitViewEnabled);

  if (!project) {
    return <main className="inspector empty-state"><h2>Hytale Generator Workbench</h2><p>Open a folder to build the project model.</p></main>;
  }

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const showFilters = activeTab?.kind === 'file'
    || (activeTab?.kind === 'query' && ['search', 'references', 'changes'].includes(activeTab.queryKind));
  return (
    <WorkbenchPaneProvider paneId={paneId}>
    <main className="inspector" data-pane-id={paneId}>
      <FileTabs paneId={paneId} />
      {showFilters && <div className="inspector-filter-row"><FilterBar /></div>}
      <div className="inspector-workspace">
        <div
          id={workbenchTabPanelDomId(paneId)}
          className={`inspector-content-scroll ${activeTab?.kind === 'project-graph' ? 'project-graph-content' : ''}`}
          role={activeTab ? 'tabpanel' : undefined}
          aria-labelledby={activeTab ? workbenchTabDomId(paneId, activeTab.id) : undefined}
          tabIndex={activeTab ? 0 : undefined}
        >
          {!activeTab && <div className="empty-state inspector-tab-empty"><div><h2>No tab open{splitViewEnabled ? ` in ${paneId === 'primary' ? 'Pane A' : 'Pane B'}` : ''}</h2><p>Activate this pane, then open a file or tool. Existing global editors can be shown here without creating a duplicate document.</p></div></div>}
          {activeTab?.kind === 'file' && (() => {
            const file = project.fileMap.get(activeTab.fileId);
            return file ? <FileInspectorContent file={file} /> : <div className="empty-state inspector-tab-empty">File is no longer available.</div>;
          })()}
          {activeTab?.kind === 'source' && <SourceInspectorContent path={activeTab.path} />}
          {activeTab?.kind === 'query' && <QueryInspectorContent tab={activeTab} />}
          {activeTab?.kind === 'visual' && <VisualLayoutTab />}
          {activeTab?.kind === 'worldgen-performance' && <WorldgenPerformanceTab tab={activeTab} />}
          {activeTab?.kind === 'project-graph' && <ProjectGraphView tab={activeTab} />}
        </div>
        <div className="workbench-drawer-host" data-workbench-drawer-host={paneId} />
      </div>
    </main>
    </WorkbenchPaneProvider>
  );
}
