import { useEffect, useMemo, useState } from 'react';
import {
  WORKBENCH_COMMANDS,
  commandLabel,
  commandShortcutConflicts,
  effectiveShortcut,
  hotkeyAssignmentConflict,
  loadHotkeyPreferences,
  resetHotkeyPreferences,
  setHotkeyOverride,
  shortcutFromKeyboardEvent,
  type HotkeyPreferences,
  type WorkbenchCommandId,
} from '../commands/commandRegistry';
import { recordRuntimeEvent } from '../support/runtimeDiagnostics';

export function HotkeySettings() {
  const [preferences, setPreferences] = useState<HotkeyPreferences>(() => loadHotkeyPreferences());
  const [capturing, setCapturing] = useState<WorkbenchCommandId>();
  const [status, setStatus] = useState<string>();
  const conflicts = useMemo(() => commandShortcutConflicts(preferences), [preferences]);

  useEffect(() => {
    if (!capturing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (event.key === 'Escape') {
        setCapturing(undefined);
        setStatus('Shortcut capture cancelled.');
        return;
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        const next = setHotkeyOverride(capturing, null, preferences);
        setPreferences(next);
        setCapturing(undefined);
        setStatus(`${commandLabel(capturing)} is now unassigned.`);
        recordRuntimeEvent('workbench.hotkeys.changed', { data: { command: capturing, assigned: false } });
        return;
      }
      const shortcut = shortcutFromKeyboardEvent(event);
      if (!shortcut) {
        setStatus('Use Ctrl/Cmd or Alt with a key, or use F1–F12. Esc cancels.');
        return;
      }
      const conflict = hotkeyAssignmentConflict(capturing, shortcut, preferences);
      if (conflict) {
        setStatus(`${shortcut} is already used by ${conflict.label}.`);
        return;
      }
      const next = setHotkeyOverride(capturing, shortcut, preferences);
      setPreferences(next);
      setCapturing(undefined);
      setStatus(`${commandLabel(capturing)} → ${shortcut}`);
      recordRuntimeEvent('workbench.hotkeys.changed', { data: { command: capturing, assigned: true, shortcut } });
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [capturing, preferences]);

  const resetOne = (id: WorkbenchCommandId) => {
    const next = setHotkeyOverride(id, undefined, preferences);
    setPreferences(next);
    setStatus(`${commandLabel(id)} reset to default.`);
    recordRuntimeEvent('workbench.hotkeys.reset', { data: { command: id } });
  };

  const unassign = (id: WorkbenchCommandId) => {
    const next = setHotkeyOverride(id, null, preferences);
    setPreferences(next);
    setStatus(`${commandLabel(id)} is now unassigned.`);
    recordRuntimeEvent('workbench.hotkeys.changed', { data: { command: id, assigned: false } });
  };

  const resetAll = () => {
    const next = resetHotkeyPreferences();
    setPreferences(next);
    setCapturing(undefined);
    setStatus('All shortcuts reset to defaults.');
    recordRuntimeEvent('workbench.hotkeys.reset-all');
  };

  return (
    <section className="settings-section hotkey-settings">
      <div className="settings-section-title hotkey-settings-title">
        <span>Keyboard shortcuts</span>
        <button onClick={resetAll} disabled={!Object.keys(preferences.overrides).length}>Reset all</button>
      </div>
      <div className="hotkey-settings-intro">
        <small>Global Workbench commands only. Component-local keys such as dialog Escape, Search Enter and splitter arrows keep their local behavior.</small>
      </div>
      <div className="hotkey-list">
        {WORKBENCH_COMMANDS.map((command) => {
          const effective = effectiveShortcut(command.id, preferences);
          const overridden = Object.prototype.hasOwnProperty.call(preferences.overrides, command.id);
          const isCapturing = capturing === command.id;
          return (
            <div className={`hotkey-row ${isCapturing ? 'capturing' : ''}`} key={command.id}>
              <div className="hotkey-command-copy">
                <strong>{command.label}</strong>
                <small>{overridden ? `Default: ${command.shortcut ?? 'Unassigned'}` : 'Using default'}</small>
              </div>
              <kbd>{isCapturing ? 'Press shortcut…' : effective ?? 'Unassigned'}</kbd>
              <div className="hotkey-actions">
                <button className={isCapturing ? 'active' : ''} onClick={() => { setStatus(undefined); setCapturing(isCapturing ? undefined : command.id); }}>
                  {isCapturing ? 'Cancel' : 'Record'}
                </button>
                <button onClick={() => unassign(command.id)} disabled={!effective}>Unassign</button>
                <button onClick={() => resetOne(command.id)} disabled={!overridden}>Reset</button>
              </div>
            </div>
          );
        })}
      </div>
      {conflicts.length > 0 && <div className="hotkey-conflict" role="alert">Shortcut conflict: {conflicts.map((conflict) => `${conflict.shortcut} (${conflict.commands.map(commandLabel).join(', ')})`).join(' · ')}</div>}
      {status && <small className="hotkey-status" role="status">{status}</small>}
    </section>
  );
}
