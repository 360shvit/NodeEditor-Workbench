import { useState } from 'react';
import { APP_ICON_DATA_URI } from '../appIconData';
import { desktopRevokeRecentProject, hasDesktopBridge } from '../io/desktopBridge';
import { openDirectoryWorkspace } from '../io/folderLoader';
import {
  forgetRecentProject,
  readRecentProjects,
  toggleRecentProjectPinned,
  type RecentProjectEntry,
} from '../projects/projectPersistence';
import { useWorkbenchStore } from '../store';
import { FolderOpenButton } from './FolderOpenButton';
import { LucideIcon } from './LucideIcon';
import { createRuntimeTraceId, recordRuntimeError, recordRuntimeEvent } from '../support/runtimeDiagnostics';

function relativeLastOpened(timestamp: number): string {
  const delta = Date.now() - timestamp;
  if (!Number.isFinite(delta) || delta < 0) return 'Recently opened';
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'Just opened';
  if (minutes < 60) return `Opened ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Opened ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Opened ${days}d ago`;
}

export function ProjectStartScreen() {
  const setWorkspace = useWorkbenchStore((state) => state.setWorkspace);
  const [loadingPath, setLoadingPath] = useState<string | 'picker'>();
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const desktop = hasDesktopBridge();
  const recent = desktop ? readRecentProjects() : [];
  void revision;


  const removeRecent = async (rootPath: string) => {
    setError(undefined);
    try {
      if (desktop) await desktopRevokeRecentProject(rootPath);
      forgetRecentProject(rootPath);
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? `Could not revoke recent-project access: ${reason.message}` : String(reason));
    }
  };

  const openProject = async (project?: RecentProjectEntry) => {
    setError(undefined);
    setLoadingPath(project?.rootPath ?? 'picker');
    const started = performance.now();
    const traceId = createRuntimeTraceId('project-open');
    try {
      recordRuntimeEvent('project.open.requested', { traceId, data: { recent: !!project } });
      const workspace = await openDirectoryWorkspace(project?.rootPath, traceId);
      setWorkspace(workspace, traceId);
      recordRuntimeEvent('project.open.completed', { traceId, durationMs: performance.now() - started, data: { inventoryFiles: workspace.sourceEntries.size, semanticInputs: workspace.files.length, sourceKind: workspace.sourceKind } });
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      recordRuntimeError('project.open.failed', reason, { recent: !!project }, traceId);
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoadingPath(undefined);
    }
  };

  return (
    <main className="project-start-screen">
      <section className="project-start-hero">
        <div className="project-start-mark" aria-hidden="true"><img src={APP_ICON_DATA_URI} alt="" width={48} height={48} /></div>
        <div>
          <h1>Hytale Generator Workbench</h1>
          <p>Open a Hytale project to inspect, search, refactor, diagnose and visualize generator data.</p>
        </div>
        {desktop ? (
          <button className="primary project-start-open" disabled={!!loadingPath} onClick={() => void openProject()}>
            {loadingPath === 'picker' ? 'Opening…' : 'Open Project'}
          </button>
        ) : <div className="project-start-browser-open"><FolderOpenButton /></div>}
      </section>

      <section className="project-start-recents">
        <header>
          <div><strong>Recent Projects</strong><small>Projects are rescanned from disk every time they open.</small></div>
        </header>
        {recent.length ? (
          <div className="project-start-list">
            {recent.map((project) => (
              <article className="project-start-row" key={project.rootPath}>
                <button className="project-start-row-main" disabled={!!loadingPath} onClick={() => void openProject(project)} data-tooltip={project.rootPath}>
                  <span className="project-start-row-title"><span className={`project-pin-state ${project.pinned ? 'is-pinned' : ''}`}>{project.pinned && <LucideIcon name="pin" size={14} />}</span><strong>{project.label}</strong></span>
                  <small>{project.rootPath}</small>
                  <span className="project-start-last-opened">{loadingPath === project.rootPath ? 'Opening…' : relativeLastOpened(project.lastOpenedAt)}</span>
                </button>
                <div className="project-start-row-actions">
                  <button onClick={() => { toggleRecentProjectPinned(project.rootPath); setRevision((value) => value + 1); }} data-tooltip={project.pinned ? 'Unpin project' : 'Pin project'} aria-label={project.pinned ? `Unpin ${project.label}` : `Pin ${project.label}`}><LucideIcon name={project.pinned ? 'pin-off' : 'pin'} size={15} /></button>
                  <button onClick={() => void removeRecent(project.rootPath)} data-tooltip="Remove from Recent" aria-label={`Remove ${project.label} from Recent`}><LucideIcon name="x" size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="project-start-empty"><strong>No recent projects yet.</strong><span>Your recent and pinned projects will appear here after opening them.</span></div>
        )}
      </section>
      {error && <div className="project-start-error" role="alert"><strong>Could not open project</strong><span>{error}</span></div>}
      {!desktop && <div className="project-start-note">Browser mode keeps the folder picker and read-only snapshot fallback available here; recent projects require the desktop host.</div>}
    </main>
  );
}
