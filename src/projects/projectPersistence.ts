import type { NodeLocation } from '../core';
import type { InspectorFilters, ProjectGraphViewSettings, SidebarView, VisualLayoutSettings } from '../store';

const RECENT_PROJECTS_KEY = 'hytale-workbench.projects.v1';
const SESSION_PREFIX = 'hytale-workbench.project-session.v1:';
const MAX_RECENT_PROJECTS = 20;
const MAX_RECENT_PROJECT_SCAN = 200;
const MAX_OPEN_FILE_PATHS = 500;
const MAX_OPEN_SOURCE_PATHS = 50;
const MAX_VISUAL_SELECTED_PATHS = 500;
const MAX_NAVIGATION_ENTRIES = 100;
const MAX_RECENTLY_CLOSED = 20;
const MAX_RECENT_SEARCHES = 12;
const MAX_PATH_LENGTH = 4096;
const MAX_LABEL_LENGTH = 512;
const MAX_NODE_ID_LENGTH = 2048;
const MAX_QUERY_LENGTH = 4096;
const MAX_WORKSPACE_ID_LENGTH = 512;

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

function boundedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) return undefined;
  return value;
}

function cleanStringList(value: unknown, limit: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const cleaned = boundedString(item, maxLength);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
    if (result.length >= limit) break;
  }
  return result;
}

function cleanNavigationLocation(value: unknown): PersistedNavigationLocation | undefined {
  if (!isRecord(value)) return undefined;
  const filePath = boundedString(value.filePath, MAX_PATH_LENGTH);
  if (!filePath) return undefined;
  const location = value.location === 'live' || value.location === 'floating' ? value.location : undefined;
  return {
    filePath,
    nodeId: boundedString(value.nodeId, MAX_NODE_ID_LENGTH),
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
    workspace: boundedString(value.workspace, MAX_WORKSPACE_ID_LENGTH) ?? 'all',
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

function cleanProjectGraphSettings(value: unknown): ProjectGraphViewSettings | undefined {
  if (!isRecord(value)) return undefined;
  const rawViewport = isRecord(value.viewport) ? value.viewport : undefined;
  const panX = rawViewport ? Number(rawViewport.panX) : Number.NaN;
  const panY = rawViewport ? Number(rawViewport.panY) : Number.NaN;
  const zoom = rawViewport ? Number(rawViewport.zoom) : Number.NaN;
  return {
    selectedRootPath: boundedString(value.selectedRootPath, MAX_PATH_LENGTH)?.replace(/\\/g, '/'),
    densityDepth: [4, 6, 8, 12].includes(Number(value.densityDepth)) ? Number(value.densityDepth) : 8,
    includeResources: value.includeResources === true,
    viewport: Number.isFinite(panX) && Number.isFinite(panY) && Number.isFinite(zoom)
      ? { panX, panY, zoom: Math.min(2.5, Math.max(0.15, zoom)) }
      : undefined,
  };
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

function cleanRecentEntry(value: unknown): RecentProjectEntry | undefined {
  if (!isRecord(value)) return undefined;
  const rootPath = boundedString(normalizeRootPath(typeof value.rootPath === 'string' ? value.rootPath : ''), MAX_PATH_LENGTH);
  const label = boundedString(typeof value.label === 'string' ? value.label.trim() : '', MAX_LABEL_LENGTH);
  if (!rootPath || !label) return undefined;
  return {
    rootPath,
    label,
    pinned: value.pinned === true,
    lastOpenedAt: typeof value.lastOpenedAt === 'number' && Number.isFinite(value.lastOpenedAt) ? value.lastOpenedAt : 0,
  };
}

export function readRecentProjects(): RecentProjectEntry[] {
  const raw = readJson<unknown>(RECENT_PROJECTS_KEY);
  if (!Array.isArray(raw)) return [];
  const deduped = new Map<string, RecentProjectEntry>();
  for (const item of raw.slice(0, MAX_RECENT_PROJECT_SCAN)) {
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
  const cleaned = entries.map(cleanRecentEntry).filter((entry): entry is RecentProjectEntry => !!entry).slice(0, MAX_RECENT_PROJECTS);
  writeJson(RECENT_PROJECTS_KEY, cleaned);
}

export function rememberRecentProject(rootPath: string, label: string): void {
  const normalized = boundedString(normalizeRootPath(rootPath), MAX_PATH_LENGTH);
  const cleanedLabel = boundedString(label.trim(), MAX_LABEL_LENGTH);
  if (!normalized || !cleanedLabel) return;
  const entries = readRecentProjects();
  const key = normalized.toLocaleLowerCase();
  const previous = entries.find((item) => item.rootPath.toLocaleLowerCase() === key);
  const next: RecentProjectEntry = {
    rootPath: normalized,
    label: cleanedLabel,
    pinned: previous?.pinned ?? false,
    lastOpenedAt: Date.now(),
  };
  writeRecentProjects([next, ...entries.filter((item) => item.rootPath.toLocaleLowerCase() !== key)]
    .sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.lastOpenedAt - left.lastOpenedAt));
}

export function toggleRecentProjectPinned(rootPath: string): void {
  const normalizedRoot = boundedString(normalizeRootPath(rootPath), MAX_PATH_LENGTH);
  if (!normalizedRoot) return;
  const normalized = normalizedRoot.toLocaleLowerCase();
  const entries = readRecentProjects().map((item) => item.rootPath.toLocaleLowerCase() === normalized
    ? { ...item, pinned: !item.pinned }
    : item);
  writeRecentProjects(entries.sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.lastOpenedAt - left.lastOpenedAt));
}

export function forgetRecentProject(rootPath: string): void {
  const normalizedRoot = boundedString(normalizeRootPath(rootPath), MAX_PATH_LENGTH);
  if (!normalizedRoot) return;
  const normalized = normalizedRoot.toLocaleLowerCase();
  writeRecentProjects(readRecentProjects().filter((item) => item.rootPath.toLocaleLowerCase() !== normalized));
}

export function readProjectSession(rootPath: string): ProjectSessionSnapshot | undefined {
  const value = readJson<unknown>(sessionKey(rootPath));
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.openFilePaths)) return undefined;
  return {
    version: 1,
    openFilePaths: cleanStringList(value.openFilePaths, MAX_OPEN_FILE_PATHS, MAX_PATH_LENGTH),
    activeFilePath: boundedString(value.activeFilePath, MAX_PATH_LENGTH),
    openSourcePaths: cleanStringList(value.openSourcePaths, MAX_OPEN_SOURCE_PATHS, MAX_PATH_LENGTH),
    activeSourcePath: boundedString(value.activeSourcePath, MAX_PATH_LENGTH),
    focusedNode: cleanNavigationLocation(value.focusedNode),
    explorerWorkspace: boundedString(value.explorerWorkspace, MAX_WORKSPACE_ID_LENGTH) ?? 'all',
    explorerFolderState: cleanFolderState(value.explorerFolderState),
    // Tool-specific sidebars are intentionally transient across restarts. Explorer/Search restore normally.
    sidebarView: value.sidebarView === 'search' ? 'search' : 'explorer',
    sidebarVisible: value.sidebarVisible !== false,
    searchSidebarQuery: typeof value.searchSidebarQuery === 'string' && value.searchSidebarQuery.length <= MAX_QUERY_LENGTH ? value.searchSidebarQuery : '',
    recentSearches: cleanStringList(value.recentSearches, MAX_RECENT_SEARCHES, MAX_QUERY_LENGTH),
    filters: cleanInspectorFilters(value.filters),
    recentlyClosedFilePaths: cleanStringList(value.recentlyClosedFilePaths, MAX_RECENTLY_CLOSED, MAX_PATH_LENGTH),
    navigationCurrent: cleanNavigationLocation(value.navigationCurrent),
    navigationPast: Array.isArray(value.navigationPast) ? value.navigationPast.map(cleanNavigationLocation).filter((item): item is PersistedNavigationLocation => !!item).slice(-MAX_NAVIGATION_ENTRIES) : [],
    navigationFuture: Array.isArray(value.navigationFuture) ? value.navigationFuture.map(cleanNavigationLocation).filter((item): item is PersistedNavigationLocation => !!item).slice(0, MAX_NAVIGATION_ENTRIES) : [],
    visualSelectedFilePaths: cleanStringList(value.visualSelectedFilePaths, MAX_VISUAL_SELECTED_PATHS, MAX_PATH_LENGTH),
    visualSettings: cleanVisualLayoutSettings(value.visualSettings),
    projectGraphSettings: cleanProjectGraphSettings(value.projectGraphSettings),
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
    openFilePaths: cleanStringList(session.openFilePaths, MAX_OPEN_FILE_PATHS, MAX_PATH_LENGTH),
    activeFilePath: boundedString(session.activeFilePath, MAX_PATH_LENGTH),
    openSourcePaths: cleanStringList(session.openSourcePaths, MAX_OPEN_SOURCE_PATHS, MAX_PATH_LENGTH),
    activeSourcePath: boundedString(session.activeSourcePath, MAX_PATH_LENGTH),
    focusedNode: cleanNavigationLocation(session.focusedNode),
    explorerWorkspace: boundedString(session.explorerWorkspace, MAX_WORKSPACE_ID_LENGTH) ?? 'all',
    explorerFolderState: cleanFolderState(session.explorerFolderState),
    sidebarView: session.sidebarView === 'search' ? 'search' : 'explorer',
    sidebarVisible: session.sidebarVisible,
    searchSidebarQuery: typeof session.searchSidebarQuery === 'string' && session.searchSidebarQuery.length <= MAX_QUERY_LENGTH ? session.searchSidebarQuery : '',
    recentSearches: cleanStringList(session.recentSearches, MAX_RECENT_SEARCHES, MAX_QUERY_LENGTH),
    filters: cleanInspectorFilters(session.filters),
    recentlyClosedFilePaths: cleanStringList(session.recentlyClosedFilePaths, MAX_RECENTLY_CLOSED, MAX_PATH_LENGTH),
    navigationCurrent: cleanNavigationLocation(session.navigationCurrent),
    navigationPast: session.navigationPast.map(cleanNavigationLocation).filter((item): item is PersistedNavigationLocation => !!item).slice(-MAX_NAVIGATION_ENTRIES),
    navigationFuture: session.navigationFuture.map(cleanNavigationLocation).filter((item): item is PersistedNavigationLocation => !!item).slice(0, MAX_NAVIGATION_ENTRIES),
    visualSelectedFilePaths: cleanStringList(session.visualSelectedFilePaths, MAX_VISUAL_SELECTED_PATHS, MAX_PATH_LENGTH),
    visualSettings: cleanVisualLayoutSettings(session.visualSettings),
    projectGraphSettings: cleanProjectGraphSettings(session.projectGraphSettings),
  });
}
