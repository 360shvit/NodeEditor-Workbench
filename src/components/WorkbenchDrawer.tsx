import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LucideIcon } from './LucideIcon';
import { useWorkbenchPaneId } from '../workbench/WorkbenchPaneContext';

export function WorkbenchDrawer({
  title,
  subtitle,
  onClose,
  ariaLabel,
  className = '',
  footer,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  ariaLabel: string;
  className?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const paneId = useWorkbenchPaneId();
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHost(document.querySelector<HTMLElement>(`[data-workbench-drawer-host="${paneId}"]`));
  }, [paneId]);

  if (!host) return null;

  return createPortal(
    <aside className={`workbench-drawer reference-drawer ${className}`.trim()} aria-label={ariaLabel}>
      <div className="drawer-header workbench-drawer-header">
        <div><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</div>
        <button onClick={onClose} aria-label={`Close ${ariaLabel}`}><LucideIcon name="x" size={15} /></button>
      </div>
      <div className="workbench-drawer-body">{children}</div>
      {footer && <div className="drawer-footer workbench-drawer-footer">{footer}</div>}
    </aside>,
    host,
  );
}
