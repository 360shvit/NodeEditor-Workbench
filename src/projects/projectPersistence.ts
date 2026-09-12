import type { NodeLocation } from '../core';
import type { InspectorFilters, ProjectGraphViewSettings, SidebarView, VisualLayoutSettings } from '../store';

const RECENT_PROJECTS_KEY = 'hytale-workbench.projects.v1';
const SESSION_PREFIX = 'hytale-workbench.project-session.v1:';
const MAX_RECENT_PROJECTS = 20;
const MAX_NAVIGATION_ENTRIES = 100;
const MAX_RECENTLY_CLOSED = 20;

const PERSISTENCE_DEFAULT_FILTERS: InspectorFilters = {
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

const PERSISTENCE_DEFAULT_VISUAL_SETTINGS: VisualLayoutSettings = {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function finiteNonNegative(value: unknown, fallback: number, max = 100_000): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(max, value) : fallback;
}

function cleanNavigationLocation(value: unknown): PersistedNavigationLocation | undefined {
  if (!isRecord(value) || typeof value.filePath !== 'string' || !value.filePath.trim()) return undefined;
  const location = value.location === 'live' || value.location === 'floating' ? value.location : undefined;
  return {
    filePath: value.filePath,
    nodeId: typeof value.nodeId === 'string' ? value.nodeId : undefined,
    location,
  };
}

function cleanInspectorFilters(value: unknown): InspectorFilters {
  if (!isRecord(value)) return { ...PERSISTENCE_DEFAULT_FILTERS };
  const valueFields = Array.isArray(value.valueFields)
    ? [...new Set(value.valueFields.filter((item): item is string => typeof item === 'string' && item.length <= 512))].slice(0, 512)
    : [];
  return {
    imports: boolOr(value.imports, PERSISTENCE_DEFAULT_FILTERS.imports),
    exports: boolOr(value.exports, PERSISTENCE_DEFAULT_FILTERS.exports),
    seeds: boolOr(value.seeds, PERSISTENCE_DEFAULT_FILTERS.seeds),
    valueFields,
    allValues: boolOr(value.allValues, PERSISTENCE_DEFAULT_FILTERS.allValues),
    live: boolOr(value.live, PERSISTENCE_DEFAULT_FILTERS.live),
    floating: boolOr(value.floating, PERSISTENCE_DEFAULT_FILTERS.floating),
    hideEmpty: boolOr(value.hideEmpty, PERSISTENCE_DEFAULT_FILTERS.hideEmpty),
    workspace: typeof value.workspace === 'string' && value.workspace.length <= 512 ? value.workspace : 'all',
  };
}

function cleanVisualLayoutSettings(value: unknown): VisualLayoutSettings {
  if (!isRecord(value)) return { ...PERSISTENCE_DEFAULT_VISUAL_SETTINGS };
  const strategy = value.strategy === 'normalize' || value.strategy === 'author-normalize' || value.strategy === 'dag-rebuild'
    ? value.strategy
    : PERSISTENCE_DEFAULT_VISUAL_SETTINGS.strategy;
  const spacingPreset = value.spacingPreset === 'compact' || value.spacingPreset === 'normal' || value.spacingPreset === 'spacious' || value.spacingPreset === 'custom'
    ? value.spacingPreset
    : PERSISTENCE_DEFAULT_VISUAL_SETTINGS.spacingPreset;
  const dagBranchDirection = value.dagBranchDirection === 'auto' || value.dagBranchDirection === 'up' || value.dagBranchDirection === 'down' || value.dagBranchDirection === 'type'
    ? value.dagBranchDirection
    : PERSISTENCE_DEFAULT_VISUAL_SETTINGS.dagBranchDirection;
  const floaterMode = value.floaterMode === 'ignore' || value.floaterMode === 'pack' || value.floaterMode === 'quarantine'
    ? value.floaterMode
    : PERSISTENCE_DEFAULT_VISUAL_SETTINGS.floaterMode;
  return {
    strategy,
    spacingPreset,
    horizontalGap: finiteNonNegative(value.horizontalGap, PERSISTENCE_DEFAULT_VISUAL_SETTINGS.horizontalGap),
    verticalGap: finiteNonNegative(value.verticalGap, PERSISTENCE_DEFAULT_VISUAL_SETTINGS.verticalGap),
    alignmentTolerance: finiteNonNegative(value.alignmentTolerance, PERSISTENCE_DEFAULT_VISUAL_SETTINGS.alignmentTolerance),
    dagBranchDirection,
    includeLive: boolOr(value.includeLive, PERSISTENCE_DEFAULT_VISUAL_SETTINGS.includeLive),
    includeFloating: boolOr(value.includeFloating, PERSISTENCE_DEFAULT_VISUAL_SETTINGS.includeFloating),
    respectAuthorSections: boolOr(value.respectAuthorSections, PERSISTENCE_DEFAULT_VISUAL_SETTINGS.respectAuthorSections),
    floaterMode,
  };
}

function cleanFolderState(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([key, expanded]) => key.length <= 2048 && typeof expanded === 'boolean')
    .slice(0, 5000)) as Record<string, boolean>;
}

export interface RecentProjectEntry {
  rootPath: string;
  label: string;
  pinned: boolean;
  lastOpenedAt: number;
}

export interface PersistedNavigationLocation {
  filePath: string;
  nodeId?: string;
  location?: NodeLocation;
}

export interface ProjectSessionSnapshot {
  version: 1;
  openFilePaths: string[];
  activeFilePath?: string;
  openSourcePaths?: string[];
  activeSourcePath?: string;
  focusedNode?: PersistedNavigationLocation;
  explorerWorkspace: string | 'all';
  explorerFolderState: Record<string, boolean>;
  sidebarView?: SidebarView;
  sidebarVisible?: boolean;
  searchSidebarQuery?: string;
  recentSearches?: string[];
  filters: InspectorFilters;
  recentlyClosedFilePaths: string[];
  navigationCurrent?: PersistedNavigationLocation;
  navigationPast: PersistedNavigationLocation[];
  navigationFuture: PersistedNavigationLocation[];
  visualSelectedFilePaths: string[];
  visualSettings: VisualLayoutSettings;
  projectGraphSettings?: ProjectGraphViewSettings;
}

function storageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!window.localStorage;
  } catch {
    return false;
  }
}

function normalizeRootPath(rootPath: string): string {
  return rootPath.replace(/[\\/]+$/, '').trim();
}

function sessionKey(rootPath: string): string {
  return `${SESSION_PREFIX}${encodeURIComponent(normalizeRootPath(rootPath))}`;
}

function readJson<T>(key: string): T | undefined {
  if (!storageAvailable()) return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : undefined;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is a convenience. The Workbench must remain usable when storage is unavailable.
  }
}

function cleanRecentEntry(value: RecentProjectEntry): RecentProjectEntry | undefined {
  const rootPath = normalizeRootPath(value?.rootPath ?? '');
  const label = String(value?.label ?? '').trim();
  if (!rootPath || !label) return undefined;
  return {
    rootPath,
    label,
    pinned: value.pinned === true,
    lastOpenedAt: Number.isFinite(value.lastOpenedAt) ? value.lastOpenedAt : 0,
  };
}

export function readRecentProjects(): RecentProjectEntry[] {
  const raw = readJson<RecentProjectEntry[]>(RECENT_PROJECTS_KEY);
  if (!Array.isArray(raw)) return [];
  const deduped = new Map<string, RecentProjectEntry>();
  for (const item of raw) {
    const entry = cleanRecentEntry(item);
    if (!entry) continue;
    const key = entry.rootPath.toLocaleLowerCase();
    const existing = deduped.get(key);
    if (!existing || entry.lastOpenedAt >= existing.lastOpenedAt) deduped.set(key, entry);
  }
  return [...deduped.values()]
    .sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.lastOpenedAt - left.lastOpenedAt)
    .slice(0, MAX_RECENT_PROJECTS);
}

function writeRecentProjects(entries: RecentProjectEntry[]): void {
  writeJson(RECENT_PROJECTS_KEY, entries.slice(0, MAX_RECENT_PROJECTS));
}

export function rememberRecentProject(rootPath: string, label: string): void {
  const normalized = normalizeRootPath(rootPath);
  if (!normalized || !label.trim()) return;
  const entries = readRecentProjects();
  const key = normalized.toLocaleLowerCase();
  const previous = entries.find((item) => item.rootPath.toLocaleLowerCase() === key);
  const next: RecentProjectEntry = {
    rootPath: normalized,
    label: label.trim(),
    pinned: previous?.pinned ?? false,
    lastOpenedAt: Date.now(),
  };
  writeRecentProjects([next, ...entries.filter((item) => item.rootPath.toLocaleLowerCase() !== key)]
    .sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.lastOpenedAt - left.lastOpenedAt));
}

export function toggleRecentProjectPinned(rootPath: string): void {
  const normalized = normalizeRootPath(rootPath).toLocaleLowerCase();
  const entries = readRecentProjects().map((item) => item.rootPath.toLocaleLowerCase() === normalized
    ? { ...item, pinned: !item.pinned }
    : item);
  writeRecentProjects(entries.sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.lastOpenedAt - left.lastOpenedAt));
}

export function forgetRecentProject(rootPath: string): void {
  const normalized = normalizeRootPath(rootPath).toLocaleLowerCase();
  writeRecentProjects(readRecentProjects().filter((item) => item.rootPath.toLocaleLowerCase() !== normalized));
}

export function readProjectSession(rootPath: string): ProjectSessionSnapshot | undefined {
  const value = readJson<ProjectSessionSnapshot>(sessionKey(rootPath));
  if (!value || value.version !== 1 || !Array.isArray(value.openFilePaths)) return undefined;
  return {
    version: 1,
    openFilePaths: value.openFilePaths.filter((path): path is string => typeof path === 'string'),
    activeFilePath: typeof value.activeFilePath === 'string' ? value.activeFilePath : undefined,
    openSourcePaths: Array.isArray(value.openSourcePaths) ? value.openSourcePaths.filter((path): path is string => typeof path === 'string') : [],
    activeSourcePath: typeof value.activeSourcePath === 'string' ? value.activeSourcePath : undefined,
    focusedNode: cleanNavigationLocation(value.focusedNode),
    explorerWorkspace: typeof value.explorerWorkspace === 'string' ? value.explorerWorkspace : 'all',
    explorerFolderState: cleanFolderState(value.explorerFolderState),
    // Tool-specific sidebars are intentionally transient across restarts. Explorer/Search restore normally.
    sidebarView: value.sidebarView === 'search' ? 'search' : 'explorer',
    sidebarVisible: value.sidebarVisible !== false,
    searchSidebarQuery: typeof value.searchSidebarQuery === 'string' ? value.searchSidebarQuery : '',
    recentSearches: Array.isArray(value.recentSearches) ? value.recentSearches.filter((item): item is string => typeof item === 'string').slice(0, 12) : [],
    filters: cleanInspectorFilters(value.filters),
    recentlyClosedFilePaths: Array.isArray(value.recentlyClosedFilePaths)
      ? value.recentlyClosedFilePaths.filter((path): path is string => typeof path === 'string').slice(-MAX_RECENTLY_CLOSED)
      : [],
    navigationCurrent: cleanNavigationLocation(value.navigationCurrent),
    navigationPast: Array.isArray(value.navigationPast) ? value.navigationPast.map(cleanNavigationLocation).filter((item): item is PersistedNavigationLocation => !!item).slice(-MAX_NAVIGATION_ENTRIES) : [],
    navigationFuture: Array.isArray(value.navigationFuture) ? value.navigationFuture.map(cleanNavigationLocation).filter((item): item is PersistedNavigationLocation => !!item).slice(0, MAX_NAVIGATION_ENTRIES) : [],
    visualSelectedFilePaths: Array.isArray(value.visualSelectedFilePaths)
      ? value.visualSelectedFilePaths.filter((path): path is string => typeof path === 'string')
      : [],
    visualSettings: cleanVisualLayoutSettings(value.visualSettings),
    projectGraphSettings: value.projectGraphSettings && typeof value.projectGraphSettings === 'object'
      ? {
          selectedRootPath: typeof value.projectGraphSettings.selectedRootPath === 'string' ? value.projectGraphSettings.selectedRootPath.replace(/\\/g, '/') : undefined,
          densityDepth: [4, 6, 8, 12].includes(Number(value.projectGraphSettings.densityDepth)) ? Number(value.projectGraphSettings.densityDepth) : 8,
          includeResources: value.projectGraphSettings.includeResources === true,
          viewport: value.projectGraphSettings.viewport && typeof value.projectGraphSettings.viewport === 'object'
            && Number.isFinite(Number(value.projectGraphSettings.viewport.panX))
            && Number.isFinite(Number(value.projectGraphSettings.viewport.panY))
            && Number.isFinite(Number(value.projectGraphSettings.viewport.zoom))
            ? {
                panX: Number(value.projectGraphSettings.viewport.panX),
                panY: Number(value.projectGraphSettings.viewport.panY),
                zoom: Math.min(2.5, Math.max(0.15, Number(value.projectGraphSettings.viewport.zoom))),
              }
            : undefined,
        }
      : undefined,
  };
}

/**
 * Persist only navigation/UI context. Intentionally absent: editing, ChangeSet, Undo/Redo,
 * applied file snapshots, and any previous file contents. The filesystem is authoritative
 * whenever a project is opened again.
 */
export function writeProjectSession(rootPath: string, session: ProjectSessionSnapshot): void {
  writeJson(sessionKey(rootPath), {
    version: 1,
    openFilePaths: session.openFilePaths,
    activeFilePath: session.activeFilePath,
    openSourcePaths: (session.openSourcePaths ?? []).slice(0, 50),
    activeSourcePath: session.activeSourcePath,
    focusedNode: session.focusedNode,
    explorerWorkspace: session.explorerWorkspace,
    explorerFolderState: session.explorerFolderState,
    sidebarView: session.sidebarView,
    sidebarVisible: session.sidebarVisible,
    searchSidebarQuery: session.searchSidebarQuery ?? '',
    recentSearches: (session.recentSearches ?? []).slice(0, 12),
    filters: session.filters,
    recentlyClosedFilePaths: session.recentlyClosedFilePaths.slice(-MAX_RECENTLY_CLOSED),
    navigationCurrent: session.navigationCurrent,
    navigationPast: session.navigationPast.slice(-MAX_NAVIGATION_ENTRIES),
    navigationFuture: session.navigationFuture.slice(0, MAX_NAVIGATION_ENTRIES),
    visualSelectedFilePaths: session.visualSelectedFilePaths,
    visualSettings: session.visualSettings,
    projectGraphSettings: session.projectGraphSettings,
  });
}
