import { create } from 'zustand';
import {
  jsonPathKey,
  applyChangeSet,
  buildProject,
  emptyChangeSet,
  removeChange as removeChangeFromSet,
  removeRule as removeRuleFromSet,
  searchProjectNodes,
  symbolKey,
  type ChangeSet,
  type DiagnosticCode,
  type NodeLocation,
  type ProjectModel,
  type SearchSnapshot,
  type SemanticReference,
  type SymbolRecord,
} from './core';
import type { LoadedWorkspace } from './io/folderLoader';
import {
  EXPLORER_SCOPE_INVENTORY_ONLY,
  EXPLORER_SCOPE_RECOGNIZED,
  EXPLORER_SCOPE_RESOURCES,
  EXPLORER_SCOPE_WORKBENCH_KNOWN,
} from './projectFiles/loadPolicy';
import {
  persistDetailedLogging,
  readDetailedLogging,
  recordRuntimeEvent,
  setProjectSupportSnapshot,
  type ProjectSupportSnapshot,
} from './support/runtimeDiagnostics';
import { measurePerformanceSync } from './support/performanceTracing';
import {
  readProjectSession,
  rememberRecentProject,
  writeProjectSession,
  type PersistedNavigationLocation,
} from './projects/projectPersistence';

export interface InspectorFilters {
  imports: boolean;
  exports: boolean;
  seeds: boolean;
  /** Generic property field names selected through the adaptive Values filter. */
  valueFields: string[];
  /** When true, generic property fields are unrestricted; valueFields is ignored. */
  allValues: boolean;
  live: boolean;
  floating: boolean;
  hideEmpty: boolean;
  /** Optional node/view workspace filter. Explorer workspace scope is stored separately. */
  workspace: string | 'all';
}

export interface NavigationLocation {
  fileId?: string;
  nodeId?: string;
  location?: NodeLocation;
  /** Transient navigation target for a concrete Project Graph instance. Not persisted across app restarts. */
  graphTabId?: string;
}

export interface VirtualNodeMatch {
  fileId: string;
  nodeId: string;
  location: NodeLocation;
  matchedFieldPaths: string[];
  matchedNodeMetadata?: boolean;
}

export interface FileWorkbenchTab {
  id: string;
  kind: 'file';
  fileId: string;
}

export interface SourceWorkbenchTab {
  id: string;
  kind: 'source';
  path: string;
}

export interface SearchQueryTab {
  id: string;
  kind: 'query';
  queryKind: 'search';
  refreshPolicy: 'snapshot';
  query: string;
  snapshot: SearchSnapshot;
  projectVersion: number;
  changeVersion: number;
}

export interface ReferenceQueryTab {
  id: string;
  kind: 'query';
  queryKind: 'references';
  refreshPolicy: 'snapshot';
  symbolType: string;
  symbolName: string;
  matches: VirtualNodeMatch[];
  definitionCount: number;
  referenceCount: number;
  projectVersion: number;
  changeVersion: number;
}

export interface ResourceReferenceQueryTab {
  id: string;
  kind: 'query';
  queryKind: 'resource-references';
  refreshPolicy: 'snapshot';
  resourceKind: 'environment' | 'prefab';
  resourceName: string;
  resourcePath?: string;
  references: SemanticReference[];
  projectVersion: number;
  changeVersion: number;
}

export interface DiagnosticsQueryTab {
  id: string;
  kind: 'query';
  queryKind: 'diagnostics';
  refreshPolicy: 'live';
  diagnosticCode?: DiagnosticCode;
}

export interface ChangesQueryTab {
  id: string;
  kind: 'query';
  queryKind: 'changes';
  refreshPolicy: 'live';
}

export interface VisualWorkbenchTab {
  id: string;
  kind: 'visual';
}

export interface WorldgenPerformanceWorkbenchTab {
  id: string;
  kind: 'worldgen-performance';
  selection?: {
    token: string;
    name: string;
    sourceKind: 'file' | 'folder';
  };
}

export interface ProjectGraphWorkbenchTab {
  id: string;
  kind: 'project-graph';
  /** Canonical toolbar graph stays a singleton; explicit secondary instances carry their own state. */
  canonical: boolean;
  settings: ProjectGraphViewSettings;
  fitRequest: number;
}

/** Persistent global sidebar preference. Tool sidebars are derived from the active tab. */
export type SidebarView = 'explorer' | 'search';
export type ToolSidebarView = 'project-graph' | 'visual-layout';

export type LayoutStrategyId = 'normalize' | 'author-normalize' | 'dag-rebuild';
export type LayoutSpacingPreset = 'compact' | 'normal' | 'spacious' | 'custom';
export type FloaterLayoutMode = 'ignore' | 'pack' | 'quarantine';
export type DagBranchDirection = 'auto' | 'up' | 'down' | 'type';

export interface VisualLayoutSettings {
  strategy: LayoutStrategyId;
  spacingPreset: LayoutSpacingPreset;
  horizontalGap: number;
  verticalGap: number;
  alignmentTolerance: number;
  dagBranchDirection: DagBranchDirection;
  includeLive: boolean;
  includeFloating: boolean;
  respectAuthorSections: boolean;
  floaterMode: FloaterLayoutMode;
}

export interface ProjectGraphViewportState {
  panX: number;
  panY: number;
  zoom: number;
}

export interface ProjectGraphViewSettings {
  /** Stable project-relative path; file ids can change when the project is rescanned. */
  selectedRootPath?: string;
  densityDepth: number;
  includeResources: boolean;
  /** Camera-only state. It never changes semantic graph data or layout coordinates. */
  viewport?: ProjectGraphViewportState;
}

export type QueryWorkbenchTab = SearchQueryTab | ReferenceQueryTab | ResourceReferenceQueryTab | DiagnosticsQueryTab | ChangesQueryTab;
export type WorkbenchTab = FileWorkbenchTab | SourceWorkbenchTab | QueryWorkbenchTab | VisualWorkbenchTab | WorldgenPerformanceWorkbenchTab | ProjectGraphWorkbenchTab;

export type WorkbenchPaneId = 'primary' | 'secondary';
export interface WorkbenchPaneActiveTabs {
  primary?: string;
  secondary?: string;
}

export interface WorkbenchPaneTabs {
  primary: string[];
  secondary: string[];
}

export interface ExternalChangeNotice {
  paths: string[];
  invalidatedChanges: number;
  invalidatedHistory: boolean;
  invalidatedChangePaths: string[];
  timestamp: number;
}

interface WorkbenchState {
  workspace?: LoadedWorkspace;
  project?: ProjectModel;
  projectVersion: number;
  changeVersion: number;
  editing: boolean;
  developerMode: boolean;
  detailedLogging: boolean;
  sidebarView: SidebarView;
  /** Transient global-sidebar override while a tool tab owns the contextual sidebar. */
  toolSidebarOverride?: SidebarView;
  sidebarVisible: boolean;
  searchSidebarQuery: string;
  recentSearches: string[];
  filters: InspectorFilters;
  explorerWorkspace: string | 'all';
  explorerFolderState: Record<string, boolean>;
  selectedFileId?: string;
  tabs: WorkbenchTab[];
  /** Active tab alias for the currently focused workview pane. Kept for legacy consumers. */
  activeTabId?: string;
  activePane: WorkbenchPaneId;
  paneActiveTabIds: WorkbenchPaneActiveTabs;
  /** Pane-local tab references into the single global tabs pool. A tab object is never duplicated. */
  paneTabIds: WorkbenchPaneTabs;
  splitViewEnabled: boolean;
  searchSerial: number;
  focusedNode?: { fileId: string; nodeId: string; location: NodeLocation; token: number };
  navigationCurrent?: NavigationLocation;
  navigationPast: NavigationLocation[];
  navigationFuture: NavigationLocation[];
  recentlyClosedFileIds: string[];
  visualSelectedFileIds: string[];
  visualSettings: VisualLayoutSettings;
  /** Legacy/persistence alias for the canonical graph instance only. */
  projectGraphSettings: ProjectGraphViewSettings;
  projectGraphFitRequest: number;
  projectGraphSerial: number;
  visualLayoutGenerateRequest: number;
  visualLayoutFilePickerRequest: number;
  changeSet: ChangeSet;
  changePast: ChangeSet[];
  changeFuture: ChangeSet[];
  externalChangeNotice?: ExternalChangeNotice;
  setWorkspace: (workspace: LoadedWorkspace, traceId?: string) => void;
  closeProject: () => void;
  setEditing: (editing: boolean) => void;
  setDeveloperMode: (enabled: boolean) => void;
  setDetailedLogging: (enabled: boolean) => void;
  activateSidebar: (view: SidebarView) => void;
  setSearchSidebarQuery: (query: string) => void;
  recordRecentSearch: (query: string) => void;
  setFilters: (filters: Partial<InspectorFilters>) => void;
  setExplorerWorkspace: (workspace: string | 'all') => void;
  setExplorerFolderOpen: (path: string, open: boolean) => void;
  resetFilters: () => void;
  setValueFields: (fields: string[]) => void;
  toggleValueField: (field: string) => void;
  selectFile: (fileId: string) => void;
  openSourceTab: (path: string) => void;
  focusNode: (fileId: string, nodeId: string, location: NodeLocation) => void;
  openSearchTab: (query: string) => void;
  openReferenceTab: (symbolType: string, symbolName: string) => void;
  openResourceReferenceTab: (resourceKind: 'environment' | 'prefab', resourceName: string, resourcePath?: string) => void;
  openDiagnosticsTab: (diagnosticCode?: DiagnosticCode) => void;
  openChangesTab: () => void;
  openVisualTab: () => void;
  openWorldgenPerformanceTab: () => void;
  setWorldgenPerformanceLogSelection: (selection?: WorldgenPerformanceWorkbenchTab['selection']) => void;
  openProjectGraphTab: () => void;
  openProjectGraphAsNew: (rootPath?: string) => void;
  setVisualSelectedFileIds: (fileIds: string[]) => void;
  toggleVisualFile: (fileId: string) => void;
  setVisualSettings: (settings: Partial<VisualLayoutSettings>) => void;
  setProjectGraphSettings: (settings: Partial<ProjectGraphViewSettings>, tabId?: string) => void;
  requestProjectGraphFit: (tabId?: string) => void;
  requestVisualLayoutGenerate: () => void;
  requestVisualLayoutFilePicker: () => void;
  setActivePane: (paneId: WorkbenchPaneId) => void;
  setSplitViewEnabled: (enabled: boolean, collapseFromPane?: WorkbenchPaneId) => void;
  refreshQueryTab: (tabId: string) => void;
  selectTab: (tabId: string, paneId?: WorkbenchPaneId) => void;
  closeTab: (tabId: string, paneId?: WorkbenchPaneId) => void;
  closeOtherTabs: (tabId: string, paneId?: WorkbenchPaneId) => void;
  closeTabsToRight: (tabId: string, paneId?: WorkbenchPaneId) => void;
  closeAllTabs: (paneId?: WorkbenchPaneId) => void;
  revealFileInExplorer: (fileId: string) => void;
  revealPathInExplorer: (path: string) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  reopenClosedFile: () => void;
  setChangeSet: (changeSet: ChangeSet) => void;
  removeChange: (changeId: string) => void;
  removeChangesForFile: (fileId: string) => void;
  removeRule: (ruleId: string) => void;
  undoChanges: () => void;
  redoChanges: () => void;
  commitProject: (project: ProjectModel) => void;
  commitWorkspace: (workspace: LoadedWorkspace) => void;
  applyExternalWorkspaceReload: (workspace: LoadedWorkspace, changedPaths: string[]) => void;
  clearExternalChangeNotice: () => void;
  resetChanges: () => void;
}


export const defaultVisualSettings: VisualLayoutSettings = {
  strategy: 'author-normalize',
  spacingPreset: 'compact',
  horizontalGap: 10,
  verticalGap: 10,
  alignmentTolerance: 100,
  dagBranchDirection: 'auto',
  includeLive: true,
  includeFloating: false,
  respectAuthorSections: true,
  floaterMode: 'ignore',
};

export const defaultProjectGraphSettings: ProjectGraphViewSettings = {
  selectedRootPath: undefined,
  densityDepth: 8,
  includeResources: false,
  viewport: undefined,
};

export const defaultFilters: InspectorFilters = {
  imports: true,
  exports: true,
  seeds: false,
  valueFields: [],
  allValues: false,
  live: true,
  floating: false,
  hideEmpty: true,
  workspace: 'all',
};

/** No restriction across the user-facing normal filter dimensions. Empty-value policy is intentionally unchanged. */
export const allInspectorFilters: InspectorFilters = {
  ...defaultFilters,
  imports: true,
  exports: true,
  seeds: true,
  valueFields: [],
  allValues: true,
  live: true,
  floating: true,
  workspace: 'all',
};

export function filtersAreAll(filters: InspectorFilters): boolean {
  return filters.imports
    && filters.exports
    && filters.seeds
    && filters.allValues
    && filters.live
    && filters.floating
    && filters.workspace === 'all';
}

function fileTabId(fileId: string) {
  return `tab:file:${fileId}`;
}

function sourceTabId(path: string) {
  return `tab:source:${encodeURIComponent(path.replace(/\\/g, '/'))}`;
}

function diagnosticsTabId(code?: DiagnosticCode) {
  return `tab:diagnostics:${code ?? 'overview'}`;
}

function referenceTabId(symbolType: string, symbolName: string) {
  return `tab:references:${encodeURIComponent(symbolType)}:${encodeURIComponent(symbolName)}`;
}

function resourceReferenceTabId(resourceKind: 'environment' | 'prefab', resourceName: string, resourcePath?: string) {
  const identity = resourcePath || resourceName;
  return `tab:resource-references:${resourceKind}:${encodeURIComponent(identity.replace(/\\/g, '/'))}`;
}

function selectedFileForTab(tab: WorkbenchTab | undefined): string | undefined {
  return tab?.kind === 'file' ? tab.fileId : undefined;
}

function effectivePane(state: Pick<WorkbenchState, 'activePane' | 'splitViewEnabled'>, requested?: WorkbenchPaneId): WorkbenchPaneId {
  const pane = requested ?? state.activePane;
  return pane === 'secondary' && !state.splitViewEnabled ? 'primary' : pane;
}

function activateTabInPane(state: WorkbenchState, tabId: string | undefined, requestedPane?: WorkbenchPaneId) {
  const pane = effectivePane(state, requestedPane);
  const paneActiveTabIds = { ...state.paneActiveTabIds, [pane]: tabId };
  const current = state.paneTabIds[pane];
  const nextPaneIds = tabId && !current.includes(tabId) ? [...current, tabId] : current;
  const paneTabIds = nextPaneIds === current ? state.paneTabIds : { ...state.paneTabIds, [pane]: nextPaneIds };
  return { activePane: pane, paneActiveTabIds, paneTabIds, activeTabId: tabId };
}

function referencedTabIds(paneTabIds: WorkbenchPaneTabs): Set<string> {
  return new Set([...paneTabIds.primary, ...paneTabIds.secondary]);
}

function pruneUnreferencedTabs(tabs: WorkbenchTab[], paneTabIds: WorkbenchPaneTabs): WorkbenchTab[] {
  const refs = referencedTabIds(paneTabIds);
  return tabs.filter((tab) => refs.has(tab.id));
}

function removeIdsFromPaneTabs(paneTabIds: WorkbenchPaneTabs, ids: Set<string>): WorkbenchPaneTabs {
  if (!ids.size) return paneTabIds;
  return {
    primary: paneTabIds.primary.filter((id) => !ids.has(id)),
    secondary: paneTabIds.secondary.filter((id) => !ids.has(id)),
  };
}

function activeTabState(state: WorkbenchState, tabs: WorkbenchTab[], paneTabIds: WorkbenchPaneTabs, paneActiveTabIds: WorkbenchPaneActiveTabs) {
  const activePane = effectivePane(state);
  const activeTabId = paneActiveTabIds[activePane];
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  return {
    activeTabId,
    selectedFileId: selectedFileForTab(activeTab),
    focusedNode: activeTab?.kind === 'file' && state.focusedNode?.fileId === activeTab.fileId ? state.focusedNode : undefined,
    ...sidebarStateForTab(activeTab),
  };
}

function toolSidebarForTab(tab: WorkbenchTab | undefined): ToolSidebarView | undefined {
  if (tab?.kind === 'project-graph') return 'project-graph';
  if (tab?.kind === 'visual') return 'visual-layout';
  return undefined;
}

function activeToolSidebar(state: Pick<WorkbenchState, 'tabs' | 'activeTabId'>): ToolSidebarView | undefined {
  return toolSidebarForTab(state.tabs.find((tab) => tab.id === state.activeTabId));
}

function sidebarStateForTab(tab: WorkbenchTab | undefined) {
  return toolSidebarForTab(tab)
    ? { toolSidebarOverride: undefined, sidebarVisible: true }
    : { toolSidebarOverride: undefined };
}

function navigationEqual(left: NavigationLocation | undefined, right: NavigationLocation | undefined): boolean {
  if (!left || !right) return left === right;
  return left.fileId === right.fileId && left.nodeId === right.nodeId && left.location === right.location && left.graphTabId === right.graphTabId;
}

function navigationHistoryForTarget(state: WorkbenchState, target: NavigationLocation) {
  if (!state.navigationCurrent || navigationEqual(state.navigationCurrent, target)) {
    return { navigationCurrent: target };
  }
  return {
    navigationCurrent: target,
    navigationPast: [...state.navigationPast, state.navigationCurrent].slice(-100),
    navigationFuture: [],
  };
}

function persistedToNavigation(project: ProjectModel, location: PersistedNavigationLocation | undefined): NavigationLocation | undefined {
  if (!location) return undefined;
  const file = project.files.find((item) => item.path === location.filePath);
  if (!file) return undefined;
  if (location.nodeId) {
    const node = file.nodes.find((item) => item.id === location.nodeId && (!location.location || item.location === location.location));
    if (!node) return { fileId: file.id };
    return { fileId: file.id, nodeId: node.id, location: node.location };
  }
  return { fileId: file.id };
}

function navigationToPersisted(project: ProjectModel, location: NavigationLocation | undefined): PersistedNavigationLocation | undefined {
  if (!location) return undefined;
  if (!location.fileId) return undefined;
  const file = project.fileMap.get(location.fileId);
  if (!file) return undefined;
  return { filePath: file.path, nodeId: location.nodeId, location: location.location };
}

function validProjectWorkspaceId(project: ProjectModel, value: string | 'all' | undefined): string | 'all' {
  if (!value || value === 'all') return 'all';
  return project.workspaces.some((workspace) => workspace.id === value) ? value : 'all';
}

function validExplorerWorkspaceId(project: ProjectModel, value: string | 'all' | undefined): string | 'all' {
  if (value === EXPLORER_SCOPE_WORKBENCH_KNOWN
    || value === EXPLORER_SCOPE_RECOGNIZED
    || value === EXPLORER_SCOPE_RESOURCES
    || value === EXPLORER_SCOPE_INVENTORY_ONLY) return value;
  return validProjectWorkspaceId(project, value);
}

function normalizedProjectPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLocaleLowerCase();
}

function fileUsesNodeInspector(workspace: LoadedWorkspace | undefined, file: ProjectModel['files'][number]): boolean {
  const slashPath = file.path.replace(/\\/g, '/');
  const directInfo = workspace?.semanticInfo?.get(slashPath);
  const info = directInfo ?? [...(workspace?.semanticInfo?.entries() ?? [])]
    .find(([path]) => normalizedProjectPath(path) === normalizedProjectPath(file.path))?.[1];
  if (info) return info.role === 'graph-document';
  // Browser/fallback mode has no native detector metadata. Keep actual node documents
  // working while support/config workspaces remain source-only.
  if (file.workspace.id === 'worldstructure' || file.workspace.id === 'settings') return false;
  return file.nodes.length > 0;
}

function fileNavigationTab(workspace: LoadedWorkspace | undefined, file: ProjectModel['files'][number]): FileWorkbenchTab | SourceWorkbenchTab {
  return fileUsesNodeInspector(workspace, file)
    ? { id: fileTabId(file.id), kind: 'file', fileId: file.id }
    : { id: sourceTabId(file.path), kind: 'source', path: file.path };
}

function pathAffected(filePath: string, changedPaths: Set<string>): boolean {
  const file = normalizedProjectPath(filePath);
  for (const changed of changedPaths) {
    if (file === changed || file.startsWith(`${changed}/`) || changed.startsWith(`${file}/`)) return true;
  }
  return false;
}

function changeSetTouchesPaths(changeSet: ChangeSet, changedPaths: Set<string>): boolean {
  return changeSet.changes.some((change) => pathAffected(change.filePath, changedPaths));
}

function remapChangeSet(changeSet: ChangeSet, project: ProjectModel): ChangeSet | undefined {
  const byPath = new Map(project.files.map((file) => [normalizedProjectPath(file.path), file]));
  const changes: ChangeSet['changes'] = [];
  for (const change of changeSet.changes) {
    const file = byPath.get(normalizedProjectPath(change.filePath));
    if (!file) return undefined;
    changes.push({ ...change, fileId: file.id, filePath: file.path });
  }
  return { ...changeSet, changes };
}

function pushChangeSet(state: WorkbenchState, changeSet: ChangeSet) {
  if (changeSet === state.changeSet) return {};
  return {
    changeSet,
    changePast: [...state.changePast, state.changeSet].slice(-100),
    changeFuture: [],
    changeVersion: state.changeVersion + 1,
  };
}

function recordMatches(record: SymbolRecord): VirtualNodeMatch[] {
  const merged = new Map<string, VirtualNodeMatch>();
  for (const occurrence of [...record.definitions, ...record.references]) {
    const key = `${occurrence.fileId}|${occurrence.location}|${occurrence.nodeId}`;
    const existing = merged.get(key) ?? {
      fileId: occurrence.fileId,
      nodeId: occurrence.nodeId,
      location: occurrence.location,
      matchedFieldPaths: [],
    };
    const path = jsonPathKey(occurrence.jsonPath);
    if (!existing.matchedFieldPaths.includes(path)) existing.matchedFieldPaths.push(path);
    merged.set(key, existing);
  }
  return [...merged.values()];
}

function referenceSnapshot(project: ProjectModel, changeSet: ChangeSet, symbolType: string, symbolName: string) {
  return measurePerformanceSync('references.symbol-query', () => {
    // Reference snapshots should reflect staged changes when explicitly opened/refreshed,
    // while remaining stable until the user refreshes again.
    const effectiveProject = changeSet.changes.length ? applyChangeSet(project, changeSet).project : project;
    const record = effectiveProject.symbolIndex.get(symbolKey(symbolType, symbolName));
    return {
      matches: record ? recordMatches(record) : [],
      definitionCount: record?.definitions.length ?? 0,
      referenceCount: record?.references.length ?? 0,
    };
  }, { aggregateOnly: true, data: { symbolType, stagedChanges: changeSet.changes.length } });
}

function normalizedResourceIdentity(value: string | undefined): string {
  return (value ?? '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
}

function resourceReferenceSnapshot(
  project: ProjectModel,
  changeSet: ChangeSet,
  resourceKind: 'environment' | 'prefab',
  resourceName: string,
  resourcePath?: string,
) {
  return measurePerformanceSync('references.resource-query', () => {
    const effectiveProject = changeSet.changes.length ? applyChangeSet(project, changeSet).project : project;
    const normalizedPath = normalizedResourceIdentity(resourcePath);
    const normalizedName = resourceName.trim().toLowerCase();
    const references = effectiveProject.semanticReferences.filter((reference) => {
      if (reference.target.kind !== 'resource' || reference.target.resourceKind !== resourceKind) return false;
      if (normalizedPath) {
        const paths = [reference.target.resourcePath, reference.target.filePath, ...reference.candidates.map((candidate) => candidate.resourcePath ?? candidate.filePath)]
          .map(normalizedResourceIdentity);
        if (paths.includes(normalizedPath)) return true;
      }
      return reference.target.name.trim().toLowerCase() === normalizedName;
    });
    const resolvedPath = resourcePath
      ?? references.find((reference) => reference.target.resourcePath)?.target.resourcePath
      ?? references.flatMap((reference) => reference.candidates).find((candidate) => candidate.resourcePath)?.resourcePath;
    return { references, resourcePath: resolvedPath };
  }, { aggregateOnly: true, data: { resourceKind, stagedChanges: changeSet.changes.length, semanticReferences: project.semanticReferences.length } });
}



function buildSupportSnapshot(workspace: LoadedWorkspace, project: ProjectModel): ProjectSupportSnapshot {
  const diagnostics = { errors: 0, warnings: 0, info: 0 };
  for (const diagnostic of project.diagnostics) {
    if (diagnostic.severity === 'error') diagnostics.errors += 1;
    else if (diagnostic.severity === 'warning') diagnostics.warnings += 1;
    else diagnostics.info += 1;
  }
  return {
    host: workspace.desktopBridge ? 'desktop' : 'browser',
    sourceKind: workspace.sourceKind,
    writable: workspace.writable,
    inventoryFiles: workspace.sourceEntries.size,
    semanticInputs: workspace.files.length,
    projectFiles: project.files.length,
    nodes: project.files.reduce((count, file) => count + file.nodes.length, 0),
    symbols: project.symbolIndex.size,
    semanticReferences: project.semanticReferences.length,
    environmentReferences: project.semanticReferences.filter((reference) => reference.relation === 'biome-environment').length,
    prefabReferences: project.semanticReferences.filter((reference) => reference.relation === 'assignment-prefab').length,
    projectDiagnostics: diagnostics,
    workspaces: project.workspaces.length,
    discoveryRoots: workspace.discoveryRoots?.length ?? 0,
  };
}

function tracedSearchProjectNodes(project: ProjectModel, query: string, changeSet: ChangeSet, limit?: number): SearchSnapshot {
  return measurePerformanceSync('search.query', () => searchProjectNodes(project, query, changeSet, limit), {
    aggregateOnly: true,
    data: { queryLength: query.trim().length, projectFiles: project.files.length, nodeCount: project.files.reduce((sum, file) => sum + file.nodes.length, 0), limit: limit ?? 5000 },
  });
}

function timedProjectBuild(workspace: LoadedWorkspace, event: string, traceId?: string): ProjectModel {
  const start = performance.now();
  const project = buildProject(workspace.files, workspace.sourceEntries.keys(), {
    phase: (phase, durationMs, data) => recordRuntimeEvent(`project.model.${phase}`, {
      traceId,
      durationMs,
      data,
    }),
  });
  const durationMs = performance.now() - start;
  setProjectSupportSnapshot(buildSupportSnapshot(workspace, project));
  recordRuntimeEvent(event, {
    traceId,
    durationMs,
    data: {
      inventoryFiles: workspace.sourceEntries.size,
      semanticInputs: workspace.files.length,
      projectFiles: project.files.length,
      projectDiagnostics: project.diagnostics.length,
      semanticReferences: project.semanticReferences.length,
    },
  });
  return project;
}

function readDeveloperMode(): boolean {
  try {
    return window.localStorage.getItem('hytale-workbench.developer-mode') === '1';
  } catch {
    return false;
  }
}

function persistDeveloperMode(enabled: boolean) {
  try {
    window.localStorage.setItem('hytale-workbench.developer-mode', enabled ? '1' : '0');
  } catch {
    // Storage may be disabled; the in-memory setting still works for this session.
  }
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  projectVersion: 0,
  changeVersion: 0,
  editing: false,
  developerMode: readDeveloperMode(),
  detailedLogging: readDetailedLogging(),
  sidebarView: 'explorer',
  toolSidebarOverride: undefined,
  sidebarVisible: true,
  searchSidebarQuery: '',
  recentSearches: [],
  filters: defaultFilters,
  explorerWorkspace: 'all',
  explorerFolderState: {},
  tabs: [],
  activePane: 'primary',
  paneActiveTabIds: { primary: undefined, secondary: undefined },
  paneTabIds: { primary: [], secondary: [] },
  splitViewEnabled: false,
  searchSerial: 0,
  navigationCurrent: undefined,
  navigationPast: [],
  navigationFuture: [],
  recentlyClosedFileIds: [],
  visualSelectedFileIds: [],
  visualSettings: defaultVisualSettings,
  projectGraphSettings: defaultProjectGraphSettings,
  projectGraphFitRequest: 0,
  projectGraphSerial: 0,
  visualLayoutGenerateRequest: 0,
  visualLayoutFilePickerRequest: 0,
  changeSet: emptyChangeSet(),
  changePast: [],
  changeFuture: [],
  setWorkspace: (workspace, traceId) => {
    const project = timedProjectBuild(workspace, 'project.model.build', traceId);
    const stateRestoreStarted = performance.now();
    if (workspace.projectRoot) rememberRecentProject(workspace.projectRoot, workspace.label);
    const session = workspace.projectRoot ? readProjectSession(workspace.projectRoot) : undefined;
    const fileByPath = new Map(project.files.map((file) => [file.path, file]));

    const restoredFileCandidates = (session?.openFilePaths ?? [])
      .map((path) => fileByPath.get(path))
      .filter((file): file is ProjectModel['files'][number] => !!file);
    const openFiles = restoredFileCandidates.filter((file) => fileUsesNodeInspector(workspace, file));
    const legacySourcePaths = restoredFileCandidates
      .filter((file) => !fileUsesNodeInspector(workspace, file))
      .map((file) => file.path);
    const hasRestoredFileTabs = openFiles.length > 0;
    const requestedActiveFile = (session?.activeFilePath ? fileByPath.get(session.activeFilePath) : undefined)
      ?? (session?.navigationCurrent?.filePath ? fileByPath.get(session.navigationCurrent.filePath) : undefined);
    const activeFile = requestedActiveFile && fileUsesNodeInspector(workspace, requestedActiveFile)
      ? requestedActiveFile
      : (hasRestoredFileTabs ? openFiles[0] : undefined);
    if (activeFile && !openFiles.some((file) => file.id === activeFile.id)) openFiles.push(activeFile);
    const fileTabs: FileWorkbenchTab[] = [...new Map(openFiles.map((file) => [file.id, file])).values()]
      .map((file) => ({ id: fileTabId(file.id), kind: 'file', fileId: file.id }));
    const sourcePaths = [...new Set([
      ...(session?.openSourcePaths ?? []).filter((path) => workspace.sourceEntries.has(path)),
      ...legacySourcePaths,
    ])];
    const migratedActiveSourcePath = requestedActiveFile && !fileUsesNodeInspector(workspace, requestedActiveFile)
      ? requestedActiveFile.path
      : undefined;
    const activeSourcePath = session?.activeSourcePath && workspace.sourceEntries.has(session.activeSourcePath)
      ? session.activeSourcePath
      : migratedActiveSourcePath;
    if (activeSourcePath && !sourcePaths.includes(activeSourcePath)) sourcePaths.push(activeSourcePath);
    const sourceTabs: SourceWorkbenchTab[] = sourcePaths.map((path) => ({ id: sourceTabId(path), kind: 'source', path }));
    const defaultDiagnosticsTab: DiagnosticsQueryTab = {
      id: diagnosticsTabId(),
      kind: 'query',
      queryKind: 'diagnostics',
      refreshPolicy: 'live',
    };
    const restoredTabs: WorkbenchTab[] = [...fileTabs, ...sourceTabs];
    const tabs: WorkbenchTab[] = restoredTabs.length ? restoredTabs : [defaultDiagnosticsTab];
    const focusedLocation = hasRestoredFileTabs ? persistedToNavigation(project, session?.focusedNode) : undefined;
    const focusedNode = focusedLocation?.fileId && focusedLocation.nodeId && focusedLocation.location
      ? { fileId: focusedLocation.fileId, nodeId: focusedLocation.nodeId, location: focusedLocation.location, token: Date.now() }
      : undefined;
    const navigationCurrent = persistedToNavigation(project, session?.navigationCurrent)
      ?? (focusedLocation?.nodeId ? focusedLocation : activeFile ? { fileId: activeFile.id } : undefined);
    const navigationPast = (session?.navigationPast ?? []).map((item) => persistedToNavigation(project, item)).filter((item): item is NavigationLocation => !!item);
    const navigationFuture = (session?.navigationFuture ?? []).map((item) => persistedToNavigation(project, item)).filter((item): item is NavigationLocation => !!item);
    const recentlyClosedFileIds = (session?.recentlyClosedFilePaths ?? [])
      .map((path) => fileByPath.get(path)?.id)
      .filter((id): id is string => !!id && !fileTabs.some((tab) => tab.fileId === id));
    const visualSelectedFileIds = (session?.visualSelectedFilePaths ?? [])
      .map((path) => fileByPath.get(path)?.id)
      .filter((id): id is string => !!id);
    const explorerWorkspace = validExplorerWorkspaceId(project, session?.explorerWorkspace);
    const restoredFilters = session?.filters
      ? { ...defaultFilters, ...session.filters, workspace: validProjectWorkspaceId(project, session.filters.workspace) }
      : { ...defaultFilters, workspace: 'all' as const };
    const restoredActiveTabId = activeSourcePath ? sourceTabId(activeSourcePath) : activeFile ? fileTabId(activeFile.id) : tabs[0]?.id ?? defaultDiagnosticsTab.id;

    set((state) => ({
      workspace,
      project,
      projectVersion: state.projectVersion + 1,
      changeVersion: 0,
      editing: false,
      selectedFileId: activeFile?.id,
      tabs,
      activeTabId: restoredActiveTabId,
      activePane: 'primary',
      paneActiveTabIds: { primary: restoredActiveTabId, secondary: undefined },
      paneTabIds: { primary: tabs.map((tab) => tab.id), secondary: [] },
      splitViewEnabled: false,
      searchSerial: 0,
      focusedNode,
      navigationCurrent,
      navigationPast,
      navigationFuture,
      recentlyClosedFileIds,
      visualSelectedFileIds,
      visualSettings: session?.visualSettings ? { ...defaultVisualSettings, ...session.visualSettings } : defaultVisualSettings,
      projectGraphSettings: session?.projectGraphSettings ? { ...defaultProjectGraphSettings, ...session.projectGraphSettings } : { ...defaultProjectGraphSettings },
      projectGraphFitRequest: 0,
      projectGraphSerial: 0,
      visualLayoutGenerateRequest: 0,
      visualLayoutFilePickerRequest: 0,
      changeSet: emptyChangeSet(),
      changePast: [],
      changeFuture: [],
      filters: restoredFilters,
      explorerWorkspace,
      explorerFolderState: session?.explorerFolderState ?? {},
      sidebarView: session?.sidebarView === 'search' ? 'search' : 'explorer',
      toolSidebarOverride: undefined,
      sidebarVisible: session?.sidebarVisible !== false,
      searchSidebarQuery: session?.searchSidebarQuery ?? '',
      recentSearches: session?.recentSearches ?? [],
    }));
    recordRuntimeEvent('project.workspace-state.restore', {
      traceId,
      durationMs: performance.now() - stateRestoreStarted,
      data: { restoredTabs: tabs.length, restoredNavigationEntries: navigationPast.length + navigationFuture.length + Number(!!navigationCurrent) },
    });
  },
  closeProject: () => set((state) => {
    setProjectSupportSnapshot(undefined);
    recordRuntimeEvent('project.close');
    return {
      workspace: undefined,
      project: undefined,
      projectVersion: state.projectVersion + 1,
      changeVersion: 0,
      editing: false,
      sidebarView: 'explorer',
      toolSidebarOverride: undefined,
      sidebarVisible: true,
      searchSidebarQuery: '',
      recentSearches: [],
      filters: { ...defaultFilters },
      explorerWorkspace: 'all',
      explorerFolderState: {},
      selectedFileId: undefined,
      tabs: [],
      activeTabId: undefined,
      activePane: 'primary',
      paneActiveTabIds: { primary: undefined, secondary: undefined },
      paneTabIds: { primary: [], secondary: [] },
      splitViewEnabled: false,
      searchSerial: 0,
      focusedNode: undefined,
      navigationCurrent: undefined,
      navigationPast: [],
      navigationFuture: [],
      recentlyClosedFileIds: [],
      visualSelectedFileIds: [],
      visualSettings: { ...defaultVisualSettings },
      projectGraphSettings: { ...defaultProjectGraphSettings },
      projectGraphFitRequest: 0,
      projectGraphSerial: 0,
      visualLayoutGenerateRequest: 0,
      visualLayoutFilePickerRequest: 0,
      changeSet: emptyChangeSet(),
      changePast: [],
      changeFuture: [],
      externalChangeNotice: undefined,
    };
  }),
  setEditing: (editing) => set({ editing }),
  setDeveloperMode: (developerMode) => {
    persistDeveloperMode(developerMode);
    set({ developerMode });
  },
  setDetailedLogging: (detailedLogging) => {
    persistDetailedLogging(detailedLogging);
    recordRuntimeEvent('support.detailed-logging.changed', { data: { enabled: detailedLogging } });
    set({ detailedLogging });
  },
  activateSidebar: (view) => set((state) => {
    const toolSidebar = activeToolSidebar(state);
    const effectiveView = toolSidebar && !state.toolSidebarOverride ? toolSidebar : (state.toolSidebarOverride ?? state.sidebarView);
    const shouldHide = state.sidebarVisible && effectiveView === view;
    return toolSidebar
      ? {
          // Explorer/Search are a transient override while a tool tab owns the sidebar.
          // Keep the persisted global preference untouched so it is restored on exit.
          toolSidebarOverride: view,
          sidebarVisible: shouldHide ? false : true,
        }
      : {
          sidebarView: view,
          toolSidebarOverride: undefined,
          sidebarVisible: shouldHide ? false : true,
        };
  }),
  setSearchSidebarQuery: (searchSidebarQuery) => set({ searchSidebarQuery }),
  recordRecentSearch: (query) => set((state) => {
    const normalized = query.trim();
    if (!normalized) return {};
    return { recentSearches: [normalized, ...state.recentSearches.filter((item) => item !== normalized)].slice(0, 12) };
  }),
  setFilters: (filters) => set((state) => {
    const next = { ...state.filters, ...filters };
    if (filters.allValues === true) next.valueFields = [];
    return { filters: next };
  }),
  setExplorerWorkspace: (explorerWorkspace) => set({ explorerWorkspace }),
  setExplorerFolderOpen: (path, open) => set((state) => ({
    explorerFolderState: { ...state.explorerFolderState, [path]: open },
  })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
  setValueFields: (fields) => set((state) => ({
    filters: { ...state.filters, allValues: false, valueFields: [...new Set(fields)].sort() },
  })),
  toggleValueField: (field) => set((state) => ({
    filters: {
      ...state.filters,
      allValues: false,
      valueFields: state.filters.allValues
        ? [field]
        : state.filters.valueFields.includes(field)
          ? state.filters.valueFields.filter((item) => item !== field)
          : [...state.filters.valueFields, field].sort(),
    },
  })),
  selectFile: (fileId) => set((state) => {
    const file = state.project?.fileMap.get(fileId);
    if (!file) return {};
    const tab = fileNavigationTab(state.workspace, file);
    const exists = state.tabs.some((item) => item.id === tab.id);
    const staleFileTabId = fileTabId(fileId);
    const tabsWithoutStaleFile = tab.kind === 'source'
      ? state.tabs.filter((item) => item.id !== staleFileTabId)
      : state.tabs;
    const target: NavigationLocation = { fileId };
    const paneBase = tab.kind === 'source' ? removeIdsFromPaneTabs(state.paneTabIds, new Set([staleFileTabId])) : state.paneTabIds;
    const stateForActivation = paneBase === state.paneTabIds ? state : ({ ...state, paneTabIds: paneBase } as WorkbenchState);
    return {
      selectedFileId: tab.kind === 'file' ? fileId : undefined,
      ...activateTabInPane(stateForActivation, tab.id),
      tabs: exists ? tabsWithoutStaleFile : [...tabsWithoutStaleFile, tab],
      focusedNode: undefined,
      recentlyClosedFileIds: state.recentlyClosedFileIds.filter((item) => item !== fileId),
      toolSidebarOverride: undefined,
      ...navigationHistoryForTarget(state, target),
    };
  }),
  openSourceTab: (path) => set((state) => {
    if (!state.workspace?.sourceEntries.has(path)) return {};
    const id = sourceTabId(path);
    const exists = state.tabs.some((tab) => tab.id === id);
    return {
      tabs: exists ? state.tabs : [...state.tabs, { id, kind: 'source', path }],
      ...activateTabInPane(state, id),
      selectedFileId: undefined,
      focusedNode: undefined,
      toolSidebarOverride: undefined,
    };
  }),
  focusNode: (fileId, nodeId, location) => set((state) => {
    if (!state.project?.fileMap.has(fileId)) return {};
    const id = fileTabId(fileId);
    const exists = state.tabs.some((tab) => tab.id === id);
    const target: NavigationLocation = { fileId, nodeId, location };
    return {
      selectedFileId: fileId,
      ...activateTabInPane(state, id),
      tabs: exists ? state.tabs : [...state.tabs, { id, kind: 'file', fileId }],
      focusedNode: { fileId, nodeId, location, token: Date.now() },
      recentlyClosedFileIds: state.recentlyClosedFileIds.filter((item) => item !== fileId),
      filters: {
        ...state.filters,
        live: location === 'live' ? true : state.filters.live,
        floating: location === 'floating' ? true : state.filters.floating,
      },
      toolSidebarOverride: undefined,
      ...navigationHistoryForTarget(state, target),
    };
  }),
  openSearchTab: (query) => set((state) => {
    const trimmed = query.trim();
    if (!state.project || !trimmed) return {};
    const existing = state.tabs.find((tab): tab is SearchQueryTab =>
      tab.kind === 'query' && tab.queryKind === 'search' && tab.query.trim().toLowerCase() === trimmed.toLowerCase());
    const snapshot = tracedSearchProjectNodes(state.project, trimmed, state.changeSet);
    if (existing) {
      return {
        tabs: state.tabs.map((tab) => tab.id === existing.id
          ? { ...existing, query: trimmed, snapshot, projectVersion: state.projectVersion, changeVersion: state.changeVersion }
          : tab),
        ...activateTabInPane(state, existing.id),
        selectedFileId: undefined,
        toolSidebarOverride: undefined,
      };
    }
    const serial = state.searchSerial + 1;
    const id = `tab:search:${serial}`;
    return {
      searchSerial: serial,
      tabs: [...state.tabs, {
        id,
        kind: 'query',
        queryKind: 'search',
        refreshPolicy: 'snapshot',
        query: trimmed,
        snapshot,
        projectVersion: state.projectVersion,
        changeVersion: state.changeVersion,
      }],
      ...activateTabInPane(state, id),
      selectedFileId: undefined,
      toolSidebarOverride: undefined,
    };
  }),
  openReferenceTab: (symbolType, symbolName) => set((state) => {
    if (!state.project) return {};
    const id = referenceTabId(symbolType, symbolName);
    const snapshot = referenceSnapshot(state.project, state.changeSet, symbolType, symbolName);
    const nextTab: ReferenceQueryTab = {
      id,
      kind: 'query',
      queryKind: 'references',
      refreshPolicy: 'snapshot',
      symbolType,
      symbolName,
      ...snapshot,
      projectVersion: state.projectVersion,
      changeVersion: state.changeVersion,
    };
    const exists = state.tabs.some((tab) => tab.id === id);
    return {
      tabs: exists ? state.tabs.map((tab) => tab.id === id ? nextTab : tab) : [...state.tabs, nextTab],
      ...activateTabInPane(state, id),
      selectedFileId: undefined,
      toolSidebarOverride: undefined,
    };
  }),
  openResourceReferenceTab: (resourceKind, resourceName, resourcePath) => set((state) => {
    if (!state.project) return {};
    const snapshot = resourceReferenceSnapshot(state.project, state.changeSet, resourceKind, resourceName, resourcePath);
    const id = resourceReferenceTabId(resourceKind, resourceName, snapshot.resourcePath ?? resourcePath);
    const nextTab: ResourceReferenceQueryTab = {
      id,
      kind: 'query',
      queryKind: 'resource-references',
      refreshPolicy: 'snapshot',
      resourceKind,
      resourceName,
      resourcePath: snapshot.resourcePath ?? resourcePath,
      references: snapshot.references,
      projectVersion: state.projectVersion,
      changeVersion: state.changeVersion,
    };
    const exists = state.tabs.some((tab) => tab.id === id);
    return {
      tabs: exists ? state.tabs.map((tab) => tab.id === id ? nextTab : tab) : [...state.tabs, nextTab],
      ...activateTabInPane(state, id),
      selectedFileId: undefined,
      toolSidebarOverride: undefined,
    };
  }),
  openDiagnosticsTab: (diagnosticCode) => set((state) => {
    if (!state.project) return {};
    const id = diagnosticsTabId(diagnosticCode);
    const nextTab: DiagnosticsQueryTab = {
      id,
      kind: 'query',
      queryKind: 'diagnostics',
      refreshPolicy: 'live',
      diagnosticCode,
    };
    const exists = state.tabs.some((tab) => tab.id === id);
    return {
      tabs: exists ? state.tabs : [...state.tabs, nextTab],
      ...activateTabInPane(state, id),
      selectedFileId: undefined,
      toolSidebarOverride: undefined,
    };
  }),
  openChangesTab: () => set((state) => {
    if (!state.project) return {};
    const id = 'tab:changes:pending';
    const nextTab: ChangesQueryTab = { id, kind: 'query', queryKind: 'changes', refreshPolicy: 'live' };
    const exists = state.tabs.some((tab) => tab.id === id);
    return {
      tabs: exists ? state.tabs : [...state.tabs, nextTab],
      ...activateTabInPane(state, id),
      selectedFileId: undefined,
      toolSidebarOverride: undefined,
    };
  }),
  openVisualTab: () => set((state) => {
    if (!state.project) return {};
    const id = 'tab:visual';
    const exists = state.tabs.some((tab) => tab.id === id);
    const currentFile = state.selectedFileId ? state.project.fileMap.get(state.selectedFileId) : undefined;
    const current = currentFile && currentFile.nodes.length > 0 ? currentFile.id : undefined;
    return {
      tabs: exists ? state.tabs : [...state.tabs, { id, kind: 'visual' }],
      ...activateTabInPane(state, id),
      selectedFileId: undefined,
      visualSelectedFileIds: state.visualSelectedFileIds.length || !current
        ? state.visualSelectedFileIds
        : [current],
      toolSidebarOverride: undefined,
      sidebarVisible: true,
    };
  }),
  openWorldgenPerformanceTab: () => set((state) => {
    if (!state.project) return {};
    const id = 'tab:worldgen-performance';
    const exists = state.tabs.some((tab) => tab.id === id);
    return {
      tabs: exists ? state.tabs : [...state.tabs, { id, kind: 'worldgen-performance' }],
      ...activateTabInPane(state, id),
      selectedFileId: undefined,
      toolSidebarOverride: undefined,
    };
  }),
  setWorldgenPerformanceLogSelection: (selection) => set((state) => ({
    tabs: state.tabs.map((tab) => tab.kind === 'worldgen-performance'
      ? { ...tab, selection }
      : tab),
  })),
  openProjectGraphTab: () => set((state) => {
    if (!state.project) return {};
    const id = 'tab:project-graph';
    const exists = state.tabs.some((tab) => tab.id === id);
    const nextTab: ProjectGraphWorkbenchTab = {
      id,
      kind: 'project-graph',
      canonical: true,
      settings: { ...state.projectGraphSettings },
      fitRequest: state.projectGraphFitRequest,
    };
    return {
      tabs: exists ? state.tabs : [...state.tabs, nextTab],
      ...activateTabInPane(state, id),
      selectedFileId: undefined,
      focusedNode: undefined,
      toolSidebarOverride: undefined,
      sidebarVisible: true,
      ...navigationHistoryForTarget(state, { graphTabId: id }),
    };
  }),
  openProjectGraphAsNew: (rootPath) => set((state) => {
    if (!state.project) return {};
    const active = state.tabs.find((tab): tab is ProjectGraphWorkbenchTab => tab.id === state.activeTabId && tab.kind === 'project-graph');
    const serial = state.projectGraphSerial + 1;
    const id = `tab:project-graph:${serial}`;
    const settings = { ...(active?.settings ?? state.projectGraphSettings), selectedRootPath: rootPath ?? active?.settings.selectedRootPath, viewport: undefined };
    const nextTab: ProjectGraphWorkbenchTab = { id, kind: 'project-graph', canonical: false, settings, fitRequest: 0 };
    return {
      projectGraphSerial: serial,
      tabs: [...state.tabs, nextTab],
      ...activateTabInPane(state, id),
      selectedFileId: undefined,
      focusedNode: undefined,
      toolSidebarOverride: undefined,
      sidebarVisible: true,
      ...navigationHistoryForTarget(state, { graphTabId: id }),
    };
  }),
  setVisualSelectedFileIds: (fileIds) => set((state) => ({
    visualSelectedFileIds: state.project
      ? [...new Set(fileIds)].filter((fileId) => state.project!.fileMap.has(fileId))
      : [],
  })),
  toggleVisualFile: (fileId) => set((state) => ({
    visualSelectedFileIds: state.visualSelectedFileIds.includes(fileId)
      ? state.visualSelectedFileIds.filter((item) => item !== fileId)
      : [...state.visualSelectedFileIds, fileId],
  })),
  setVisualSettings: (settings) => set((state) => ({
    visualSettings: { ...state.visualSettings, ...settings },
  })),
  setProjectGraphSettings: (settings, requestedTabId) => set((state) => {
    const tabId = requestedTabId ?? (state.tabs.find((tab) => tab.id === state.activeTabId && tab.kind === 'project-graph')?.id);
    if (!tabId) return { projectGraphSettings: { ...state.projectGraphSettings, ...settings } };
    let canonicalSettings = state.projectGraphSettings;
    const tabs = state.tabs.map((tab) => {
      if (tab.id !== tabId || tab.kind !== 'project-graph') return tab;
      const next = { ...tab, settings: { ...tab.settings, ...settings } };
      if (tab.canonical) canonicalSettings = next.settings;
      return next;
    });
    return { tabs, projectGraphSettings: canonicalSettings };
  }),
  requestProjectGraphFit: (requestedTabId) => set((state) => {
    const tabId = requestedTabId ?? (state.tabs.find((tab) => tab.id === state.activeTabId && tab.kind === 'project-graph')?.id);
    if (!tabId) return { projectGraphFitRequest: state.projectGraphFitRequest + 1 };
    let projectGraphFitRequest = state.projectGraphFitRequest;
    const tabs = state.tabs.map((tab) => {
      if (tab.id !== tabId || tab.kind !== 'project-graph') return tab;
      const next = { ...tab, fitRequest: tab.fitRequest + 1 };
      if (tab.canonical) projectGraphFitRequest = next.fitRequest;
      return next;
    });
    return { tabs, projectGraphFitRequest };
  }),
  requestVisualLayoutGenerate: () => set((state) => ({ visualLayoutGenerateRequest: state.visualLayoutGenerateRequest + 1 })),
  requestVisualLayoutFilePicker: () => set((state) => ({ visualLayoutFilePickerRequest: state.visualLayoutFilePickerRequest + 1 })),
  setActivePane: (paneId) => set((state) => {
    const pane = effectivePane(state, paneId);
    if (pane === state.activePane) return {};
    const activeTabId = state.paneActiveTabIds[pane];
    const activeTab = state.tabs.find((tab) => tab.id === activeTabId);
    const keepFocused = activeTab?.kind === 'file' && state.focusedNode?.fileId === activeTab.fileId;
    return {
      activePane: pane,
      activeTabId,
      selectedFileId: selectedFileForTab(activeTab),
      focusedNode: keepFocused ? state.focusedNode : undefined,
      ...sidebarStateForTab(activeTab),
    };
  }),
  setSplitViewEnabled: (enabled, collapseFromPane) => set((state) => {
    if (enabled === state.splitViewEnabled) return {};
    if (enabled) {
      const sourceIds = state.paneTabIds.primary.length ? state.paneTabIds.primary : state.tabs.map((tab) => tab.id);
      const currentId = state.paneActiveTabIds.primary ?? state.activeTabId ?? sourceIds.at(-1);
      const primaryIds = sourceIds.filter((id) => id !== currentId);
      const secondaryIds = currentId ? [currentId] : [];
      const primaryActive = primaryIds.at(-1);
      const secondaryActive = currentId;
      const secondaryTab = state.tabs.find((tab) => tab.id === secondaryActive);
      return {
        splitViewEnabled: true,
        activePane: 'secondary',
        paneTabIds: { primary: primaryIds, secondary: secondaryIds },
        paneActiveTabIds: { primary: primaryActive, secondary: secondaryActive },
        activeTabId: secondaryActive,
        selectedFileId: selectedFileForTab(secondaryTab),
        focusedNode: secondaryTab?.kind === 'file' && state.focusedNode?.fileId === secondaryTab.fileId ? state.focusedNode : undefined,
        ...sidebarStateForTab(secondaryTab),
      };
    }
    const collapsePane = collapseFromPane ?? state.activePane;
    const collapsedId = state.paneActiveTabIds[collapsePane] ?? state.paneActiveTabIds[collapsePane === 'primary' ? 'secondary' : 'primary'];
    const referenced = referencedTabIds(state.paneTabIds);
    const merged = state.tabs.map((tab) => tab.id).filter((id) => referenced.has(id));
    const collapsedTab = state.tabs.find((tab) => tab.id === collapsedId);
    return {
      splitViewEnabled: false,
      activePane: 'primary',
      paneTabIds: { primary: merged, secondary: [] },
      paneActiveTabIds: { primary: collapsedId, secondary: undefined },
      activeTabId: collapsedId,
      selectedFileId: selectedFileForTab(collapsedTab),
      focusedNode: collapsedTab?.kind === 'file' && state.focusedNode?.fileId === collapsedTab.fileId ? state.focusedNode : undefined,
      ...sidebarStateForTab(collapsedTab),
    };
  }),
  refreshQueryTab: (tabId) => set((state) => {
    if (!state.project) return {};
    return {
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId || tab.kind !== 'query' || tab.refreshPolicy !== 'snapshot') return tab;
        if (tab.queryKind === 'search') {
          return {
            ...tab,
            snapshot: tracedSearchProjectNodes(state.project!, tab.query, state.changeSet),
            projectVersion: state.projectVersion,
            changeVersion: state.changeVersion,
          };
        }
        if (tab.queryKind === 'references') {
          return {
            ...tab,
            ...referenceSnapshot(state.project!, state.changeSet, tab.symbolType, tab.symbolName),
            projectVersion: state.projectVersion,
            changeVersion: state.changeVersion,
          };
        }
        if (tab.queryKind === 'resource-references') {
          return {
            ...tab,
            ...resourceReferenceSnapshot(state.project!, state.changeSet, tab.resourceKind, tab.resourceName, tab.resourcePath),
            projectVersion: state.projectVersion,
            changeVersion: state.changeVersion,
          };
        }
        return tab;
      }),
    };
  }),
  selectTab: (tabId, paneId) => set((state) => {
    const tab = state.tabs.find((item) => item.id === tabId);
    if (!tab) return {};
    const activation = activateTabInPane(state, tabId, paneId);
    if (tab.kind !== 'file') return {
      ...activation,
      selectedFileId: undefined,
      focusedNode: undefined,
      ...sidebarStateForTab(tab),
      ...(tab.kind === 'project-graph' ? navigationHistoryForTarget(state, { graphTabId: tab.id }) : {}),
    };
    const target: NavigationLocation = { fileId: tab.fileId };
    return {
      ...activation,
      selectedFileId: tab.fileId,
      focusedNode: undefined,
      toolSidebarOverride: undefined,
      ...navigationHistoryForTarget(state, target),
    };
  }),
  closeTab: (tabId, requestedPane) => set((state) => {
    const pane = effectivePane(state, requestedPane);
    const paneIds = state.paneTabIds[pane];
    const index = paneIds.indexOf(tabId);
    if (index < 0) return {};
    const nextPaneIds = paneIds.filter((id) => id !== tabId);
    const replacement = nextPaneIds[Math.min(index, nextPaneIds.length - 1)] ?? nextPaneIds.at(-1);
    const paneTabIds = { ...state.paneTabIds, [pane]: nextPaneIds };
    const paneActiveTabIds = { ...state.paneActiveTabIds, [pane]: state.paneActiveTabIds[pane] === tabId ? replacement : state.paneActiveTabIds[pane] };
    const closing = state.tabs.find((tab) => tab.id === tabId);
    const refs = referencedTabIds(paneTabIds);
    const fullyClosed = !refs.has(tabId);
    const tabs = fullyClosed ? state.tabs.filter((tab) => tab.id !== tabId) : state.tabs;
    const recentlyClosedFileIds = fullyClosed && closing?.kind === 'file'
      ? [...state.recentlyClosedFileIds.filter((item) => item !== closing.fileId), closing.fileId].slice(-20)
      : state.recentlyClosedFileIds;
    return {
      tabs, paneTabIds, paneActiveTabIds, recentlyClosedFileIds,
      ...activeTabState(state, tabs, paneTabIds, paneActiveTabIds),
    };
  }),
  closeOtherTabs: (tabId, requestedPane) => set((state) => {
    const pane = effectivePane(state, requestedPane);
    const paneIds = state.paneTabIds[pane];
    if (!paneIds.includes(tabId)) return {};
    const removedIds = paneIds.filter((id) => id !== tabId);
    const paneTabIds = { ...state.paneTabIds, [pane]: [tabId] };
    const paneActiveTabIds = { ...state.paneActiveTabIds, [pane]: tabId };
    const refs = referencedTabIds(paneTabIds);
    const fullyClosed = state.tabs.filter((tab) => removedIds.includes(tab.id) && !refs.has(tab.id));
    const tabs = pruneUnreferencedTabs(state.tabs, paneTabIds);
    const closedFiles = fullyClosed.filter((tab): tab is FileWorkbenchTab => tab.kind === 'file').map((tab) => tab.fileId);
    return {
      tabs, paneTabIds, paneActiveTabIds,
      recentlyClosedFileIds: [...state.recentlyClosedFileIds.filter((id) => !closedFiles.includes(id)), ...closedFiles].slice(-20),
      ...activeTabState(state, tabs, paneTabIds, paneActiveTabIds),
    };
  }),
  closeTabsToRight: (tabId, requestedPane) => set((state) => {
    const pane = effectivePane(state, requestedPane);
    const paneIds = state.paneTabIds[pane];
    const index = paneIds.indexOf(tabId);
    if (index < 0 || index === paneIds.length - 1) return {};
    const kept = paneIds.slice(0, index + 1);
    const removedIds = paneIds.slice(index + 1);
    const paneTabIds = { ...state.paneTabIds, [pane]: kept };
    const paneActiveTabIds = { ...state.paneActiveTabIds };
    if (removedIds.includes(paneActiveTabIds[pane] ?? '')) paneActiveTabIds[pane] = tabId;
    const refs = referencedTabIds(paneTabIds);
    const fullyClosed = state.tabs.filter((tab) => removedIds.includes(tab.id) && !refs.has(tab.id));
    const tabs = pruneUnreferencedTabs(state.tabs, paneTabIds);
    const closedFiles = fullyClosed.filter((tab): tab is FileWorkbenchTab => tab.kind === 'file').map((tab) => tab.fileId);
    return {
      tabs, paneTabIds, paneActiveTabIds,
      recentlyClosedFileIds: [...state.recentlyClosedFileIds.filter((id) => !closedFiles.includes(id)), ...closedFiles].slice(-20),
      ...activeTabState(state, tabs, paneTabIds, paneActiveTabIds),
    };
  }),
  closeAllTabs: (requestedPane) => set((state) => {
    const pane = effectivePane(state, requestedPane);
    const removedIds = state.paneTabIds[pane];
    if (!removedIds.length) return {};
    const paneTabIds = { ...state.paneTabIds, [pane]: [] };
    const paneActiveTabIds = { ...state.paneActiveTabIds, [pane]: undefined };
    const refs = referencedTabIds(paneTabIds);
    const fullyClosed = state.tabs.filter((tab) => removedIds.includes(tab.id) && !refs.has(tab.id));
    const tabs = pruneUnreferencedTabs(state.tabs, paneTabIds);
    const closedFiles = fullyClosed.filter((tab): tab is FileWorkbenchTab => tab.kind === 'file').map((tab) => tab.fileId);
    return {
      tabs, paneTabIds, paneActiveTabIds,
      recentlyClosedFileIds: [...state.recentlyClosedFileIds.filter((id) => !closedFiles.includes(id)), ...closedFiles].slice(-20),
      ...activeTabState(state, tabs, paneTabIds, paneActiveTabIds),
    };
  }),
  revealFileInExplorer: (fileId) => set((state) => {
    const file = state.project?.fileMap.get(fileId);
    if (!file) return {};
    const parts = file.path.replace(/\\/g, '/').split('/').filter(Boolean);
    const explorerFolderState = { ...state.explorerFolderState };
    let current = '';
    for (const part of parts.slice(0, -1)) { current = current ? `${current}/${part}` : part; explorerFolderState[current] = true; }
    const toolSidebar = activeToolSidebar(state);
    return {
      ...(toolSidebar ? { toolSidebarOverride: 'explorer' as const } : { sidebarView: 'explorer' as const, toolSidebarOverride: undefined }),
      sidebarVisible: true,
      explorerWorkspace: 'all',
      explorerFolderState,
    };
  }),
  revealPathInExplorer: (path) => set((state) => {
    if (!state.workspace?.sourceEntries.has(path)) return {};
    const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
    const explorerFolderState = { ...state.explorerFolderState };
    let current = '';
    for (const part of parts.slice(0, -1)) { current = current ? `${current}/${part}` : part; explorerFolderState[current] = true; }
    const toolSidebar = activeToolSidebar(state);
    return {
      ...(toolSidebar ? { toolSidebarOverride: 'explorer' as const } : { sidebarView: 'explorer' as const, toolSidebarOverride: undefined }),
      sidebarVisible: true,
      explorerWorkspace: 'all',
      explorerFolderState,
    };
  }),
  navigateBack: () => set((state) => {
    if (!state.project || !state.navigationPast.length) return {};
    const remaining = [...state.navigationPast];
    let target = remaining.pop();
    while (target && !target.graphTabId && (!target.fileId || !state.project.fileMap.has(target.fileId))) target = remaining.pop();
    while (target?.graphTabId && !state.tabs.some((tab) => tab.id === target!.graphTabId && tab.kind === 'project-graph')) target = remaining.pop();
    if (!target) return { navigationPast: remaining };
    const history = {
      navigationPast: remaining,
      navigationCurrent: target,
      navigationFuture: state.navigationCurrent ? [state.navigationCurrent, ...state.navigationFuture].slice(0, 100) : state.navigationFuture,
    };
    if (target.graphTabId) {
      const tab = state.tabs.find((item) => item.id === target!.graphTabId);
      return { ...history, ...activateTabInPane(state, target.graphTabId), selectedFileId: undefined, focusedNode: undefined, ...sidebarStateForTab(tab) };
    }
    const file = state.project.fileMap.get(target.fileId!)!;
    const tab = target.nodeId ? { id: fileTabId(target.fileId!), kind: 'file' as const, fileId: target.fileId! } : fileNavigationTab(state.workspace, file);
    const staleFileTabId = fileTabId(target.fileId!);
    const removeIds = tab.kind === 'source' ? new Set([staleFileTabId]) : new Set<string>();
    const tabsWithoutStaleFile = state.tabs.filter((item) => !removeIds.has(item.id));
    const paneBase = removeIdsFromPaneTabs(state.paneTabIds, removeIds);
    const stateForActivation = { ...state, paneTabIds: paneBase } as WorkbenchState;
    const exists = tabsWithoutStaleFile.some((item) => item.id === tab.id);
    const focused = target.nodeId && target.location ? { fileId: target.fileId!, nodeId: target.nodeId, location: target.location, token: Date.now() } : undefined;
    return {
      ...history, selectedFileId: tab.kind === 'file' ? target.fileId : undefined,
      ...activateTabInPane(stateForActivation, tab.id),
      tabs: exists ? tabsWithoutStaleFile : [...tabsWithoutStaleFile, tab],
      focusedNode: focused, toolSidebarOverride: undefined,
      filters: focused ? { ...state.filters, live: focused.location === 'live' ? true : state.filters.live, floating: focused.location === 'floating' ? true : state.filters.floating } : state.filters,
    };
  }),
  navigateForward: () => set((state) => {
    if (!state.project || !state.navigationFuture.length) return {};
    const remaining = [...state.navigationFuture];
    let target = remaining.shift();
    while (target && !target.graphTabId && (!target.fileId || !state.project.fileMap.has(target.fileId))) target = remaining.shift();
    while (target?.graphTabId && !state.tabs.some((tab) => tab.id === target!.graphTabId && tab.kind === 'project-graph')) target = remaining.shift();
    if (!target) return { navigationFuture: remaining };
    const history = {
      navigationFuture: remaining,
      navigationCurrent: target,
      navigationPast: state.navigationCurrent ? [...state.navigationPast, state.navigationCurrent].slice(-100) : state.navigationPast,
    };
    if (target.graphTabId) {
      const tab = state.tabs.find((item) => item.id === target!.graphTabId);
      return { ...history, ...activateTabInPane(state, target.graphTabId), selectedFileId: undefined, focusedNode: undefined, ...sidebarStateForTab(tab) };
    }
    const file = state.project.fileMap.get(target.fileId!)!;
    const tab = target.nodeId ? { id: fileTabId(target.fileId!), kind: 'file' as const, fileId: target.fileId! } : fileNavigationTab(state.workspace, file);
    const staleFileTabId = fileTabId(target.fileId!);
    const removeIds = tab.kind === 'source' ? new Set([staleFileTabId]) : new Set<string>();
    const tabsWithoutStaleFile = state.tabs.filter((item) => !removeIds.has(item.id));
    const paneBase = removeIdsFromPaneTabs(state.paneTabIds, removeIds);
    const stateForActivation = { ...state, paneTabIds: paneBase } as WorkbenchState;
    const exists = tabsWithoutStaleFile.some((item) => item.id === tab.id);
    const focused = target.nodeId && target.location ? { fileId: target.fileId!, nodeId: target.nodeId, location: target.location, token: Date.now() } : undefined;
    return {
      ...history, selectedFileId: tab.kind === 'file' ? target.fileId : undefined,
      ...activateTabInPane(stateForActivation, tab.id),
      tabs: exists ? tabsWithoutStaleFile : [...tabsWithoutStaleFile, tab],
      focusedNode: focused, toolSidebarOverride: undefined,
      filters: focused ? { ...state.filters, live: focused.location === 'live' ? true : state.filters.live, floating: focused.location === 'floating' ? true : state.filters.floating } : state.filters,
    };
  }),
  reopenClosedFile: () => set((state) => {
    if (!state.project || !state.recentlyClosedFileIds.length) return {};
    const remaining = [...state.recentlyClosedFileIds];
    let fileId = remaining.pop();
    while (fileId && !state.project.fileMap.has(fileId)) fileId = remaining.pop();
    if (!fileId) return { recentlyClosedFileIds: remaining };
    const file = state.project.fileMap.get(fileId)!;
    const tab = fileNavigationTab(state.workspace, file);
    const staleFileTabId = fileTabId(fileId);
    const tabsWithoutStaleFile = tab.kind === 'source' ? state.tabs.filter((item) => item.id !== staleFileTabId) : state.tabs;
    const target: NavigationLocation = { fileId };
    const paneBase = tab.kind === 'source' ? removeIdsFromPaneTabs(state.paneTabIds, new Set([staleFileTabId])) : state.paneTabIds;
    const stateForActivation = paneBase === state.paneTabIds ? state : ({ ...state, paneTabIds: paneBase } as WorkbenchState);
    return {
      recentlyClosedFileIds: remaining,
      selectedFileId: tab.kind === 'file' ? fileId : undefined,
      ...activateTabInPane(stateForActivation, tab.id),
      tabs: state.tabs.some((item) => item.id === tab.id) ? tabsWithoutStaleFile : [...tabsWithoutStaleFile, tab],
      focusedNode: undefined,
      toolSidebarOverride: undefined,
      ...navigationHistoryForTarget(state, target),
    };
  }),
  setChangeSet: (changeSet) => set((state) => pushChangeSet(state, changeSet)),
  removeChange: (changeId) => set((state) => pushChangeSet(state, removeChangeFromSet(state.changeSet, changeId))),
  removeChangesForFile: (fileId) => set((state) => pushChangeSet(state, {
    ...state.changeSet,
    changes: state.changeSet.changes.filter((change) => change.fileId !== fileId),
  })),
  removeRule: (ruleId) => set((state) => pushChangeSet(state, removeRuleFromSet(state.changeSet, ruleId))),
  undoChanges: () => set((state) => {
    const previous = state.changePast.at(-1);
    if (!previous) return {};
    return {
      changeSet: previous,
      changePast: state.changePast.slice(0, -1),
      changeFuture: [state.changeSet, ...state.changeFuture].slice(0, 100),
      changeVersion: state.changeVersion + 1,
    };
  }),
  redoChanges: () => set((state) => {
    const next = state.changeFuture[0];
    if (!next) return {};
    return {
      changeSet: next,
      changePast: [...state.changePast, state.changeSet].slice(-100),
      changeFuture: state.changeFuture.slice(1),
      changeVersion: state.changeVersion + 1,
    };
  }),
  commitProject: (project) => set((state) => ({
    project,
    projectVersion: state.projectVersion + 1,
    changeVersion: 0,
    visualSelectedFileIds: state.visualSelectedFileIds.filter((fileId) => project.fileMap.has(fileId)),
    changeSet: emptyChangeSet(),
    changePast: [],
    changeFuture: [],
  })),
  commitWorkspace: (workspace) => set((state) => {
    const previousProject = state.project;
    const project = timedProjectBuild(workspace, 'project.model.rebuild-after-apply');
    const empty = emptyChangeSet();
    const nextByPath = new Map(project.files.map((file) => [normalizedProjectPath(file.path), file]));
    const nextFileForOldId = (fileId: string | undefined) => {
      const path = fileId && previousProject?.fileMap.get(fileId)?.path;
      return path ? nextByPath.get(normalizedProjectPath(path)) : undefined;
    };
    const remapLocation = (location: NavigationLocation | undefined): NavigationLocation | undefined => {
      if (!location) return undefined;
      if (location.graphTabId) return state.tabs.some((tab) => tab.id === location.graphTabId && tab.kind === 'project-graph') ? location : undefined;
      const file = nextFileForOldId(location.fileId);
      if (!file) return undefined;
      if (!location.nodeId || !location.location) return { fileId: file.id };
      const node = file.nodes.find((item) => item.id === location.nodeId && item.location === location.location);
      return node ? { fileId: file.id, nodeId: node.id, location: node.location } : { fileId: file.id };
    };
    const tabs = state.tabs.flatMap((tab): WorkbenchTab[] => {
      if (tab.kind === 'file') {
        const file = nextFileForOldId(tab.fileId);
        return file ? [fileNavigationTab(workspace, file)] : [];
      }
      if (tab.kind === 'source') return workspace.sourceEntries.has(tab.path) ? [tab] : [];
      if (tab.kind === 'query' && tab.queryKind === 'search') {
        return [{ ...tab, snapshot: tracedSearchProjectNodes(project, tab.query, empty), projectVersion: state.projectVersion + 1, changeVersion: 0 }];
      }
      if (tab.kind === 'query' && tab.queryKind === 'references') {
        return [{ ...tab, ...referenceSnapshot(project, empty, tab.symbolType, tab.symbolName), projectVersion: state.projectVersion + 1, changeVersion: 0 }];
      }
      if (tab.kind === 'query' && tab.queryKind === 'resource-references') {
        return [{ ...tab, ...resourceReferenceSnapshot(project, empty, tab.resourceKind, tab.resourceName, tab.resourcePath), projectVersion: state.projectVersion + 1, changeVersion: 0 }];
      }
      return [tab];
    });
    const dedupedTabs: WorkbenchTab[] = [...new Map<string, WorkbenchTab>(tabs.map((tab) => [tab.id, tab])).values()];
    const remapTabId = (tabId: string | undefined): string | undefined => {
      if (!tabId) return undefined;
      const old = state.tabs.find((tab) => tab.id === tabId);
      if (!old) return undefined;
      if (old.kind === 'file') {
        const file = nextFileForOldId(old.fileId);
        return file ? fileNavigationTab(workspace, file).id : undefined;
      }
      if (old.kind === 'source' && !workspace.sourceEntries.has(old.path)) return undefined;
      return dedupedTabs.some((tab) => tab.id === old.id) ? old.id : undefined;
    };
    const paneActiveTabIds: WorkbenchPaneActiveTabs = {
      primary: remapTabId(state.paneActiveTabIds.primary),
      secondary: remapTabId(state.paneActiveTabIds.secondary),
    };
    const paneTabIds: WorkbenchPaneTabs = {
      primary: state.paneTabIds.primary.map(remapTabId).filter((id): id is string => !!id),
      secondary: state.paneTabIds.secondary.map(remapTabId).filter((id): id is string => !!id),
    };
    const activePane = effectivePane(state);
    let activeTabId = paneActiveTabIds[activePane];
    if (!activeTabId) {
      activeTabId = paneTabIds[activePane][0] ?? dedupedTabs[0]?.id;
      paneActiveTabIds[activePane] = activeTabId;
      if (activeTabId && !paneTabIds[activePane].includes(activeTabId)) paneTabIds[activePane].push(activeTabId);
    }
    const activeTab = dedupedTabs.find((tab) => tab.id === activeTabId);
    const selectedFileId = selectedFileForTab(activeTab);
    const focusedLocation = remapLocation(state.focusedNode);
    const focusedNode = focusedLocation?.fileId && focusedLocation.nodeId && focusedLocation.location
      ? { fileId: focusedLocation.fileId, nodeId: focusedLocation.nodeId, location: focusedLocation.location, token: Date.now() }
      : undefined;

    return {
      workspace,
      project,
      projectVersion: state.projectVersion + 1,
      changeVersion: 0,
      editing: false,
      tabs: dedupedTabs,
      activeTabId,
      paneActiveTabIds,
      paneTabIds,
      selectedFileId,
      focusedNode,
      explorerWorkspace: validExplorerWorkspaceId(project, state.explorerWorkspace),
      filters: { ...state.filters, workspace: validProjectWorkspaceId(project, state.filters.workspace) },
      visualSelectedFileIds: state.visualSelectedFileIds.map((id) => nextFileForOldId(id)?.id).filter((id): id is string => !!id),
      navigationCurrent: remapLocation(state.navigationCurrent),
      navigationPast: state.navigationPast.map(remapLocation).filter((item): item is NavigationLocation => !!item),
      navigationFuture: state.navigationFuture.map(remapLocation).filter((item): item is NavigationLocation => !!item),
      recentlyClosedFileIds: state.recentlyClosedFileIds.map((id) => nextFileForOldId(id)?.id).filter((id): id is string => !!id),
      changeSet: empty,
      changePast: [],
      changeFuture: [],
    };
  }),
  applyExternalWorkspaceReload: (workspace, changedPaths) => set((state) => {
    if (!state.project || !state.workspace) return {};
    if (state.workspace.projectRoot && workspace.projectRoot && state.workspace.projectRoot !== workspace.projectRoot) return {};

    const previousProject = state.project;
    const project = timedProjectBuild(workspace, 'project.model.rebuild-external');
    const changed = new Set<string>(changedPaths.map(normalizedProjectPath).filter(Boolean));
    const invalidatedChangePaths = [...new Set(state.changeSet.changes
      .filter((change) => pathAffected(change.filePath, changed))
      .map((change) => change.filePath))];
    const currentTouched = invalidatedChangePaths.length > 0;
    const historyTouched = [...state.changePast, ...state.changeFuture].some((entry) => changeSetTouchesPaths(entry, changed));
    const remappedCurrent = currentTouched ? emptyChangeSet() : (remapChangeSet(state.changeSet, project) ?? emptyChangeSet());
    const currentInvalidated = currentTouched || (state.changeSet.changes.length > 0 && remappedCurrent.changes.length === 0);
    const invalidatedChanges = currentInvalidated ? state.changeSet.changes.length : 0;
    const invalidatedHistory = currentInvalidated || historyTouched
      || state.changePast.some((entry) => !remapChangeSet(entry, project))
      || state.changeFuture.some((entry) => !remapChangeSet(entry, project));

    const oldPathForId = (fileId: string | undefined) => fileId ? previousProject.fileMap.get(fileId)?.path : undefined;
    const nextFileForOldId = (fileId: string | undefined) => {
      const path = oldPathForId(fileId);
      if (!path) return undefined;
      return project.files.find((file) => normalizedProjectPath(file.path) === normalizedProjectPath(path));
    };
    const remapLocation = (location: NavigationLocation | undefined): NavigationLocation | undefined => {
      if (!location) return undefined;
      if (location.graphTabId) return state.tabs.some((tab) => tab.id === location.graphTabId && tab.kind === 'project-graph') ? location : undefined;
      const file = nextFileForOldId(location.fileId);
      if (!file) return undefined;
      if (!location.nodeId || !location.location) return { fileId: file.id };
      const node = file.nodes.find((item) => item.id === location.nodeId && item.location === location.location);
      return node ? { fileId: file.id, nodeId: node.id, location: node.location } : { fileId: file.id };
    };

    const tabs = state.tabs.flatMap((tab): WorkbenchTab[] => {
      if (tab.kind === 'file') {
        const file = nextFileForOldId(tab.fileId);
        return file ? [fileNavigationTab(workspace, file)] : [];
      }
      if (tab.kind === 'source') return workspace.sourceEntries.has(tab.path) ? [tab] : [];
      if (tab.kind === 'query' && tab.queryKind === 'search') {
        return [{ ...tab, snapshot: tracedSearchProjectNodes(project, tab.query, remappedCurrent), projectVersion: state.projectVersion + 1, changeVersion: state.changeVersion + Number(currentInvalidated) }];
      }
      if (tab.kind === 'query' && tab.queryKind === 'references') {
        return [{ ...tab, ...referenceSnapshot(project, remappedCurrent, tab.symbolType, tab.symbolName), projectVersion: state.projectVersion + 1, changeVersion: state.changeVersion + Number(currentInvalidated) }];
      }
      if (tab.kind === 'query' && tab.queryKind === 'resource-references') {
        return [{ ...tab, ...resourceReferenceSnapshot(project, remappedCurrent, tab.resourceKind, tab.resourceName, tab.resourcePath), projectVersion: state.projectVersion + 1, changeVersion: state.changeVersion + Number(currentInvalidated) }];
      }
      return [tab];
    });
    const dedupedTabs: WorkbenchTab[] = [...new Map<string, WorkbenchTab>(tabs.map((tab) => [tab.id, tab])).values()];
    const remapTabId = (tabId: string | undefined): string | undefined => {
      if (!tabId) return undefined;
      const old = state.tabs.find((tab) => tab.id === tabId);
      if (!old) return undefined;
      if (old.kind === 'file') {
        const file = nextFileForOldId(old.fileId);
        return file ? fileNavigationTab(workspace, file).id : undefined;
      }
      if (old.kind === 'source' && !workspace.sourceEntries.has(old.path)) return undefined;
      return dedupedTabs.some((tab) => tab.id === old.id) ? old.id : undefined;
    };
    const paneActiveTabIds: WorkbenchPaneActiveTabs = {
      primary: remapTabId(state.paneActiveTabIds.primary),
      secondary: remapTabId(state.paneActiveTabIds.secondary),
    };
    const paneTabIds: WorkbenchPaneTabs = {
      primary: state.paneTabIds.primary.map(remapTabId).filter((id): id is string => !!id),
      secondary: state.paneTabIds.secondary.map(remapTabId).filter((id): id is string => !!id),
    };
    const activePane = effectivePane(state);
    let activeTabId = paneActiveTabIds[activePane];
    if (!activeTabId) {
      activeTabId = paneTabIds[activePane][0] ?? dedupedTabs[0]?.id;
      paneActiveTabIds[activePane] = activeTabId;
      if (activeTabId && !paneTabIds[activePane].includes(activeTabId)) paneTabIds[activePane].push(activeTabId);
    }
    const activeTab = dedupedTabs.find((tab) => tab.id === activeTabId);
    const selectedFileId = selectedFileForTab(activeTab);
    const focusedLocation = remapLocation(state.focusedNode);
    const focusedNode = focusedLocation?.fileId && focusedLocation.nodeId && focusedLocation.location
      ? { fileId: focusedLocation.fileId, nodeId: focusedLocation.nodeId, location: focusedLocation.location, token: Date.now() }
      : undefined;

    recordRuntimeEvent('project.external-change.applied', {
      data: {
        changedPathCount: changedPaths.length,
        invalidatedChanges,
        invalidatedHistory,
        changedPaths,
      },
    });

    return {
      workspace,
      project,
      projectVersion: state.projectVersion + 1,
      changeVersion: state.changeVersion + Number(currentInvalidated || invalidatedHistory),
      tabs: dedupedTabs,
      activeTabId,
      paneActiveTabIds,
      paneTabIds,
      selectedFileId,
      focusedNode,
      navigationCurrent: remapLocation(state.navigationCurrent),
      navigationPast: state.navigationPast.map(remapLocation).filter((item): item is NavigationLocation => !!item),
      navigationFuture: state.navigationFuture.map(remapLocation).filter((item): item is NavigationLocation => !!item),
      recentlyClosedFileIds: state.recentlyClosedFileIds.map((id) => nextFileForOldId(id)?.id).filter((id): id is string => !!id),
      explorerWorkspace: validExplorerWorkspaceId(project, state.explorerWorkspace),
      filters: { ...state.filters, workspace: validProjectWorkspaceId(project, state.filters.workspace) },
      visualSelectedFileIds: state.visualSelectedFileIds.map((id) => nextFileForOldId(id)?.id).filter((id): id is string => !!id),
      changeSet: remappedCurrent,
      changePast: invalidatedHistory ? [] : state.changePast.map((entry) => remapChangeSet(entry, project)!).filter(Boolean),
      changeFuture: invalidatedHistory ? [] : state.changeFuture.map((entry) => remapChangeSet(entry, project)!).filter(Boolean),
      externalChangeNotice: changedPaths.length ? {
        paths: changedPaths.slice(0, 20),
        invalidatedChanges,
        invalidatedHistory,
        invalidatedChangePaths,
        timestamp: Date.now(),
      } : state.externalChangeNotice,
    };
  }),
  clearExternalChangeNotice: () => set({ externalChangeNotice: undefined }),
  resetChanges: () => set((state) => ({
    changeSet: emptyChangeSet(),
    changePast: [],
    changeFuture: [],
    changeVersion: state.changeVersion + 1,
  })),
}));

useWorkbenchStore.subscribe((state) => {
  const rootPath = state.workspace?.projectRoot;
  const project = state.project;
  if (!rootPath || !project) return;
  const filePath = (fileId: string | undefined) => fileId ? project.fileMap.get(fileId)?.path : undefined;
  const fileTabs = state.tabs.filter((tab): tab is FileWorkbenchTab => tab.kind === 'file' && project.fileMap.has(tab.fileId));
  const sourceTabs = state.tabs.filter((tab): tab is SourceWorkbenchTab => tab.kind === 'source' && !!state.workspace?.sourceEntries.has(tab.path));
  const activeFile = state.tabs.find((tab) => tab.id === state.activeTabId && tab.kind === 'file') as FileWorkbenchTab | undefined;
  const activeSource = state.tabs.find((tab) => tab.id === state.activeTabId && tab.kind === 'source') as SourceWorkbenchTab | undefined;
  const focusedNode = state.focusedNode && project.fileMap.has(state.focusedNode.fileId)
    ? navigationToPersisted(project, state.focusedNode)
    : undefined;

  writeProjectSession(rootPath, {
    version: 1,
    openFilePaths: fileTabs.map((tab) => filePath(tab.fileId)).filter((path): path is string => !!path),
    activeFilePath: filePath(activeFile?.fileId),
    openSourcePaths: sourceTabs.map((tab) => tab.path),
    activeSourcePath: activeSource?.path,
    focusedNode,
    explorerWorkspace: state.explorerWorkspace,
    explorerFolderState: state.explorerFolderState,
    sidebarView: state.sidebarView,
    sidebarVisible: state.sidebarVisible,
    searchSidebarQuery: state.searchSidebarQuery,
    recentSearches: state.recentSearches,
    filters: state.filters,
    recentlyClosedFilePaths: state.recentlyClosedFileIds.map((id) => filePath(id)).filter((path): path is string => !!path),
    navigationCurrent: navigationToPersisted(project, state.navigationCurrent),
    navigationPast: state.navigationPast.map((item) => navigationToPersisted(project, item)).filter((item): item is PersistedNavigationLocation => !!item),
    navigationFuture: state.navigationFuture.map((item) => navigationToPersisted(project, item)).filter((item): item is PersistedNavigationLocation => !!item),
    visualSelectedFilePaths: state.visualSelectedFileIds.map((id) => filePath(id)).filter((path): path is string => !!path),
    visualSettings: state.visualSettings,
    projectGraphSettings: state.projectGraphSettings,
  });
});

