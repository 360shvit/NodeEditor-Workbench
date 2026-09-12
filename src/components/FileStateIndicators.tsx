import type { FileUiState } from '../features/fileState';
import { fileUiStateTooltip } from '../features/fileState';
import { LucideIcon } from './LucideIcon';

export function FileStateIndicators({ state, compact = false }: { state: FileUiState; compact?: boolean }) {
  const tooltip = fileUiStateTooltip(state).join('\n');
  if (!tooltip) return null;
  return (
    <span className={`file-state-indicators ${compact ? 'compact' : ''}`} data-tooltip={tooltip} aria-label={tooltip}>
      {state.stagedCount > 0 && <span className="file-state-marker staged" data-state="staged"><LucideIcon name="dot" size={compact ? 12 : 14} strokeWidth={6} />{!compact && state.stagedCount > 1 && <small>{state.stagedCount}</small>}</span>}
      {state.diagnosticCount > 0 && <span className={`file-state-marker diagnostic ${state.diagnosticSeverity ?? 'info'}`} data-state="diagnostic"><LucideIcon name="triangle-alert" size={compact ? 11 : 12} />{!compact && <small>{state.diagnosticCount}</small>}</span>}
      {state.externalConflict && <span className="file-state-marker conflict" data-state="external-conflict"><LucideIcon name="circle-x" size={compact ? 11 : 12} /></span>}
      {!state.externalConflict && state.externallyReloaded && <span className="file-state-marker external" data-state="external-reload"><LucideIcon name="rotate-ccw" size={compact ? 11 : 12} /></span>}
    </span>
  );
}
