import { useEffect, useMemo, useRef, useState } from 'react';
import { searchProject, type ProjectSearchResult } from '../core';
import { WORKBENCH_COMMANDS, effectiveShortcut, type WorkbenchCommandId } from '../commands/commandRegistry';
import {
  EXPLORER_SCOPE_INVENTORY_ONLY,
  EXPLORER_SCOPE_RECOGNIZED,
  EXPLORER_SCOPE_RESOURCES,
  EXPLORER_SCOPE_WORKBENCH_KNOWN,
} from '../projectFiles/loadPolicy';
import { useWorkbenchStore } from '../store';
import { measurePerformanceSync } from '../support/performanceTracing';
import { LucideIcon } from './LucideIcon';
import { useModalFocusTrap } from '../workbench/modalFocus';

type QuickItem =
  | { id: string; kind: 'result'; label: string; detail: string; result: ProjectSearchResult }
  | { id: string; kind: 'workspace'; label: string; detail: string; workspaceId: string }
  | { id: string; kind: 'command'; label: string; detail: string; commandId: WorkbenchCommandId };

function resultScore(result: ProjectSearchResult, query: string): number {
  const q = query.toLowerCase();
  const title = result.title.toLowerCase();
  let score = result.kind === 'file' ? 400 : result.kind === 'resource' ? 350 : result.kind === 'symbol' ? 320 : result.kind === 'node' ? 180 : 100;
  if (title === q) score += 500;
  else if (title.startsWith(q)) score += 240;
  else if (title.includes(q)) score += 80;
  return score;
}

export function QuickOpen({ onClose, executeCommand }: { onClose: () => void; executeCommand: (id: WorkbenchCommandId) => void }) {
  const project = useWorkbenchStore((state) => state.project);
  const selectFile = useWorkbenchStore((state) => state.selectFile);
  const focusNode = useWorkbenchStore((state) => state.focusNode);
  const setExplorerWorkspace = useWorkbenchStore((state) => state.setExplorerWorkspace);
  const openResourceReferenceTab = useWorkbenchStore((state) => state.openResourceReferenceTab);
  const activateSidebar = useWorkbenchStore((state) => state.activateSidebar);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useModalFocusTrap({ containerRef: dialogRef, initialFocusRef: inputRef, onEscape: onClose });

  const items = useMemo<QuickItem[]>(() => {
    if (!project) return [];
    const trimmed = query.trim();
    if (trimmed.startsWith('>')) {
      const needle = trimmed.slice(1).trim().toLowerCase();
      return WORKBENCH_COMMANDS.filter((command) => !needle || command.label.toLowerCase().includes(needle)).map((command) => ({
        id: `command:${command.id}`, kind: 'command', label: command.label, detail: effectiveShortcut(command.id) ?? 'Unassigned', commandId: command.id,
      }));
    }
    const direct = trimmed ? measurePerformanceSync('quick-open.search', () => searchProject(project, trimmed, 80)
      .filter((result) => !!result.fileId || result.kind === 'resource')
      .sort((a, b) => resultScore(b, trimmed) - resultScore(a, trimmed) || a.title.localeCompare(b.title))
      .slice(0, 12)
      .map((result) => ({ id: `result:${result.id}`, kind: 'result' as const, label: result.title, detail: result.subtitle, result })), {
        aggregateOnly: true,
        data: { queryLength: trimmed.length, projectFiles: project.files.length, inventoryFiles: project.inventoryPaths.length },
      }) : [];
    const workspaceNeedle = trimmed.toLowerCase();
    const systemScopes = [
      { id: EXPLORER_SCOPE_WORKBENCH_KNOWN, label: 'Workbench known' },
      { id: EXPLORER_SCOPE_RECOGNIZED, label: 'Recognized files · semantic' },
      { id: EXPLORER_SCOPE_RESOURCES, label: 'Known resources' },
      { id: EXPLORER_SCOPE_INVENTORY_ONLY, label: 'Inventory only · load state' },
    ]
      .filter((scope) => !trimmed || scope.label.toLowerCase().includes(workspaceNeedle))
      .map((scope) => ({ id: `workspace:${scope.id}`, kind: 'workspace' as const, label: scope.label, detail: 'Workbench scope', workspaceId: scope.id }));
    const workspaces = project.workspaces
      .filter((workspace) => !trimmed || workspace.label.toLowerCase().includes(workspaceNeedle))
      .slice(0, 5)
      .map((workspace) => ({ id: `workspace:${workspace.id}`, kind: 'workspace' as const, label: workspace.label, detail: 'Workspace', workspaceId: workspace.id }));
    return [...direct, ...systemScopes, ...workspaces];
  }, [project, query]);

  useEffect(() => { setSelected(0); }, [query]);

  const openItem = (item: QuickItem | undefined) => {
    if (!item) return;
    if (item.kind === 'command') executeCommand(item.commandId);
    else if (item.kind === 'workspace') {
      setExplorerWorkspace(item.workspaceId);
      activateSidebar('explorer');
    } else if (item.result.kind === 'resource' && item.result.resourceKind && item.result.resourceName) {
      openResourceReferenceTab(item.result.resourceKind, item.result.resourceName, item.result.resourcePath);
    } else if (item.result.fileId) {
      if (item.result.nodeId && item.result.location) focusNode(item.result.fileId, item.result.nodeId, item.result.location);
      else selectFile(item.result.fileId);
    }
    onClose();
  };

  return (
    <div className="quick-open-backdrop" onMouseDown={onClose}>
      <section ref={dialogRef} className="quick-open" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="quick-open-title" tabIndex={-1}>
        <h2 id="quick-open-title" className="sr-only">Quick Open</h2>
        <div className="quick-open-input-row"><LucideIcon name="search" size={17} /><input ref={inputRef} role="combobox" aria-expanded="true" aria-controls="quick-open-results" aria-activedescendant={items[selected] ? `quick-open-item-${selected}` : undefined} aria-autocomplete="list" value={query} placeholder="Quick Open files, symbols, workspaces…  > commands" onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && items.length) { event.preventDefault(); setSelected((value) => Math.min(items.length - 1, value + 1)); }
          else if (event.key === 'ArrowUp' && items.length) { event.preventDefault(); setSelected((value) => Math.max(0, value - 1)); }
          else if (event.key === 'Enter') { event.preventDefault(); openItem(items[selected]); }
        }} /></div>
        <div id="quick-open-results" className="quick-open-results" role="listbox" aria-label="Quick Open results">
          {items.map((item, index) => <button id={`quick-open-item-${index}`} role="option" aria-selected={index === selected} tabIndex={-1} key={item.id} className={index === selected ? 'active' : ''} onMouseEnter={() => setSelected(index)} onClick={() => openItem(item)}>
            <span><strong>{item.label}</strong><small>{item.detail}</small></span><em>{item.kind === 'result' ? item.result.kind : item.kind}</em>
          </button>)}
          {!items.length && <div className="quick-open-empty">Type a file, symbol or workspace name. Prefix with <code>&gt;</code> for Workbench commands.</div>}
        </div>
      </section>
    </div>
  );
}
