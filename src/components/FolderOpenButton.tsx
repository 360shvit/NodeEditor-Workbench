import { useRef, useState } from 'react';
import { desktopRevokeRecentProject, hasDesktopBridge } from '../io/desktopBridge';
import { openDirectoryWorkspace, workspaceFromFolderSnapshot } from '../io/folderLoader';
import {
  forgetRecentProject,
  readRecentProjects,
  toggleRecentProjectPinned,
} from '../projects/projectPersistence';
import { useWorkbenchStore } from '../store';
import { useProjectLifecycle } from '../projects/ProjectLifecycleGuard';
import { LucideIcon } from './LucideIcon';
import { createRuntimeTraceId, recordRuntimeError, recordRuntimeEvent } from '../support/runtimeDiagnostics';

export function FolderOpenButton() {
  const setWorkspace = useWorkbenchStore((state) => state.setWorkspace);
  const { guardProjectAction, requestCloseProject } = useProjectLifecycle();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentRevision, setRecentRevision] = useState(0);
  const desktop = hasDesktopBridge();
  const recentProjects = desktop ? readRecentProjects() : [];
  void recentRevision;


  const removeRecent = async (rootPath: string) => {
    try {
      if (desktop) await desktopRevokeRecentProject(rootPath);
      forgetRecentProject(rootPath);
      setRecentRevision((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? `Could not revoke recent-project access: ${reason.message}` : String(reason));
    }
  };

  const openFolder = async (rootPath?: string) => {
    setError(undefined);
    setMenuOpen(false);
    try {
      await guardProjectAction('switch-project', async () => {
        setLoading(true);
        const started = performance.now();
        const traceId = createRuntimeTraceId('project-open');
        try {
          recordRuntimeEvent('project.open.requested', { traceId, data: { recent: !!rootPath } });
          const workspace = await openDirectoryWorkspace(rootPath, traceId);
          setWorkspace(workspace, traceId);
          recordRuntimeEvent('project.open.completed', { traceId, durationMs: performance.now() - started, data: { inventoryFiles: workspace.sourceEntries.size, semanticInputs: workspace.files.length, sourceKind: workspace.sourceKind } });
          setRecentRevision((value) => value + 1);
        } catch (reason) {
          recordRuntimeError('project.open.trace-failed', reason, { recent: !!rootPath }, traceId);
          throw reason;
        } finally {
          setLoading(false);
        }
      });
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      recordRuntimeError('project.open.failed', reason, { recent: !!rootPath });
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  return (
    <div className="folder-open">
      <div className="project-open-control">
        <button className="primary project-open-main" disabled={loading} onClick={() => void openFolder()}>{loading ? 'Loading…' : 'Open project'}</button>
        {desktop && (
          <button
            className={`project-open-menu-button ${menuOpen ? 'active' : ''}`}
            disabled={loading}
            onClick={() => setMenuOpen((value) => !value)}
            data-tooltip="Recent projects"
            aria-label="Recent projects"
            aria-expanded={menuOpen}
          ><LucideIcon name="chevron-down" size={15} /></button>
        )}
        {menuOpen && desktop && (
          <div className="recent-project-menu">
            <div className="recent-project-menu-header">
              <strong>Recent projects</strong>
              <small>Open Folder = Project</small>
            </div>
            {recentProjects.length ? recentProjects.map((project) => (
              <div className="recent-project-row" key={project.rootPath}>
                <button
                  className="recent-project-open"
                  disabled={loading}
                  onClick={() => void openFolder(project.rootPath)}
                  data-tooltip={project.rootPath}
                >
                  <span className="recent-project-name">{project.label}</span>
                  <small>{project.rootPath}</small>
                </button>
                <button
                  className={`recent-project-pin ${project.pinned ? 'active' : ''}`}
                  onClick={() => {
                    toggleRecentProjectPinned(project.rootPath);
                    setRecentRevision((value) => value + 1);
                  }}
                  data-tooltip={project.pinned ? 'Unpin project' : 'Pin project'}
                  aria-label={project.pinned ? 'Unpin project' : 'Pin project'}
                ><LucideIcon name={project.pinned ? 'pin-off' : 'pin'} size={15} /></button>
                <button
                  className="recent-project-remove"
                  onClick={() => void removeRecent(project.rootPath)}
                  data-tooltip="Remove from Recent"
                  aria-label={`Remove ${project.label} from Recent`}
                ><LucideIcon name="x" size={15} /></button>
              </div>
            )) : <div className="recent-project-empty">No recent projects yet.</div>}
            <div className="recent-project-menu-footer">
              <button disabled={loading} onClick={() => { setMenuOpen(false); void requestCloseProject(); }}>Close Project</button>
            </div>
          </div>
        )}
      </div>
      {!desktop && <button disabled={loading} onClick={() => inputRef.current?.click()} data-tooltip="Read a browser folder snapshot without write access">Open snapshot</button>}
      {!desktop && (
        <input
          ref={inputRef}
          className="hidden-input"
          type="file"
          multiple
          {...({ webkitdirectory: '' } as { webkitdirectory: string })}
          onChange={async (event) => {
            if (!event.target.files?.length) return;
            setError(undefined);
            setLoading(true);
            try {
              const files = event.target.files;
              await guardProjectAction('switch-project', async () => {
                const started = performance.now();
                const snapshot = await workspaceFromFolderSnapshot(files);
                setWorkspace(snapshot);
                recordRuntimeEvent('project.snapshot.open.completed', { durationMs: performance.now() - started, data: { inventoryFiles: snapshot.sourceEntries.size, semanticInputs: snapshot.files.length } });
              });
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : String(reason));
            } finally {
              setLoading(false);
              event.target.value = '';
            }
          }}
        />
      )}
      {error && <span className="error-text project-open-error" data-tooltip={error}>{error}</span>}
    </div>
  );
}
