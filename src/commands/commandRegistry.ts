export type WorkbenchCommandId =
  | 'quickOpen'
  | 'showExplorer'
  | 'showSearch'
  | 'openDiagnostics'
  | 'openChanges'
  | 'openLayout'
  | 'openWorldgenPerformance'
  | 'openProjectGraph'
  | 'navigateBack'
  | 'navigateForward'
  | 'reopenClosedTab';

export interface WorkbenchCommandDefinition {
  id: WorkbenchCommandId;
  label: string;
  shortcut?: string;
  allowInEditable?: boolean;
}

export interface HotkeyPreferences {
  version: 1;
  overrides: Partial<Record<WorkbenchCommandId, string | null>>;
}

export const HOTKEY_PREFERENCES_KEY = 'hytale-workbench.hotkeys.v1';
export const HOTKEY_PREFERENCES_VERSION = 1;
export const HOTKEY_PREFERENCES_CHANGED_EVENT = 'hytale-workbench-hotkeys-changed';

export const WORKBENCH_COMMANDS: WorkbenchCommandDefinition[] = [
  { id: 'quickOpen', label: 'Quick Open', shortcut: 'Mod+P', allowInEditable: true },
  { id: 'showExplorer', label: 'Show Explorer', shortcut: 'Mod+Shift+E' },
  { id: 'showSearch', label: 'Show Search', shortcut: 'Mod+Shift+F' },
  { id: 'openDiagnostics', label: 'Open Diagnostics', shortcut: 'Mod+Shift+D' },
  { id: 'openChanges', label: 'Open Changes', shortcut: 'Mod+Shift+G' },
  { id: 'openLayout', label: 'Open Layout' },
  { id: 'openWorldgenPerformance', label: 'Open WorldGen Performance' },
  { id: 'openProjectGraph', label: 'Open Project Graph' },
  { id: 'navigateBack', label: 'Go Back', shortcut: 'Alt+ArrowLeft', allowInEditable: true },
  { id: 'navigateForward', label: 'Go Forward', shortcut: 'Alt+ArrowRight', allowInEditable: true },
  { id: 'reopenClosedTab', label: 'Reopen Closed Editor', shortcut: 'Mod+Shift+T' },
];

const COMMAND_IDS = new Set<WorkbenchCommandId>(WORKBENCH_COMMANDS.map((command) => command.id));
const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'OS']);

function storageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function normalizeStoredPreferences(value: unknown): HotkeyPreferences {
  const fallback: HotkeyPreferences = { version: HOTKEY_PREFERENCES_VERSION, overrides: {} };
  if (!value || typeof value !== 'object') return fallback;
  const candidate = value as { version?: unknown; overrides?: unknown };
  if (candidate.version !== HOTKEY_PREFERENCES_VERSION || !candidate.overrides || typeof candidate.overrides !== 'object') return fallback;
  const overrides: Partial<Record<WorkbenchCommandId, string | null>> = {};
  for (const [id, shortcut] of Object.entries(candidate.overrides)) {
    if (!COMMAND_IDS.has(id as WorkbenchCommandId)) continue;
    if (shortcut === null || (typeof shortcut === 'string' && shortcut.trim())) overrides[id as WorkbenchCommandId] = shortcut;
  }
  return { version: HOTKEY_PREFERENCES_VERSION, overrides };
}

export function loadHotkeyPreferences(): HotkeyPreferences {
  if (!storageAvailable()) return { version: HOTKEY_PREFERENCES_VERSION, overrides: {} };
  try {
    const raw = window.localStorage.getItem(HOTKEY_PREFERENCES_KEY);
    return raw ? normalizeStoredPreferences(JSON.parse(raw)) : { version: HOTKEY_PREFERENCES_VERSION, overrides: {} };
  } catch {
    return { version: HOTKEY_PREFERENCES_VERSION, overrides: {} };
  }
}

export function saveHotkeyPreferences(preferences: HotkeyPreferences): HotkeyPreferences {
  const normalized = normalizeStoredPreferences(preferences);
  if (storageAvailable()) {
    try {
      if (Object.keys(normalized.overrides).length) window.localStorage.setItem(HOTKEY_PREFERENCES_KEY, JSON.stringify(normalized));
      else window.localStorage.removeItem(HOTKEY_PREFERENCES_KEY);
    } catch {
      // Preference persistence is best effort. Runtime shortcuts continue to use defaults if storage is unavailable.
    }
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HOTKEY_PREFERENCES_CHANGED_EVENT));
  return normalized;
}

export function resetHotkeyPreferences(): HotkeyPreferences {
  return saveHotkeyPreferences({ version: HOTKEY_PREFERENCES_VERSION, overrides: {} });
}

export function setHotkeyOverride(id: WorkbenchCommandId, shortcut: string | null | undefined, current = loadHotkeyPreferences()): HotkeyPreferences {
  const overrides = { ...current.overrides };
  if (shortcut === undefined) delete overrides[id];
  else overrides[id] = shortcut;
  return saveHotkeyPreferences({ version: HOTKEY_PREFERENCES_VERSION, overrides });
}

export function effectiveShortcut(id: WorkbenchCommandId, preferences = loadHotkeyPreferences()): string | undefined {
  if (Object.prototype.hasOwnProperty.call(preferences.overrides, id)) return preferences.overrides[id] ?? undefined;
  return WORKBENCH_COMMANDS.find((command) => command.id === id)?.shortcut;
}

export function effectiveCommands(preferences = loadHotkeyPreferences()): WorkbenchCommandDefinition[] {
  return WORKBENCH_COMMANDS.map((command) => ({ ...command, shortcut: effectiveShortcut(command.id, preferences) }));
}

export function commandShortcutConflicts(preferences = loadHotkeyPreferences()): Array<{ shortcut: string; commands: WorkbenchCommandId[] }> {
  const byShortcut = new Map<string, WorkbenchCommandId[]>();
  for (const command of effectiveCommands(preferences)) {
    if (!command.shortcut) continue;
    const key = command.shortcut.toLowerCase();
    byShortcut.set(key, [...(byShortcut.get(key) ?? []), command.id]);
  }
  return [...byShortcut.entries()].filter(([, commands]) => commands.length > 1).map(([shortcut, commands]) => ({ shortcut, commands }));
}

export function hotkeyAssignmentConflict(id: WorkbenchCommandId, shortcut: string, preferences = loadHotkeyPreferences()): WorkbenchCommandDefinition | undefined {
  const normalized = shortcut.toLowerCase();
  return effectiveCommands(preferences).find((command) => command.id !== id && command.shortcut?.toLowerCase() === normalized);
}

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target instanceof HTMLElement ? target : undefined;
  return !!element && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName));
}

function shortcutMatches(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split('+');
  const mod = parts.includes('Mod');
  const shift = parts.includes('Shift');
  const alt = parts.includes('Alt');
  const key = parts.at(-1)!;
  if (mod !== (event.ctrlKey || event.metaKey)) return false;
  if (!mod && (event.ctrlKey || event.metaKey)) return false;
  if (shift !== event.shiftKey) return false;
  if (alt !== event.altKey) return false;
  return event.key.toLowerCase() === key.toLowerCase();
}

function displayKey(key: string): string {
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export function shortcutFromKeyboardEvent(event: KeyboardEvent): string | undefined {
  if (MODIFIER_KEYS.has(event.key)) return undefined;
  const key = displayKey(event.key);
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('Mod');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (!parts.length && !/^F(?:[1-9]|1[0-2])$/i.test(key)) return undefined;
  parts.push(key);
  return parts.join('+');
}

export function commandForKeyboardEvent(event: KeyboardEvent, preferences = loadHotkeyPreferences()): WorkbenchCommandDefinition | undefined {
  const editable = isEditableTarget(event.target);
  return effectiveCommands(preferences).find((command) => command.shortcut
    && (command.allowInEditable || !editable)
    && shortcutMatches(event, command.shortcut));
}

export function commandLabel(id: WorkbenchCommandId): string {
  return WORKBENCH_COMMANDS.find((command) => command.id === id)?.label ?? id;
}
