import { useEffect, useMemo, useState } from 'react';
import { workspaceCssClass, workspaceLabel } from '../core';
import { nodeVisible } from '../features/inspector/visibility';
import { buildFileUiStateIndex, fileUiStateForPath, type FileUiStateIndex } from '../features/fileState';
import {
  probeWorkspaceFolder,
  removeWorkspaceProbeFolder,
  resetWorkspaceProbeFolders,
  selectWorkspaceProbeFolder,
} from '../io/folderLoader';
import { getProjectFileDescriptorIndex } from '../projectFiles/descriptorIndex';
import { buildInventoryTree, type InventoryTreeNode } from '../projectFiles/inventoryTree';
import {
  EXPLORER_SCOPE_INVENTORY_ONLY,
  EXPLORER_SCOPE_RECOGNIZED,
  EXPLORER_SCOPE_RESOURCES,
  EXPLORER_SCOPE_WORKBENCH_KNOWN,
  type ProjectFileDescriptor,
} from '../projectFiles/loadPolicy';
import { useWorkbenchStore, type FileWorkbenchTab, type SourceWorkbenchTab } from '../store';
import { measurePerformanceSync, recordPerformanceDuration } from '../support/performanceTracing';
import { FileStateIndicators } from './FileStateIndicators';
import { LucideIcon } from './LucideIcon';

function metadataRoleLabel(entry: ProjectFileDescriptor): string {
  if (entry.resourceRole === 'environment') return `Environment resource · ${entry.inventoryOnly ? 'inventory-only load state' : 'semantic load'}`;
  if (entry.resourceRole === 'prefab') return `Prefab resource · ${entry.inventoryOnly ? 'inventory-only load state' : 'semantic load'}`;
  if (entry.role === 'workspace-config') return 'workspace config';
  if (entry.role === 'unknown-json') return 'JSON · inventory-only load state';
  if (entry.role === 'other') return entry.extension ? `${entry.extension.slice(1).toUpperCase()} · inventory-only load state` : 'file · inventory-only load state';
  if (entry.role === 'flow-entrypoint') return 'generator flow entrypoint';
  if (entry.role === 'flow-orchestrator') return 'generator flow orchestrator';
  if (entry.role === 'runtime-config') return 'generator runtime config';
  if (entry.role === 'known-json') return 'known semantic data';
  return 'generator graph document';
}

function roleBadges(entry: ProjectFileDescriptor) {
  return (
    <>
      {entry.role === 'flow-entrypoint' && <small className="inventory-role-badge entry">ENTRY</small>}
      {entry.role === 'flow-orchestrator' && <small className="inventory-role-badge support">FLOW</small>}
      {entry.role === 'runtime-config' && <small className="inventory-role-badge">CONFIG</small>}
      {entry.role === 'workspace-config' && <small className="inventory-role-badge">WORKSPACE</small>}
      {entry.resourceRole && <small className={`inventory-role-badge resource ${entry.resourceRole}`}>{entry.resourceRole === 'environment' ? 'ENV' : 'PREFAB'}</small>}
      {entry.resourceRole && entry.resourceReferenceCount > 0 && <small className="resource-ref-count" data-tooltip={`${entry.resourceReferenceCount} semantic consumer reference${entry.resourceReferenceCount === 1 ? '' : 's'}`}>{entry.resourceReferenceCount}</small>}
      {entry.discoverySource === 'manual-probe' && <small className="inventory-role-badge probed">PROBED</small>}
    </>
  );
}

function folderKnowledgeTooltip(node: Extract<InventoryTreeNode, { kind: 'folder' }>, manuallyProbed: boolean): string {
  const summary = node.summary;
  const lines = [
    node.path,
    `${summary.totalFiles} file${summary.totalFiles === 1 ? '' : 's'} · ${summary.semanticFiles} semantic · ${summary.resourceFiles} known resource${summary.resourceFiles === 1 ? '' : 's'}`,
    `${summary.inventoryOnlyFiles} inventory-only load state${summary.inventoryOnlyFiles === 1 ? '' : 's'}`,
  ];
  if (summary.manualProbeFiles) lines.push(`${summary.manualProbeFiles} semantic file${summary.manualProbeFiles === 1 ? '' : 's'} discovered through a manual probe`);
  if (manuallyProbed) lines.push('Included in this project’s semantic discovery profile.');
  else if (!node.workbenchKnown) lines.push('No currently recognized semantic files or known resource files in this path.');
  return lines.join('\n');
}

function pathIsProbed(path: string, roots: string[]): boolean {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
  return roots.some((root) => {
    const candidate = root.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
    return normalized === candidate || normalized.startsWith(`${candidate}/`);
  });
}


export interface ProjectExplorerSelectionMode {
  selectedFileIds: string[];
  eligibleFileIds: string[];
  onSelectionChange: (fileIds: string[]) => void;
  title?: string;
  subtitle?: string;
  /** Human-readable eligibility term, for example "layout-ready". */
  eligibleLabel?: string;
  /** Human-readable operation name used only in selection affordances. */
  purpose?: string;
  sectionLabel?: string;
}

function selectedIdsForNode(node: InventoryTreeNode, eligible: Set<string>, output: Map<string, string[]>): string[] {
  if (node.kind === 'file') {
    const fileId = node.descriptor.semanticFile?.id;
    const ids = fileId && eligible.has(fileId) ? [fileId] : [];
    output.set(node.path, ids);
    return ids;
  }
  const ids = node.children.flatMap((child) => selectedIdsForNode(child, eligible, output));
  output.set(node.path, ids);
  return ids;
}
function TreeNode({
  node,
  selectedFileId,
  onSelect,
  onOpenSource,
  fileStateIndex,
  onProbe,
  discoveryRoots,
  probingPath,
  folderState,
  onFolderOpenChange,
  selectionMode,
  selectionEligibleIdsByPath,
  depth = 0,
}: {
  node: InventoryTreeNode;
  selectedFileId?: string;
  onSelect: (fileId: string) => void;
  onOpenSource: (path: string) => void;
  fileStateIndex: FileUiStateIndex;
  onProbe?: (path: string) => void;
  discoveryRoots: string[];
  probingPath?: string;
  folderState: Record<string, boolean>;
  onFolderOpenChange: (path: string, open: boolean) => void;
  selectionMode?: ProjectExplorerSelectionMode;
  selectionEligibleIdsByPath?: Map<string, string[]>;
  depth?: number;
}) {
  const filters = useWorkbenchStore((state) => state.filters);
  const open = folderState[node.path] ?? false;
  const selectedSet = selectionMode ? new Set(selectionMode.selectedFileIds) : undefined;
  const eligibleLabel = selectionMode?.eligibleLabel ?? 'eligible';
  const selectionPurpose = selectionMode?.purpose ?? 'this selection';

  if (node.kind === 'folder') {
    const manuallyProbed = pathIsProbed(node.path, discoveryRoots);
    const canProbe = !selectionMode && !node.workbenchKnown && Boolean(onProbe);
    const folderClass = node.relevantToGraphFlow ? 'graph-known' : node.workbenchKnown ? 'workbench-known' : 'inventory-dim';
    const eligibleIds = selectionEligibleIdsByPath?.get(node.path) ?? [];
    const selectedCount = selectedSet ? eligibleIds.filter((id) => selectedSet.has(id)).length : 0;
    const allSelected = eligibleIds.length > 0 && selectedCount === eligibleIds.length;
    const partiallySelected = selectedCount > 0 && selectedCount < eligibleIds.length;
    const toggleFolderSelection = () => {
      if (!selectionMode || !eligibleIds.length) return;
      const next = new Set(selectionMode.selectedFileIds);
      if (allSelected) eligibleIds.forEach((id) => next.delete(id));
      else eligibleIds.forEach((id) => next.add(id));
      selectionMode.onSelectionChange([...next]);
    };
    return (
      <div className={`tree-folder ${folderClass} ${selectionMode ? 'selection-mode' : ''}`}>
        <div className="tree-folder-row" style={{ paddingLeft: 8 + depth * 14 }} data-tooltip={`${folderKnowledgeTooltip(node, manuallyProbed)}${selectionMode ? `\n${eligibleIds.length} ${eligibleLabel} file${eligibleIds.length === 1 ? '' : 's'} in this folder.` : ''}`}>
          {selectionMode && (
            <input
              className="tree-selection-checkbox"
              type="checkbox"
              checked={allSelected}
              disabled={!eligibleIds.length}
              ref={(element: HTMLInputElement | null) => { if (element) element.indeterminate = partiallySelected; }}
              onChange={toggleFolderSelection}
              aria-label={`Select ${eligibleLabel} files in ${node.name}`}
            />
          )}
          <button className="tree-folder-main" onClick={() => onFolderOpenChange(node.path, !open)} aria-label={`${open ? 'Collapse' : 'Expand'} ${node.name}`}>
            <span className="tree-chevron"><LucideIcon name={open ? 'chevron-down' : 'chevron-right'} size={13} /></span>
            <span>{node.name}</span>
            {manuallyProbed && <small className="inventory-role-badge probed">PROBED</small>}
            {selectionMode && eligibleIds.length > 0 && <small className="tree-selection-count">{selectedCount}/{eligibleIds.length}</small>}
          </button>
          {canProbe && (
            <button
              className="tree-folder-probe"
              disabled={probingPath === node.path}
              onClick={() => onProbe?.(node.path)}
              data-tooltip={manuallyProbed ? 'Re-scan this folder for recognized generator formats' : 'Probe this folder for recognized generator formats'}
              aria-label={`Probe ${node.name} for recognized generator formats`}
            >
              <LucideIcon name={probingPath === node.path ? 'rotate-ccw' : 'search'} size={12} />
            </button>
          )}
        </div>
        {open && node.children.map((child) => (
          <TreeNode
            key={`${child.kind}:${child.path}`}
            node={child}
            selectedFileId={selectedFileId}
            onSelect={onSelect}
            onOpenSource={onOpenSource}
            fileStateIndex={fileStateIndex}
            onProbe={onProbe}
            discoveryRoots={discoveryRoots}
            probingPath={probingPath}
            folderState={folderState}
            onFolderOpenChange={onFolderOpenChange}
            selectionMode={selectionMode}
            selectionEligibleIdsByPath={selectionEligibleIdsByPath}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }

  const descriptor = node.descriptor;
  const file = descriptor.semanticFile;
  const fileState = fileUiStateForPath(fileStateIndex, descriptor.path);
  if (!file) {
    const resourceUsage = descriptor.resourceRole
      ? `\n${descriptor.resourceReferenceCount} semantic consumer reference${descriptor.resourceReferenceCount === 1 ? '' : 's'}.`
      : '';
    const knowledgeNote = descriptor.resourceRole
      ? 'Known from the resource inventory. Source stays read-only and is not added to the semantic ProjectModel.'
      : 'Open a bounded read-only source preview. This does not add the file to the semantic ProjectModel.';
    if (selectionMode) {
      return (
        <label
          className={`tree-file-row inventory-file selection-mode selection-disabled ${descriptor.resourceRole ? 'resource-file' : 'inventory-dim'}`}
          style={{ paddingLeft: 24 + depth * 14 }}
          data-tooltip={`${descriptor.path}\n${metadataRoleLabel(descriptor)}${resourceUsage}\nNot ${eligibleLabel} for ${selectionPurpose}. ${knowledgeNote}`}
        >
          <input className="tree-selection-checkbox" type="checkbox" checked={false} disabled aria-label={`${descriptor.name} is not ${eligibleLabel} for ${selectionPurpose}`} />
          <span className="tree-file-main">
            <span>{descriptor.name}</span>
            {roleBadges(descriptor)}
          </span>
          <FileStateIndicators state={fileState} />
        </label>
      );
    }
    return (
      <button
        className={`tree-file-row inventory-file ${descriptor.resourceRole ? 'resource-file' : 'inventory-dim'}`}
        style={{ paddingLeft: 24 + depth * 14 }}
        onClick={() => onOpenSource(descriptor.path)}
        data-tooltip={`${descriptor.path}\n${metadataRoleLabel(descriptor)}${resourceUsage}\n${knowledgeNote}`}
        aria-label={`Open read-only source for ${descriptor.name}`}
      >
        <span className="tree-file-main">
          <span>{descriptor.name}</span>
          {roleBadges(descriptor)}
        </span>
        <FileStateIndicators state={fileState} />
      </button>
    );
  }

  const opensAsSource = descriptor.role !== 'graph-document';
  const workspaceAllowed = filters.workspace === 'all' || file.workspace.id === filters.workspace;
  const live = workspaceAllowed ? file.nodes.filter((item) => item.location === 'live' && nodeVisible(item, { ...filters, floating: false, live: true })).length : 0;
  const floating = workspaceAllowed ? file.nodes.filter((item) => item.location === 'floating' && nodeVisible(item, { ...filters, live: false, floating: true })).length : 0;
  const exports = file.nodes.flatMap((item) => item.fields).filter((field) => field.category === 'export').length;
  const imports = file.nodes.flatMap((item) => item.fields).filter((field) => field.category === 'import').length;
  const issues = fileState.diagnosticCount;
  const tooltip = opensAsSource
    ? `${file.path}\n${metadataRoleLabel(descriptor)}${descriptor.semanticInfo?.workspaceId ? ` · ${descriptor.semanticInfo.workspaceId}` : ''}\nOpen as bounded read-only source. Semantic references remain available to Graph and Diagnostics.`
    : `${file.path}\n${metadataRoleLabel(descriptor)}${descriptor.semanticInfo?.workspaceId ? ` · ${descriptor.semanticInfo.workspaceId}` : ''}\n${live} relevant live · ${floating} relevant floating · ${exports} exports · ${imports} imports · ${issues} diagnostics`;

  if (selectionMode) {
    const eligible = selectionMode.eligibleFileIds.includes(file.id);
    const selected = eligible && selectionMode.selectedFileIds.includes(file.id);
    return (
      <label
        className={`tree-file-row semantic-file selection-mode ${!eligible ? 'selection-disabled' : ''} ${descriptor.relevantToGraphFlow ? 'graph-known' : 'semantic-support'}`}
        style={{ paddingLeft: 24 + depth * 14 }}
        data-tooltip={`${tooltip}\n${eligible ? `${eligibleLabel} · toggle this file.` : `Not ${eligibleLabel} for ${selectionPurpose}.`}`}
      >
        <input
          className="tree-selection-checkbox"
          type="checkbox"
          checked={selected}
          disabled={!eligible}
          onChange={() => {
            if (!eligible) return;
            const next = new Set(selectionMode.selectedFileIds);
            if (selected) next.delete(file.id); else next.add(file.id);
            selectionMode.onSelectionChange([...next]);
          }}
          aria-label={`${selected ? 'Deselect' : 'Select'} ${file.name} for ${selectionPurpose}`}
        />
        <span className="tree-file-main">
          <span>{file.name}</span>
          <small className={`workspace-badge ${workspaceCssClass(file.workspace)}`}>{workspaceLabel(file.workspace)}</small>
          {roleBadges(descriptor)}
        </span>
        <FileStateIndicators state={fileState} />
      </label>
    );
  }

  return (
    <button
      className={`tree-file-row semantic-file ${!opensAsSource && selectedFileId === file.id ? 'active' : ''} ${descriptor.relevantToGraphFlow ? 'graph-known' : 'semantic-support'}`}
      style={{ paddingLeft: 24 + depth * 14 }}
      onClick={() => opensAsSource ? onOpenSource(file.path) : onSelect(file.id)}
      data-tooltip={tooltip}
    >
      <span className="tree-file-main">
        <span>{file.name}</span>
        <small className={`workspace-badge ${workspaceCssClass(file.workspace)}`}>{workspaceLabel(file.workspace)}</small>
        {roleBadges(descriptor)}
      </span>
      <FileStateIndicators state={fileState} />
    </button>
  );
}

function visibleTreeRowCount(nodes: InventoryTreeNode[], folderState: Record<string, boolean>): number {
  let count = 0;
  const visit = (node: InventoryTreeNode) => {
    count += 1;
    if (node.kind === 'folder' && (folderState[node.path] ?? false)) node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return count;
}

function explorerScopeKind(scope: string): string {
  if (scope === 'all') return 'all';
  if ([EXPLORER_SCOPE_WORKBENCH_KNOWN, EXPLORER_SCOPE_RECOGNIZED, EXPLORER_SCOPE_RESOURCES, EXPLORER_SCOPE_INVENTORY_ONLY].includes(scope)) return 'builtin';
  return 'workspace';
}

export function ProjectExplorer({ selectionMode }: { selectionMode?: ProjectExplorerSelectionMode } = {}) {
  const renderStarted = performance.now();
  const project = useWorkbenchStore((state) => state.project);
  const workspace = useWorkbenchStore((state) => state.workspace);
  const explorerWorkspace = useWorkbenchStore((state) => state.explorerWorkspace);
  const explorerFolderState = useWorkbenchStore((state) => state.explorerFolderState);
  const setExplorerWorkspace = useWorkbenchStore((state) => state.setExplorerWorkspace);
  const setExplorerFolderOpen = useWorkbenchStore((state) => state.setExplorerFolderOpen);
  const selectedFileId = useWorkbenchStore((state) => state.selectedFileId);
  const selectFile = useWorkbenchStore((state) => state.selectFile);
  const openSourceTab = useWorkbenchStore((state) => state.openSourceTab);
  const changeSet = useWorkbenchStore((state) => state.changeSet);
  const externalChangeNotice = useWorkbenchStore((state) => state.externalChangeNotice);
  const activePane = useWorkbenchStore((state) => state.activePane);
  const splitViewEnabled = useWorkbenchStore((state) => state.splitViewEnabled);
  const paneTabIds = useWorkbenchStore((state) => state.paneTabIds);
  const activeTabId = useWorkbenchStore((state) => state.paneActiveTabIds[state.activePane]);
  const tabs = useWorkbenchStore((state) => state.tabs);
  const selectTab = useWorkbenchStore((state) => state.selectTab);
  const closeTab = useWorkbenchStore((state) => state.closeTab);
  const recentlyClosedFileIds = useWorkbenchStore((state) => state.recentlyClosedFileIds);
  const reopenClosedFile = useWorkbenchStore((state) => state.reopenClosedFile);
  const applyExternalWorkspaceReload = useWorkbenchStore((state) => state.applyExternalWorkspaceReload);
  const [probingPath, setProbingPath] = useState<string>();
  const [probeNotice, setProbeNotice] = useState<string>();
  const [probeError, setProbeError] = useState<string>();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileBusy, setProfileBusy] = useState<string>();
  const [selectionWorkspace, setSelectionWorkspace] = useState<string | 'all'>(explorerWorkspace);
  const [selectionFolderState, setSelectionFolderState] = useState<Record<string, boolean>>(() => ({ ...explorerFolderState }));
  const effectiveExplorerWorkspace = selectionMode ? selectionWorkspace : explorerWorkspace;
  const effectiveFolderState = selectionMode ? selectionFolderState : explorerFolderState;
  const selectionEligibleLabel = selectionMode?.eligibleLabel ?? 'eligible';
  const setEffectiveExplorerWorkspace = (value: string) => selectionMode ? setSelectionWorkspace(value) : setExplorerWorkspace(value);
  const setEffectiveFolderOpen = (path: string, open: boolean) => selectionMode
    ? setSelectionFolderState((state) => ({ ...state, [path]: open }))
    : setExplorerFolderOpen(path, open);

  const descriptorIndex = useMemo(() => project && workspace
    ? getProjectFileDescriptorIndex(project, workspace)
    : undefined, [project, workspace]);
  const descriptors = descriptorIndex?.descriptors ?? [];
  const tree = useMemo(() => measurePerformanceSync('explorer.tree.build', () => buildInventoryTree(descriptors, effectiveExplorerWorkspace), {
    data: { descriptorCount: descriptors.length, scopeKind: explorerScopeKind(effectiveExplorerWorkspace), selectionMode: Boolean(selectionMode) },
  }), [descriptors, effectiveExplorerWorkspace]);
  const fileStateIndex = useMemo(() => project
    ? buildFileUiStateIndex(project, changeSet, externalChangeNotice)
    : { byPath: new Map(), externalPaths: [], conflictPaths: [] },
    [project, changeSet, externalChangeNotice]);
  const activePaneTabIds = paneTabIds[activePane];
  const otherPane = activePane === 'primary' ? 'secondary' : 'primary';
  const otherPaneTabIds = paneTabIds[otherPane];
  const activePaneLabel = activePane === 'primary' ? 'Pane A' : 'Pane B';
  const otherPaneLabel = otherPane === 'primary' ? 'Pane A' : 'Pane B';
  const openEditorTabs = activePaneTabIds
    .map((tabId) => tabs.find((tab) => tab.id === tabId))
    .filter((tab): tab is FileWorkbenchTab | SourceWorkbenchTab => tab?.kind === 'file' || tab?.kind === 'source');
  const semanticCount = descriptorIndex?.summary.semantic ?? 0;
  const resourceCount = descriptorIndex?.summary.resources ?? 0;
  const workbenchKnownCount = descriptorIndex?.summary.workbenchKnown ?? 0;
  const inventoryOnlyCount = descriptorIndex?.summary.inventoryOnly ?? 0;
  const manuallyProbedCount = descriptorIndex?.summary.manuallyProbed ?? 0;
  const selectionEligibleSet = useMemo(() => new Set(selectionMode?.eligibleFileIds ?? []), [selectionMode?.eligibleFileIds]);
  const selectionEligibleIdsByPath = useMemo(() => measurePerformanceSync('explorer.tree.selection-index', () => {
    const output = new Map<string, string[]>();
    if (!selectionMode) return output;
    tree.forEach((node) => selectedIdsForNode(node, selectionEligibleSet, output));
    return output;
  }, { data: { rootCount: tree.length, eligibleFiles: selectionEligibleSet.size, selectionMode: Boolean(selectionMode) } }), [tree, selectionMode, selectionEligibleSet]);
  const scopeEligibleIds = selectionMode ? tree.flatMap((node) => selectionEligibleIdsByPath.get(node.path) ?? []) : [];
  const selectedEligibleCount = selectionMode ? selectionMode.selectedFileIds.filter((id) => selectionEligibleSet.has(id)).length : 0;
  const selectCurrentScope = (selected: boolean) => {
    if (!selectionMode) return;
    const next = new Set(selectionMode.selectedFileIds);
    scopeEligibleIds.forEach((id) => selected ? next.add(id) : next.delete(id));
    selectionMode.onSelectionChange([...next]);
  };

  const visibleRows = visibleTreeRowCount(tree, effectiveFolderState);
  useEffect(() => {
    recordPerformanceDuration('explorer.render.commit', performance.now() - renderStarted, {
      data: {
        descriptorCount: descriptors.length,
        rootCount: tree.length,
        visibleRows,
        expandedFolders: Object.values(effectiveFolderState).filter(Boolean).length,
        selectionMode: Boolean(selectionMode),
        scopeKind: explorerScopeKind(effectiveExplorerWorkspace),
      },
    });
  });

  const probeFolder = async (path: string) => {
    if (!workspace?.desktopBridge) return;
    setProbingPath(path);
    setProbeNotice(undefined);
    setProbeError(undefined);
    try {
      const result = await probeWorkspaceFolder(workspace, path);
      applyExternalWorkspaceReload(result.workspace, []);
      const discovered = result.detected.filter((item) => item.discoverySource === 'manual-probe');
      const roleSummary = [...new Set(discovered.map((item) => item.role))].join(', ');
      setProbeNotice(discovered.length
        ? `${result.probedRoot}: ${discovered.length} recognized file${discovered.length === 1 ? '' : 's'}${roleSummary ? ` · ${roleSummary}` : ''}`
        : `${result.probedRoot}: no additional recognized generator files found.`);
    } catch (error) {
      setProbeError(error instanceof Error ? error.message : String(error));
    } finally {
      setProbingPath(undefined);
    }
  };

  const addProbeFolder = async () => {
    if (!workspace?.desktopBridge) return;
    setProfileBusy('add');
    setProbeError(undefined);
    try {
      const result = await selectWorkspaceProbeFolder(workspace);
      applyExternalWorkspaceReload(result.workspace, []);
      setProbeNotice(`${result.probedRoot}: discovery folder added · ${result.detected.length} recognized file${result.detected.length === 1 ? '' : 's'} currently detected.`);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setProbeError(error instanceof Error ? error.message : String(error));
    } finally {
      setProfileBusy(undefined);
    }
  };

  const removeProbeFolder = async (path: string) => {
    if (!workspace?.desktopBridge || changeSet.changes.length) return;
    setProfileBusy(path);
    setProbeError(undefined);
    try {
      const next = await removeWorkspaceProbeFolder(workspace, path);
      applyExternalWorkspaceReload(next, []);
      setProbeNotice(`${path}: removed from the semantic discovery profile.`);
    } catch (error) {
      setProbeError(error instanceof Error ? error.message : String(error));
    } finally {
      setProfileBusy(undefined);
    }
  };

  const resetProbeFolders = async () => {
    if (!workspace?.desktopBridge || changeSet.changes.length) return;
    setProfileBusy('reset');
    setProbeError(undefined);
    try {
      const next = await resetWorkspaceProbeFolders(workspace);
      applyExternalWorkspaceReload(next, []);
      setProbeNotice('Semantic discovery profile reset to Workbench defaults.');
    } catch (error) {
      setProbeError(error instanceof Error ? error.message : String(error));
    } finally {
      setProfileBusy(undefined);
    }
  };

  if (!project || !workspace) return <aside className="explorer empty">Open a project folder to begin.</aside>;

  return (
    <aside className={`explorer ${selectionMode ? 'explorer-selection-mode' : ''}`}>
      <div className="explorer-header">
        <div className="panel-title explorer-title">
          <span>{selectionMode?.title ?? 'Explorer'}</span>
          {!selectionMode && <button className={`explorer-profile-button ${profileOpen ? 'active' : ''}`} onClick={() => setProfileOpen((value) => !value)} data-tooltip="Semantic discovery profile" aria-label="Semantic discovery profile"><LucideIcon name="settings" size={13} /></button>}
        </div>
        {selectionMode?.subtitle && <div className="explorer-selection-subtitle">{selectionMode.subtitle}</div>}
        <label className="explorer-workspace compact">
          <span>Scope</span>
          <select value={effectiveExplorerWorkspace} onChange={(event) => setEffectiveExplorerWorkspace(event.target.value)}>
            <option value="all">All project files</option>
            <option value={EXPLORER_SCOPE_WORKBENCH_KNOWN}>Workbench known</option>
            <option value={EXPLORER_SCOPE_RECOGNIZED}>Recognized files · semantic</option>
            <option value={EXPLORER_SCOPE_RESOURCES}>Known resources</option>
            <option value={EXPLORER_SCOPE_INVENTORY_ONLY}>Inventory only · load state</option>
            {project.workspaces.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        {selectionMode ? (
          <div className="explorer-selection-summary">
            <span><strong>{selectedEligibleCount}</strong> selected · {selectionMode.eligibleFileIds.length} {selectionEligibleLabel}</span>
            <div>
              <button disabled={!scopeEligibleIds.length} onClick={() => selectCurrentScope(true)}>Select scope</button>
              <button disabled={!scopeEligibleIds.some((id) => selectionMode.selectedFileIds.includes(id))} onClick={() => selectCurrentScope(false)}>Clear scope</button>
            </div>
          </div>
        ) : effectiveExplorerWorkspace === 'all' && (
          <div
            className="explorer-inventory-summary"
            data-tooltip={`${descriptors.length} total inventory entries\n${semanticCount} semantic files\n${resourceCount} known Environment/Prefab resource files\n${inventoryOnlyCount} inventory-only load state${manuallyProbedCount ? `\n${manuallyProbedCount} semantic files from manual discovery probes` : ''}`}
          >
            {semanticCount} semantic · {resourceCount} resources · {workbenchKnownCount} Workbench known · {descriptors.length} total
          </div>
        )}
        {!selectionMode && profileOpen && (
          <div className="explorer-profile-panel">
            <div className="explorer-profile-heading"><strong>Semantic discovery</strong><small>Known detectors only</small></div>
            <div className="explorer-profile-default"><span>Workbench defaults</span><small>Generator candidates + known instance descriptors</small></div>
            <div className="explorer-profile-roots">
              {(workspace.discoveryRoots ?? []).map((root) => (
                <div className="explorer-profile-root" key={root}>
                  <span data-tooltip={root}>{root}</span>
                  <button disabled={Boolean(profileBusy) || probingPath === root} onClick={() => void probeFolder(root)} data-tooltip="Re-scan with current detectors"><LucideIcon name="rotate-ccw" size={12} /></button>
                  <button disabled={Boolean(profileBusy) || changeSet.changes.length > 0} onClick={() => void removeProbeFolder(root)} data-tooltip={changeSet.changes.length ? 'Apply or discard staged changes before removing a discovery root' : 'Remove custom discovery root'}><LucideIcon name="x" size={12} /></button>
                </div>
              ))}
              {!(workspace.discoveryRoots ?? []).length && <div className="explorer-profile-empty">No custom discovery folders.</div>}
            </div>
            <div className="explorer-profile-actions">
              <button disabled={!workspace.desktopBridge || Boolean(profileBusy)} onClick={() => void addProbeFolder()}><LucideIcon name="search" size={12} /> Add folder</button>
              <button disabled={!workspace.desktopBridge || Boolean(profileBusy) || !(workspace.discoveryRoots ?? []).length || changeSet.changes.length > 0} onClick={() => void resetProbeFolders()}>Reset defaults</button>
            </div>
            {changeSet.changes.length > 0 && <small className="explorer-profile-safety">Removing discovery roots is locked while staged changes exist.</small>}
          </div>
        )}
        {!selectionMode && probeNotice && <div className="explorer-discovery-notice" role="status">{probeNotice}</div>}
        {!selectionMode && probeError && <div className="explorer-discovery-notice error" role="alert">{probeError}</div>}
      </div>

      {!selectionMode && (
        <section className="open-editors" aria-label={`Open editors${splitViewEnabled ? ` · ${activePaneLabel}` : ''}`}>
          <div className="explorer-section-label open-editors-label">
            <span>Open editors{splitViewEnabled && <small className="open-editors-pane-label">{activePaneLabel}</small>}</span>
            <button
              className="reopen-editor-button"
              disabled={!recentlyClosedFileIds.length}
              onClick={reopenClosedFile}
              data-tooltip={`Reopen closed editor${splitViewEnabled ? ` in ${activePaneLabel}` : ''} (Ctrl+Shift+T)`}
              aria-label={`Reopen closed editor${splitViewEnabled ? ` in ${activePaneLabel}` : ''}`}
            ><LucideIcon name="rotate-ccw" size={14} /></button>
          </div>
          {openEditorTabs.length ? openEditorTabs.map((tab) => {
            const file = tab.kind === 'file' ? project.fileMap.get(tab.fileId) : undefined;
            const path = file?.path ?? (tab.kind === 'source' ? tab.path : '');
            const name = file?.name ?? path.replace(/\\/g, '/').split('/').filter(Boolean).at(-1) ?? path;
            if (!path) return null;
            const fileState = fileUiStateForPath(fileStateIndex, path);
            const sharedWithOtherPane = splitViewEnabled && otherPaneTabIds.includes(tab.id);
            return (
              <div key={tab.id} className={`open-editor-row ${activeTabId === tab.id ? 'active' : ''}`}>
                <button className="open-editor-main" onClick={() => selectTab(tab.id, activePane)} data-tooltip={`${path}${sharedWithOtherPane ? `\nAlso open in ${otherPaneLabel}` : ''}`}>
                  <span className="open-editor-dot"><LucideIcon name={tab.kind === 'source' ? 'file-text' : activeTabId === tab.id ? 'circle-dot' : 'circle'} size={tab.kind === 'source' ? 11 : 9} /></span>
                  <span>{name}</span>
                  {sharedWithOtherPane && <small className="open-editor-shared" data-tooltip={`Same global editor is also referenced by ${otherPaneLabel}`}>{otherPaneLabel}</small>}
                  <FileStateIndicators state={fileState} compact />
                </button>
                <button className="open-editor-close" onClick={() => closeTab(tab.id, activePane)} data-tooltip={`Close ${name} in ${activePaneLabel}`} aria-label={`Close ${name} in ${activePaneLabel}`}><LucideIcon name="x" size={13} /></button>
              </div>
            );
          }) : <div className="open-editors-empty">No open editors{splitViewEnabled ? ` in ${activePaneLabel}` : ''}.</div>}
        </section>
      )}

      <div className="explorer-section-label files-label">{selectionMode ? (selectionMode.sectionLabel ?? 'Project · select files') : 'Project'}</div>
      <div className="project-tree">
        {tree.length ? tree.map((node) => (
          <TreeNode
            key={`${node.kind}:${node.path}`}
            node={node}
            selectedFileId={selectedFileId}
            onSelect={selectFile}
            onOpenSource={openSourceTab}
            fileStateIndex={fileStateIndex}
            onProbe={!selectionMode && workspace.desktopBridge ? probeFolder : undefined}
            discoveryRoots={workspace.discoveryRoots ?? []}
            probingPath={probingPath}
            folderState={effectiveFolderState}
            onFolderOpenChange={setEffectiveFolderOpen}
            selectionMode={selectionMode}
            selectionEligibleIdsByPath={selectionEligibleIdsByPath}
          />
        )) : <div className="tree-empty">No files in this explorer workspace.</div>}
      </div>
    </aside>
  );
}

