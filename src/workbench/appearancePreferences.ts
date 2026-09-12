export const WORKBENCH_APPEARANCE_STORAGE_KEY = 'hytale-workbench.appearance.v1';
export const WORKBENCH_UI_SCALE_DEFAULT = 1;
export const WORKBENCH_UI_SCALE_STEPS = [0.8, 0.9, 1, 1.1, 1.25] as const;

export type WorkbenchUiScale = typeof WORKBENCH_UI_SCALE_STEPS[number];

export interface WorkbenchAppearancePreferences {
  version: 1;
  uiScale: WorkbenchUiScale;
}

declare global {
  interface Window {
    __HYTALE_UI_SCALE__?: {
      setZoom: (scaleFactor: number) => Promise<void>;
    };
  }
}

const defaults = (): WorkbenchAppearancePreferences => ({
  version: 1,
  uiScale: WORKBENCH_UI_SCALE_DEFAULT,
});

export function normalizeWorkbenchUiScale(value: unknown): WorkbenchUiScale {
  if (typeof value !== 'number' || !Number.isFinite(value)) return WORKBENCH_UI_SCALE_DEFAULT;
  const exact = WORKBENCH_UI_SCALE_STEPS.find((candidate) => Math.abs(candidate - value) < 0.0001);
  return exact ?? WORKBENCH_UI_SCALE_DEFAULT;
}

export function readWorkbenchAppearancePreferences(): WorkbenchAppearancePreferences {
  if (typeof window === 'undefined') return defaults();
  try {
    const raw = window.localStorage.getItem(WORKBENCH_APPEARANCE_STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as Partial<WorkbenchAppearancePreferences>;
    return {
      version: 1,
      uiScale: normalizeWorkbenchUiScale(parsed.uiScale),
    };
  } catch {
    return defaults();
  }
}

export function persistWorkbenchAppearancePreferences(uiScale: WorkbenchUiScale): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(WORKBENCH_APPEARANCE_STORAGE_KEY, JSON.stringify({ version: 1, uiScale } satisfies WorkbenchAppearancePreferences));
    return true;
  } catch {
    return false;
  }
}

export function resetWorkbenchAppearancePreferences(): WorkbenchAppearancePreferences {
  const next = defaults();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(WORKBENCH_APPEARANCE_STORAGE_KEY);
    } catch {
      // The in-memory default still applies when storage is unavailable.
    }
  }
  return next;
}

export async function applyWorkbenchUiScale(uiScale: WorkbenchUiScale): Promise<'native' | 'css' | 'css-fallback'> {
  if (typeof document === 'undefined') return 'css';
  document.documentElement.dataset.uiScale = String(Math.round(uiScale * 100));

  if (typeof window !== 'undefined' && window.__HYTALE_UI_SCALE__) {
    try {
      await window.__HYTALE_UI_SCALE__.setZoom(uiScale);
      document.documentElement.style.removeProperty('zoom');
      return 'native';
    } catch {
      document.documentElement.style.zoom = String(uiScale);
      return 'css-fallback';
    }
  }

  document.documentElement.style.zoom = String(uiScale);
  return 'css';
}

export function stepWorkbenchUiScale(current: WorkbenchUiScale, direction: -1 | 1): WorkbenchUiScale {
  const currentIndex = Math.max(0, WORKBENCH_UI_SCALE_STEPS.indexOf(current));
  const nextIndex = Math.max(0, Math.min(WORKBENCH_UI_SCALE_STEPS.length - 1, currentIndex + direction));
  return WORKBENCH_UI_SCALE_STEPS[nextIndex];
}

export function formatWorkbenchUiScale(uiScale: WorkbenchUiScale): string {
  return `${Math.round(uiScale * 100)}%`;
}
