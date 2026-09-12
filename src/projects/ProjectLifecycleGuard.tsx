import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  desktopCloseProject,
  desktopExitApplication,
  desktopSetPendingChangeCount,
  hasDesktopBridge,
  subscribeDesktopAppCloseRequested,
} from '../io/desktopBridge';
import { useWorkbenchStore } from '../store';
import { LucideIcon } from '../components/LucideIcon';
import { recordRuntimeError, recordRuntimeEvent } from '../support/runtimeDiagnostics';
import { useModalFocusTrap } from '../workbench/modalFocus';

type GuardedProjectActionKind = 'switch-project' | 'close-project' | 'exit-app';

interface PendingProjectAction {
  kind: GuardedProjectActionKind;
  execute: () => Promise<void> | void;
  resolve: (continued: boolean) => void;
  reject: (reason: unknown) => void;
}

interface ProjectLifecycleContextValue {
  guardProjectAction: (kind: GuardedProjectActionKind, execute: () => Promise<void> | void) => Promise<boolean>;
  requestCloseProject: () => Promise<boolean>;
}

const ProjectLifecycleContext = createContext<ProjectLifecycleContextValue | undefined>(undefined);

function actionCopy(kind: GuardedProjectActionKind) {
  switch (kind) {
    case 'switch-project':
      return {
        title: 'Switch project with pending changes?',
        detail: 'The current ChangeSet exists only in this app session and cannot follow you into another project.',
        discardLabel: 'Discard & Switch',
      };
    case 'close-project':
      return {
        title: 'Close project with pending changes?',
        detail: 'Closing the project destroys its staged ChangeSet and staged Undo/Redo history.',
        discardLabel: 'Discard & Close',
      };
    case 'exit-app':
      return {
        title: 'Exit with pending changes?',
        detail: 'Staged changes and staged Undo/Redo history are intentionally not persisted after the app exits.',
        discardLabel: 'Discard & Exit',
      };
  }
}

export function ProjectLifecycleProvider({ children }: { children: ReactNode }) {
  const changeCount = useWorkbenchStore((state) => state.changeSet.changes.length);
  const openChangesTab = useWorkbenchStore((state) => state.openChangesTab);
  const closeProjectState = useWorkbenchStore((state) => state.closeProject);
  const [pending, setPending] = useState<PendingProjectAction>();
  const [busy, setBusy] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const desktop = hasDesktopBridge();

  const guardProjectAction = useCallback<ProjectLifecycleContextValue['guardProjectAction']>(async (kind, execute) => {
    const state = useWorkbenchStore.getState();
    if (!state.project || state.changeSet.changes.length === 0) {
      recordRuntimeEvent('lifecycle.action.allowed', { detailed: true, data: { kind, pendingChanges: state.changeSet.changes.length } });
      await execute();
      return true;
    }
    recordRuntimeEvent('lifecycle.action.blocked-for-review', { data: { kind, pendingChanges: state.changeSet.changes.length } });
    return new Promise<boolean>((resolve, reject) => {
      setPending({ kind, execute, resolve, reject });
    });
  }, []);

  const requestCloseProject = useCallback(async () => guardProjectAction('close-project', async () => {
    if (desktop) await desktopCloseProject();
    closeProjectState();
  }), [closeProjectState, desktop, guardProjectAction]);

  useEffect(() => {
    if (!desktop) return;
    void desktopSetPendingChangeCount(changeCount).catch((error) => recordRuntimeError('lifecycle.pending-change-sync-failed', error, { pendingChanges: changeCount }));
  }, [changeCount, desktop]);

  useEffect(() => {
    if (!desktop) return;
    return subscribeDesktopAppCloseRequested(() => {
      if (pending) return;
      const state = useWorkbenchStore.getState();
      if (!state.changeSet.changes.length) {
        void desktopExitApplication();
        return;
      }
      void guardProjectAction('exit-app', async () => {
        await desktopExitApplication();
      });
    });
  }, [desktop, guardProjectAction, pending]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!useWorkbenchStore.getState().changeSet.changes.length) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  const cancelPending = () => {
    if (!pending || busy) return;
    pending.resolve(false);
    setPending(undefined);
  };


  useModalFocusTrap({
    containerRef: dialogRef,
    initialFocusRef: cancelButtonRef,
    onEscape: busy ? undefined : cancelPending,
    enabled: Boolean(pending),
  });

  const reviewPending = () => {
    if (!pending || busy) return;
    openChangesTab();
    pending.resolve(false);
    setPending(undefined);
  };

  const discardAndContinue = async () => {
    if (!pending || busy) return;
    const action = pending;
    setBusy(true);
    try {
      // The guarded action itself owns the destructive boundary. setWorkspace/closeProject/exit
      // clear session-only changes only after the replacement/close path actually succeeds.
      await action.execute();
      action.resolve(true);
      setPending(undefined);
    } catch (error) {
      recordRuntimeError('lifecycle.action.failed', error, { kind: action.kind });
      action.reject(error);
      setPending(undefined);
    } finally {
      setBusy(false);
    }
  };

  const contextValue = useMemo<ProjectLifecycleContextValue>(() => ({ guardProjectAction, requestCloseProject }), [guardProjectAction, requestCloseProject]);
  const copy = pending ? actionCopy(pending.kind) : undefined;

  return (
    <ProjectLifecycleContext.Provider value={contextValue}>
      {children}
      {pending && copy && (
        <div className="modal-backdrop project-lifecycle-backdrop" onMouseDown={cancelPending}>
          <section ref={dialogRef} className="project-lifecycle-modal" role="alertdialog" aria-modal="true" aria-labelledby="project-lifecycle-title" aria-describedby="project-lifecycle-detail" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div className="project-lifecycle-icon"><LucideIcon name="triangle-alert" size={21} /></div>
              <div>
                <h3 id="project-lifecycle-title">{copy.title}</h3>
                <small id="project-lifecycle-detail">{copy.detail}</small>
              </div>
            </header>
            <div className="project-lifecycle-summary">
              <strong>{changeCount} staged change{changeCount === 1 ? '' : 's'}</strong>
              <span>Review or export them before continuing if you want to keep the work.</span>
            </div>
            <footer>
              <button ref={cancelButtonRef} disabled={busy} onClick={cancelPending}>Cancel</button>
              <button disabled={busy} onClick={reviewPending}>Review Changes</button>
              <button className="danger" disabled={busy} onClick={() => void discardAndContinue()}>{busy ? 'Continuing…' : copy.discardLabel}</button>
            </footer>
          </section>
        </div>
      )}
    </ProjectLifecycleContext.Provider>
  );
}

export function useProjectLifecycle(): ProjectLifecycleContextValue {
  const value = useContext(ProjectLifecycleContext);
  if (!value) throw new Error('useProjectLifecycle must be used inside ProjectLifecycleProvider.');
  return value;
}
