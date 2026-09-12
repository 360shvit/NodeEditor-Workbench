import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ProjectExplorer } from './ProjectExplorer';
import { useModalFocusTrap } from '../workbench/modalFocus';

export function ExplorerSelectionDialog({
  open,
  title,
  subtitle,
  explorerTitle,
  explorerSubtitle,
  committedFileIds,
  eligibleFileIds,
  eligibleLabel = 'eligible',
  purpose = 'this selection',
  sectionLabel,
  confirmLabel = 'Use selected files',
  onCancel,
  onCommit,
  renderSummary,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  explorerTitle?: string;
  explorerSubtitle?: string;
  committedFileIds: string[];
  eligibleFileIds: string[];
  eligibleLabel?: string;
  purpose?: string;
  sectionLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onCommit: (fileIds: string[]) => void;
  renderSummary?: (selectedFileIds: string[]) => ReactNode;
}) {
  const eligibleKey = eligibleFileIds.join('\u0000');
  const committedKey = committedFileIds.join('\u0000');
  const eligibleSet = useMemo(() => new Set(eligibleFileIds), [eligibleKey]);
  const [draftSelectedFileIds, setDraftSelectedFileIds] = useState<string[]>([]);
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  useModalFocusTrap({ containerRef: dialogRef, initialFocusRef: cancelButtonRef, onEscape: onCancel, enabled: open });

  useEffect(() => {
    if (!open) return;
    setDraftSelectedFileIds(committedFileIds.filter((id) => eligibleSet.has(id)));
  }, [open, committedKey, eligibleKey]);

  if (!open) return null;

  const commit = () => onCommit(draftSelectedFileIds.filter((id) => eligibleSet.has(id)));

  return (
    <div className="modal-backdrop explorer-selection-dialog-backdrop visual-file-picker-backdrop" role="presentation">
      <section ref={dialogRef} className="explorer-selection-dialog visual-file-picker" role="dialog" aria-modal="true" aria-labelledby="explorer-selection-title" tabIndex={-1}>
        <header>
          <div><strong id="explorer-selection-title">{title}</strong>{subtitle && <small>{subtitle}</small>}</div>
          <button ref={cancelButtonRef} onClick={onCancel} aria-label={`Close ${title}`}>×</button>
        </header>
        <div className="explorer-selection-dialog-explorer visual-file-picker-explorer">
          <ProjectExplorer
            selectionMode={{
              selectedFileIds: draftSelectedFileIds,
              eligibleFileIds,
              onSelectionChange: setDraftSelectedFileIds,
              title: explorerTitle ?? title,
              subtitle: explorerSubtitle,
              eligibleLabel,
              purpose,
              sectionLabel,
            }}
          />
        </div>
        <footer>
          <span>{renderSummary ? renderSummary(draftSelectedFileIds) : <><strong>{draftSelectedFileIds.length}</strong> files selected</>}</span>
          <div>
            <button onClick={onCancel}>Cancel</button>
            <button className="primary" onClick={commit}>{confirmLabel}</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
