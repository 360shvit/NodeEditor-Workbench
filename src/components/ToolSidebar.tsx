import type { ReactNode } from 'react';

export function ToolSidebar({
  title,
  subtitle,
  ariaLabel,
  className = '',
  bodyClassName = '',
  children,
}: {
  title: string;
  subtitle: string;
  ariaLabel: string;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <aside className={`tool-sidebar ${className}`.trim()} aria-label={ariaLabel}>
      <div className="sidebar-view-header tool-sidebar-header">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </div>
      <div className={`tool-sidebar-body ${bodyClassName}`.trim()}>{children}</div>
    </aside>
  );
}
