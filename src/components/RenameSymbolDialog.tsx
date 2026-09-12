import { useMemo, useRef, useState } from 'react';
import { renameSymbol, symbolKey, type ProjectField, type ProjectNode } from '../core';
import { useWorkbenchStore } from '../store';
import { LucideIcon } from './LucideIcon';
import { useModalFocusTrap } from '../workbench/modalFocus';

export interface RenameRequest {
  node: ProjectNode;
  field: ProjectField;
  newName: string;
}

export function RenameSymbolDialog({ request, onClose }: { request: RenameRequest; onClose: () => void }) {
  const project = useWorkbenchStore((state) => state.project)!;
  const changeSet = useWorkbenchStore((state) => state.changeSet);
  const setChangeSet = useWorkbenchStore((state) => state.setChangeSet);
  const { node, field, newName } = request;
  const oldName = String(field.value);
  const symbolType = field.symbolType!;
  const record = project.symbolIndex.get(symbolKey(symbolType, oldName));
  const liveDefinitions = record?.definitions.filter((item) => item.location === 'live').length ?? 0;
  const floatingDefinitions = record?.definitions.filter((item) => item.location === 'floating').length ?? 0;
  const liveReferences = record?.references.filter((item) => item.location === 'live').length ?? 0;
  const floatingReferences = record?.references.filter((item) => item.location === 'floating').length ?? 0;
  const [includeDefinition, setIncludeDefinition] = useState(true);
  const [includeLive, setIncludeLive] = useState(node.location === 'live' || liveReferences > 0);
  const [includeFloating, setIncludeFloating] = useState(node.location === 'floating');
  const [includeReferences, setIncludeReferences] = useState(true);
  const dialogRef = useRef<HTMLElement>(null);
  const firstOptionRef = useRef<HTMLInputElement>(null);
  useModalFocusTrap({ containerRef: dialogRef, initialFocusRef: firstOptionRef, onEscape: onClose });

  const stagedCount = useMemo(() => {
    let count = 0;
    if (includeDefinition) count += includeLive ? liveDefinitions : 0;
    if (includeDefinition) count += includeFloating ? floatingDefinitions : 0;
    if (includeReferences) count += includeLive ? liveReferences : 0;
    if (includeReferences) count += includeFloating ? floatingReferences : 0;
    return count;
  }, [includeDefinition, includeReferences, includeLive, includeFloating, liveDefinitions, floatingDefinitions, liveReferences, floatingReferences]);

  const apply = () => {
    const next = renameSymbol(project, changeSet, symbolType, oldName, newName, {
      includeDefinition,
      includeReferences,
      includeLive,
      includeFloating,
    });
    setChangeSet(next);
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section ref={dialogRef} className="rename-modal" role="dialog" aria-modal="true" aria-labelledby="rename-symbol-title" aria-describedby="rename-symbol-description" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><h3 id="rename-symbol-title">Rename {symbolType} symbol</h3><small id="rename-symbol-description">Choose exactly which symbol occurrences are staged.</small></div>
          <button onClick={onClose} aria-label="Close rename dialog"><LucideIcon name="x" size={15} /></button>
        </header>
        <div className="rename-values"><code>{oldName}</code><span>→</span><code>{newName}</code></div>
        <div className="rename-options">
          <label><input ref={firstOptionRef} type="checkbox" checked={includeDefinition} onChange={(event) => setIncludeDefinition(event.target.checked)} /> Definition(s) <small>{liveDefinitions} live · {floatingDefinitions} floating</small></label>
          <label><input type="checkbox" checked={includeReferences} onChange={(event) => setIncludeReferences(event.target.checked)} /> References <small>{liveReferences} live · {floatingReferences} floating</small></label>
          <div className="rename-location-options">
            <label><input type="checkbox" checked={includeLive} onChange={(event) => setIncludeLive(event.target.checked)} /> Live</label>
            <label><input type="checkbox" checked={includeFloating} onChange={(event) => setIncludeFloating(event.target.checked)} /> Floating</label>
          </div>
        </div>
        <footer>
          <span>{stagedCount} occurrence(s) will be staged. Seeds and unrelated literals are never propagated.</span>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" disabled={stagedCount === 0 || oldName === newName} onClick={apply}>Stage rename</button>
        </footer>
      </section>
    </div>
  );
}
