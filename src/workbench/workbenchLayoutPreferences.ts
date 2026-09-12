export const WORKBENCH_LAYOUT_STORAGE_KEY = 'hytale-workbench.layout.v2';
export const WORKBENCH_LAYOUT_LEGACY_STORAGE_KEY = 'hytale-workbench.layout.v1';
export const WORKBENCH_LAYOUT_VERSION = 2;
export const WORKBENCH_SIDEBAR_DEFAULT_WIDTH = 292;
export const WORKBENCH_SIDEBAR_MIN_WIDTH = 220;
export const WORKBENCH_SIDEBAR_MAX_WIDTH = 520;
export const WORKBENCH_SIDEBAR_KEYBOARD_STEP = 16;
export const WORKBENCH_SPLIT_DEFAULT_RATIO = 0.5;
export const WORKBENCH_SPLIT_MIN_RATIO = 0.25;
export const WORKBENCH_SPLIT_MAX_RATIO = 0.75;
export const WORKBENCH_SPLIT_KEYBOARD_STEP = 0.05;

export interface WorkbenchLayoutPreferences {
  version: 2;
  sidebarWidth: number;
  splitRatio: number;
}

export interface WorkbenchLayoutSnapshot extends WorkbenchLayoutPreferences {
  persisted: boolean;
  defaultSidebarWidth: number;
  minSidebarWidth: number;
  maxSidebarWidth: number;
  defaultSplitRatio: number;
  minSplitRatio: number;
  maxSplitRatio: number;
}

function storageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export function clampWorkbenchSidebarWidth(value: number): number {
  const finite = Number.isFinite(value) ? value : WORKBENCH_SIDEBAR_DEFAULT_WIDTH;
  return Math.round(Math.min(WORKBENCH_SIDEBAR_MAX_WIDTH, Math.max(WORKBENCH_SIDEBAR_MIN_WIDTH, finite)));
}

export function clampWorkbenchSplitRatio(value: number): number {
  const finite = Number.isFinite(value) ? value : WORKBENCH_SPLIT_DEFAULT_RATIO;
  return Math.round(Math.min(WORKBENCH_SPLIT_MAX_RATIO, Math.max(WORKBENCH_SPLIT_MIN_RATIO, finite)) * 1000) / 1000;
}

function defaults(): WorkbenchLayoutPreferences {
  return {
    version: WORKBENCH_LAYOUT_VERSION,
    sidebarWidth: WORKBENCH_SIDEBAR_DEFAULT_WIDTH,
    splitRatio: WORKBENCH_SPLIT_DEFAULT_RATIO,
  };
}

export function readWorkbenchLayoutPreferences(): WorkbenchLayoutPreferences {
  if (!storageAvailable()) return defaults();
  try {
    const raw = window.localStorage.getItem(WORKBENCH_LAYOUT_STORAGE_KEY);
    if (raw) {
      const value = JSON.parse(raw) as Partial<WorkbenchLayoutPreferences>;
      if (value.version !== WORKBENCH_LAYOUT_VERSION
        || typeof value.sidebarWidth !== 'number' || !Number.isFinite(value.sidebarWidth)
        || typeof value.splitRatio !== 'number' || !Number.isFinite(value.splitRatio)) {
        window.localStorage.removeItem(WORKBENCH_LAYOUT_STORAGE_KEY);
        return defaults();
      }
      return {
        version: WORKBENCH_LAYOUT_VERSION,
        sidebarWidth: clampWorkbenchSidebarWidth(value.sidebarWidth),
        splitRatio: clampWorkbenchSplitRatio(value.splitRatio),
      };
    }

    // v0.11.14 migration: keep the user's committed sidebar width and add the new split default.
    const legacyRaw = window.localStorage.getItem(WORKBENCH_LAYOUT_LEGACY_STORAGE_KEY);
    if (!legacyRaw) return defaults();
    const legacy = JSON.parse(legacyRaw) as { version?: number; sidebarWidth?: number };
    if (legacy.version !== 1 || typeof legacy.sidebarWidth !== 'number' || !Number.isFinite(legacy.sidebarWidth)) {
      window.localStorage.removeItem(WORKBENCH_LAYOUT_LEGACY_STORAGE_KEY);
      return defaults();
    }
    const migrated: WorkbenchLayoutPreferences = {
      version: WORKBENCH_LAYOUT_VERSION,
      sidebarWidth: clampWorkbenchSidebarWidth(legacy.sidebarWidth),
      splitRatio: WORKBENCH_SPLIT_DEFAULT_RATIO,
    };
    window.localStorage.setItem(WORKBENCH_LAYOUT_STORAGE_KEY, JSON.stringify(migrated));
    window.localStorage.removeItem(WORKBENCH_LAYOUT_LEGACY_STORAGE_KEY);
    return migrated;
  } catch {
    try {
      window.localStorage.removeItem(WORKBENCH_LAYOUT_STORAGE_KEY);
      window.localStorage.removeItem(WORKBENCH_LAYOUT_LEGACY_STORAGE_KEY);
    } catch { /* optional preference */ }
    return defaults();
  }
}

export function persistWorkbenchLayoutPreferences(preferences: WorkbenchLayoutPreferences): boolean {
  if (!storageAvailable()) return false;
  try {
    window.localStorage.setItem(WORKBENCH_LAYOUT_STORAGE_KEY, JSON.stringify({
      version: WORKBENCH_LAYOUT_VERSION,
      sidebarWidth: clampWorkbenchSidebarWidth(preferences.sidebarWidth),
      splitRatio: clampWorkbenchSplitRatio(preferences.splitRatio),
    } satisfies WorkbenchLayoutPreferences));
    window.localStorage.removeItem(WORKBENCH_LAYOUT_LEGACY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function resetWorkbenchLayoutPreferences(): WorkbenchLayoutPreferences {
  if (storageAvailable()) {
    try {
      window.localStorage.removeItem(WORKBENCH_LAYOUT_STORAGE_KEY);
      window.localStorage.removeItem(WORKBENCH_LAYOUT_LEGACY_STORAGE_KEY);
    } catch { /* optional preference */ }
  }
  return defaults();
}

export function workbenchLayoutSnapshot(): WorkbenchLayoutSnapshot {
  const preferences = readWorkbenchLayoutPreferences();
  let persisted = false;
  if (storageAvailable()) {
    try { persisted = window.localStorage.getItem(WORKBENCH_LAYOUT_STORAGE_KEY) !== null; } catch { persisted = false; }
  }
  return {
    ...preferences,
    persisted,
    defaultSidebarWidth: WORKBENCH_SIDEBAR_DEFAULT_WIDTH,
    minSidebarWidth: WORKBENCH_SIDEBAR_MIN_WIDTH,
    maxSidebarWidth: WORKBENCH_SIDEBAR_MAX_WIDTH,
    defaultSplitRatio: WORKBENCH_SPLIT_DEFAULT_RATIO,
    minSplitRatio: WORKBENCH_SPLIT_MIN_RATIO,
    maxSplitRatio: WORKBENCH_SPLIT_MAX_RATIO,
  };
}
