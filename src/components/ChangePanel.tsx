import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyChangeSet,
  compareDiagnostics,
  defaultZipName,
  normalizeZipName,
  outputPaths,
  type OutputScope,
} from '../core';
import {
  checkWorkspaceConflicts,
  chooseOutputDirectory,
  existingOutputTargetFiles,
  outputDirectoryIsSource,
  outputDirectoryLabel,
  reloadDirectoryWorkspace,
  writeOutputDirectory,
  writeWorkspaceFiles,
  type OutputDirectoryRef,
} from '../io/folderLoader';
import { buildOutputEntries, buildOutputZip } from '../io/output';
import { downloadBlob } from '../io/zip';
import { useWorkbenchStore } from '../store';
import { RenameRulesPanel } from './RenameRulesPanel';
import { LucideIcon } from './LucideIcon';
import { useModalFocusTrap } from '../workbench/modalFocus';
import { recordRuntimeError, recordRuntimeEvent } from '../support/runtimeDiagnostics';
import { beginPerformanceOperation, measurePerformanceAsync } from '../support/performanceTracing';

type OutputMode = 'changes-zip' | 'project-copy' | 'apply';


type UnifiedDiffLine = { kind: 'context' | 'remove' | 'add'; text: string; oldLine?: number; newLine?: number };

function buildUnifiedDiff(before: string, after: string, context = 2): UnifiedDiffLine[] {
  const left = before.split(/\r?\n/);
  const right = after.split(/\r?\n/);
  if (before === after) return [];
  if (left.length === right.length) {
    const changed = left.map((line, index) => line !== right[index] ? index : -1).filter((index) => index >= 0);
    const visible = new Set<number>();
    changed.forEach((index) => { for (let i = Math.max(0, index - context); i <= Math.min(left.length - 1, index + context); i += 1) visible.add(i); });
    const result: UnifiedDiffLine[] = [];
    let previous = -2;
    for (const index of [...visible].sort((a, b) => a - b)) {
      if (index > previous + 1) result.push({ kind: 'context', text: '…' });
      if (left[index] === right[index]) result.push({ kind: 'context', text: left[index], oldLine: index + 1, newLine: index + 1 });
      else {
        result.push({ kind: 'remove', text: left[index], oldLine: index + 1 });
        result.push({ kind: 'add', text: right[index], newLine: index + 1 });
      }
      previous = index;
    }
    return result;
  }
  let prefix = 0;
  while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) prefix += 1;
  let leftSuffix = left.length - 1;
  let rightSuffix = right.length - 1;
  while (leftSuffix >= prefix && rightSuffix >= prefix && left[leftSuffix] === right[rightSuffix]) { leftSuffix -= 1; rightSuffix -= 1; }
  const result: UnifiedDiffLine[] = [];
  for (let index = Math.max(0, prefix - context); index < prefix; index += 1) result.push({ kind: 'context', text: left[index], oldLine: index + 1, newLine: index + 1 });
  for (let index = prefix; index <= leftSuffix; index += 1) result.push({ kind: 'remove', text: left[index], oldLine: index + 1 });
  for (let index = prefix; index <= rightSuffix; index += 1) result.push({ kind: 'add', text: right[index], newLine: index + 1 });
  const suffixCount = Math.min(context, left.length - (leftSuffix + 1));
  for (let offset = 1; offset <= suffixCount; offset += 1) {
    const oldIndex = leftSuffix + offset;
    const newIndex = rightSuffix + offset;
    result.push({ kind: 'context', text: left[oldIndex], oldLine: oldIndex + 1, newLine: newIndex + 1 });
  }
  return result;
}

export function ChangePanel() {
  const project = useWorkbenchStore((state) => state.project);
  const workspace = useWorkbenchStore((state) => state.workspace);
  const changeSet = useWorkbenchStore((state) => state.changeSet);
  const historyCount = useWorkbenchStore((state) => state.changePast.length);
  const futureCount = useWorkbenchStore((state) => state.changeFuture.length);
  const undoChanges = useWorkbenchStore((state) => state.undoChanges);
  const redoChanges = useWorkbenchStore((state) => state.redoChanges);
  const resetChanges = useWorkbenchStore((state) => state.resetChanges);
  const openChangesTab = useWorkbenchStore((state) => state.openChangesTab);
  const commitWorkspace = useWorkbenchStore((state) => state.commitWorkspace);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [status, setStatus] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<OutputMode>('changes-zip');
  const [zipName, setZipName] = useState('HytaleProject-Changed-Files.zip');
  const [zipNameTouched, setZipNameTouched] = useState(false);
  const [targetFolder, setTargetFolder] = useState<OutputDirectoryRef>();
  const [targetCollisions, setTargetCollisions] = useState<string[]>([]);
  const [allowOverwrite, setAllowOverwrite] = useState(false);
  const [sourceConflicts, setSourceConflicts] = useState<string[]>([]);
  const [preflightBusy, setPreflightBusy] = useState(false);
  const reviewDialogRef = useRef<HTMLElement>(null);
  const reviewCloseButtonRef = useRef<HTMLButtonElement>(null);
  useModalFocusTrap({ containerRef: reviewDialogRef, initialFocusRef: reviewCloseButtonRef, onEscape: () => setReviewOpen(false), enabled: reviewOpen });

  const preview = useMemo(() => project && changeSet.changes.length ? applyChangeSet(project, changeSet) : undefined, [project, changeSet]);
  const validation = useMemo(() => project && preview ? compareDiagnostics(project, preview.project) : undefined, [project, preview]);
  const changedFileIds = useMemo(() => new Set(changeSet.changes.map((change) => change.fileId)), [changeSet.changes]);
  const changedTexts = useMemo<Map<string, string>>(() => {
    const result = new Map<string, string>();
    if (!preview) return result;
    for (const fileId of preview.changedFileIds) {
      const file = preview.project.fileMap.get(fileId);
      if (file) result.set(file.path, file.sourceText);
    }
    return result;
  }, [preview]);

  const effectiveScope: OutputScope = mode === 'project-copy' ? 'full' : 'changed';
  const outputFileCount = workspace ? outputPaths(workspace.sourceEntries.keys(), changedTexts.keys(), effectiveScope).length : 0;

  useEffect(() => {
    if (!workspace) return;
    // Desktop-safe default: export a patch ZIP and leave the opened project untouched.
    setMode('changes-zip');
    setZipName(defaultZipName(workspace.label, 'changed'));
    setZipNameTouched(false);
    setTargetFolder(undefined);
    setTargetCollisions([]);
    setSourceConflicts([]);
    setAllowOverwrite(false);
  }, [workspace]);

  useEffect(() => {
    if (!workspace || zipNameTouched) return;
    setZipName(defaultZipName(workspace.label, 'changed'));
  }, [workspace, zipNameTouched]);

  useEffect(() => {
    if (!reviewOpen || !workspace || !changedTexts.size) return;
    let cancelled = false;
    const run = async () => {
      setPreflightBusy(true);
      try {
        if (mode === 'apply') {
          const conflicts = await measurePerformanceAsync('changes.preflight.conflict-check', () => checkWorkspaceConflicts(workspace, changedTexts.keys()), { aggregateOnly: true, data: { changedFiles: changedTexts.size } });
          if (!cancelled) setSourceConflicts(conflicts);
        } else if (!cancelled) {
          setSourceConflicts([]);
        }

        if (mode === 'project-copy' && targetFolder) {
          const paths = outputPaths(workspace.sourceEntries.keys(), changedTexts.keys(), 'full');
          const collisions = await measurePerformanceAsync('changes.preflight.collision-check', () => existingOutputTargetFiles(targetFolder, paths), { aggregateOnly: true, data: { outputFiles: paths.length } });
          if (!cancelled) setTargetCollisions(collisions);
        } else if (!cancelled) {
          setTargetCollisions([]);
        }
      } catch (error) {
        recordRuntimeError('changes.preflight.failed', error, { mode, changedFiles: changedTexts.size });
        if (!cancelled) setStatus(error instanceof Error ? error.message : String(error));
      } finally {
        if (!cancelled) setPreflightBusy(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [reviewOpen, workspace, changedTexts, mode, targetFolder]);

  const diffFiles = useMemo(() => {
    if (!project) return [];
    const beforeByPath = new Map(project.files.map((file) => [file.path, file.sourceText]));
    return [...changedTexts.entries()].map(([path, after]) => ({ path, lines: buildUnifiedDiff(beforeByPath.get(path) ?? '', after) }));
  }, [project, changedTexts]);

  const selectTargetFolder = async () => {
    try {
      const folder = await chooseOutputDirectory();
      if (workspace && await outputDirectoryIsSource(workspace, folder)) {
        setMode('apply');
        setTargetFolder(undefined);
        setStatus('The selected folder is the opened source project. Switched to Apply to Project so external-change protection stays active.');
        return;
      }
      setTargetFolder(folder);
      setAllowOverwrite(false);
      setStatus(undefined);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const executeOutput = async () => {
    if (!project || !workspace || !preview || !validation?.safe || !changedTexts.size) return;
    setBusy(true);
    setStatus(undefined);
    const outputStarted = performance.now();
    const operationName = mode === 'apply' ? 'changes.apply' : mode === 'project-copy' ? 'changes.project-copy' : 'changes.zip-export';
    const operation = beginPerformanceOperation(operationName, { data: { changeCount: changeSet.changes.length, changedFiles: changedTexts.size } });
    recordRuntimeEvent('changes.output.started', { detailed: true, traceId: operation.traceId, data: { mode, changeCount: changeSet.changes.length, changedFiles: changedTexts.size } });
    try {
      if (mode === 'apply') {
        const conflicts = await operation.phaseAsync('conflict-check', () => checkWorkspaceConflicts(workspace, changedTexts.keys()), { changedFiles: changedTexts.size });
        setSourceConflicts(conflicts);
        if (conflicts.length) {
          recordRuntimeEvent('changes.apply.blocked-conflict', { level: 'warn', data: { conflicts: conflicts.length, paths: conflicts } });
          setStatus(`Apply blocked: ${conflicts.length} changed source file(s) were modified outside Workbench.`);
          operation.end({ outcome: 'blocked-conflict', conflicts: conflicts.length });
          return;
        }
        const commitConflicts = await operation.phaseAsync('write', () => writeWorkspaceFiles(workspace, changedTexts), { changedFiles: changedTexts.size });
        if (commitConflicts.length) {
          setSourceConflicts(commitConflicts);
          recordRuntimeEvent('changes.apply.blocked-late-conflict', { level: 'warn', data: { conflicts: commitConflicts.length, paths: commitConflicts } });
          setStatus(`Apply blocked: ${commitConflicts.length} source file(s) changed after the preflight check. Nothing was written.`);
          operation.end({ outcome: 'blocked-late-conflict', conflicts: commitConflicts.length });
          return;
        }
        const reloaded = await operation.phaseAsync('reload', () => reloadDirectoryWorkspace(workspace));
        operation.phase('model-commit', () => commitWorkspace(reloaded), { inventoryFiles: reloaded.sourceEntries.size, semanticInputs: reloaded.files.length });
        recordRuntimeEvent('changes.apply.completed', { traceId: operation.traceId, durationMs: performance.now() - outputStarted, data: { changeCount: changeSet.changes.length, changedFiles: changedTexts.size } });
        operation.end({ outcome: 'applied' });
        setStatus(`Applied ${changeSet.changes.length} change(s) to ${changedTexts.size} file(s). Undo/Redo history was cleared.`);
        setReviewOpen(false);
        return;
      }

      if (mode === 'project-copy') {
        if (!targetFolder) throw new Error('Choose an export folder first.');
        const paths = outputPaths(workspace.sourceEntries.keys(), changedTexts.keys(), 'full');
        const collisions = await operation.phaseAsync('collision-check', () => existingOutputTargetFiles(targetFolder, paths), { outputFiles: paths.length });
        setTargetCollisions(collisions);
        if (collisions.length && !allowOverwrite) {
          setStatus(`Export blocked until you confirm overwriting ${collisions.length} existing target file(s).`);
          operation.end({ outcome: 'blocked-collision', collisions: collisions.length });
          return;
        }
        const entries = workspace.desktopBridge ? undefined : await operation.phaseAsync('entries-build', () => buildOutputEntries(workspace, changedTexts, 'full'));
        const written = await operation.phaseAsync('write', () => writeOutputDirectory(workspace, targetFolder, changedTexts, 'full', entries), { outputFiles: paths.length });
        recordRuntimeEvent('changes.project-copy.completed', { traceId: operation.traceId, durationMs: performance.now() - outputStarted, data: { written } });
        operation.end({ outcome: 'exported', written });
        setStatus(`Exported a project copy with ${written} file(s) to ${outputDirectoryLabel(targetFolder)}. The opened source project was left unchanged.`);
        setReviewOpen(false);
        return;
      }

      const finalName = normalizeZipName(zipName, defaultZipName(workspace.label, 'changed'));
      const blob = await operation.phaseAsync('zip-build', () => buildOutputZip(workspace, changedTexts, 'changed'), { outputFiles: outputFileCount });
      operation.phase('download-dispatch', () => downloadBlob(finalName, blob), { outputFiles: outputFileCount });
      setZipName(finalName);
      recordRuntimeEvent('changes.zip-export.completed', { traceId: operation.traceId, durationMs: performance.now() - outputStarted, data: { outputFiles: outputFileCount } });
      operation.end({ outcome: 'exported', outputFiles: outputFileCount });
      setStatus(`Exported ${outputFileCount} changed file(s) as ${finalName}. The opened source project was left unchanged.`);
      setReviewOpen(false);
    } catch (error) {
      operation.fail(error, { mode, changedFiles: changedTexts.size });
      recordRuntimeError('changes.output.failed', error, { mode, changedFiles: changedTexts.size }, operation.traceId);
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const canExecute = Boolean(
    validation?.safe
    && changeSet.changes.length
    && !preflightBusy
    && (mode !== 'apply' || (workspace?.writable && sourceConflicts.length === 0))
    && (mode !== 'project-copy' || (targetFolder && (targetCollisions.length === 0 || allowOverwrite))),
  );

  return (
    <>
      <footer className={`change-panel ${changeSet.changes.length ? '' : 'muted'}`}>
        <div className="change-summary">
          <button className="change-summary-button" disabled={!project} onClick={openChangesTab} data-tooltip="Open staged changes">
            <span className="change-summary-icon"><LucideIcon name="git-compare-arrows" size={17} /></span>
            <span><strong>{changeSet.changes.length ? `${changeSet.changes.length} staged change${changeSet.changes.length === 1 ? '' : 's'}` : 'No staged changes'}</strong><small>{changeSet.changes.length ? `${changedFileIds.size} file${changedFileIds.size === 1 ? '' : 's'} affected` : 'Edits and layout proposals appear here.'}</small></span>
          </button>
          <RenameRulesPanel />
        </div>
        <div className="change-actions">
          {status && <small className="apply-status">{status}</small>}
          <button disabled={!historyCount} onClick={undoChanges} data-tooltip="Undo staged changes">Undo</button>
          <button disabled={!futureCount} onClick={redoChanges} data-tooltip="Redo staged changes">Redo</button>
          <button disabled={!changeSet.changes.length} onClick={resetChanges}>Discard</button>
          <button className="primary" disabled={!changeSet.changes.length} onClick={() => setReviewOpen(true)}>Review & Export</button>
        </div>
      </footer>

      {reviewOpen && preview && validation && workspace && (
        <div className="modal-backdrop" onMouseDown={() => setReviewOpen(false)}>
          <section ref={reviewDialogRef} className="review-modal output-review-modal" role="dialog" aria-modal="true" aria-labelledby="change-review-title" aria-describedby="change-review-description" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><h3 id="change-review-title">Review changes</h3><small id="change-review-description">Validate the staged refactor, then export it safely or explicitly apply it to the opened project.</small></div>
              <button ref={reviewCloseButtonRef} onClick={() => setReviewOpen(false)} aria-label="Close change review"><LucideIcon name="x" size={15} /></button>
            </header>
            <div className="review-validation">
              <span className={validation.safe ? 'ok' : 'bad'}><LucideIcon name={validation.safe ? 'circle-check' : 'circle-x'} size={14} /> semantic preflight</span>
              <span>{validation.addedErrors.length} new errors</span>
              <span>{validation.addedWarnings.length} new warnings</span>
              <span>{validation.removed.length} diagnostics resolved</span>
              <span>{preview.changedFileIds.length} changed files</span>
            </div>

            <section className="output-settings">
              <div className="output-mode-row">
                <div>
                  <strong>What should Workbench do?</strong>
                  <small>Exporting is the safe default. Applying to the opened project is always an explicit choice.</small>
                </div>
                <div className="output-mode-grid" role="group" aria-label="Output mode">
                  <button className={`output-mode-card ${mode === 'changes-zip' ? 'active' : ''}`} onClick={() => setMode('changes-zip')}>
                    <span><strong>Export Changes ZIP</strong><em>Recommended</em></span>
                    <small>Only changed files. Original project stays untouched.</small>
                  </button>
                  <button className={`output-mode-card ${mode === 'project-copy' ? 'active' : ''}`} onClick={() => setMode('project-copy')}>
                    <span><strong>Export Project Copy</strong></span>
                    <small>Complete project in another folder, including unchanged files and assets.</small>
                  </button>
                  {workspace.writable && (
                    <button className={`output-mode-card danger-choice ${mode === 'apply' ? 'active' : ''}`} onClick={() => setMode('apply')}>
                      <span><strong>Apply to Project</strong></span>
                      <small>Writes changed files directly into the opened project.</small>
                    </button>
                  )}
                </div>
              </div>

              {mode === 'changes-zip' && (
                <div className="output-setting-row">
                  <div><strong>ZIP name</strong><small>The archive keeps relative project paths so the changed files can be reviewed or copied back later.</small></div>
                  <input
                    className="output-name-input"
                    value={zipName}
                    onChange={(event) => { setZipName(event.target.value); setZipNameTouched(true); }}
                    onBlur={() => setZipName(normalizeZipName(zipName, defaultZipName(workspace.label, 'changed')))}
                  />
                </div>
              )}

              {mode === 'project-copy' && (
                <div className="output-setting-row">
                  <div><strong>Export folder</strong><small>The selected folder becomes the root of a complete modified project copy. Relative paths are preserved.</small></div>
                  <div className="output-folder-choice">
                    <code>{targetFolder ? outputDirectoryLabel(targetFolder) : 'No folder selected'}</code>
                    <button onClick={selectTargetFolder}>{targetFolder ? 'Change…' : 'Choose…'}</button>
                  </div>
                </div>
              )}

              <div className="output-summary-grid">
                <span><strong>Source</strong>{workspace.label}</span>
                <span><strong>Access</strong>{workspace.writable ? 'Opened project · Read / Write' : 'Folder snapshot · Read only'}</span>
                <span><strong>Result files</strong>{outputFileCount}</span>
                <span><strong>Changed values</strong>{changeSet.changes.length}</span>
              </div>

              {preflightBusy && <div className="output-notice">Checking selected action…</div>}
              {sourceConflicts.length > 0 && mode === 'apply' && (
                <div className="output-notice bad"><strong>External changes detected.</strong><span>{sourceConflicts.length} changed source file(s) no longer match the version loaded by Workbench. Apply is blocked.</span><details><summary>Show files</summary>{sourceConflicts.map((path) => <code key={path}>{path}</code>)}</details></div>
              )}
              {targetCollisions.length > 0 && mode === 'project-copy' && (
                <div className="output-notice warning"><strong>Export folder contains existing files.</strong><span>{targetCollisions.length} project file(s) already exist in {targetFolder ? outputDirectoryLabel(targetFolder) : 'the selected folder'}.</span><label><input type="checkbox" checked={allowOverwrite} onChange={(event) => setAllowOverwrite(event.target.checked)} /> I understand these target files will be overwritten.</label><details><summary>Show collisions</summary>{targetCollisions.slice(0, 50).map((path) => <code key={path}>{path}</code>)}</details></div>
              )}
            </section>

            {(validation.added.length > 0 || validation.removed.length > 0) && (
              <details className="diagnostic-diff">
                <summary>Diagnostic diff</summary>
                {validation.added.map((item, index) => <div className={`diagnostic-diff-row ${item.severity}`} key={`a-${index}`}>+ {item.message}</div>)}
                {validation.removed.map((item, index) => <div className="diagnostic-diff-row resolved" key={`r-${index}`}>− {item.message}</div>)}
              </details>
            )}
            <section className="apply-diff-review" aria-label="File diff review">
              <div className="apply-diff-heading"><strong>File diff</strong><small>Read-only final review for Apply / Export. Edit or remove staged values in the Changes tab.</small></div>
              {diffFiles.map((file) => (
                <details className="apply-diff-file" key={file.path} open={diffFiles.length <= 3}>
                  <summary><strong>{file.path}</strong><small>{file.lines.filter((line) => line.kind !== 'context').length} changed line(s)</small></summary>
                  <div className="unified-diff">
                    {file.lines.map((line, index) => <div className={`unified-diff-line ${line.kind}`} key={`${file.path}:${index}`}><span className="diff-line-number">{line.oldLine ?? ''}</span><span className="diff-line-number">{line.newLine ?? ''}</span><code>{line.kind === 'remove' ? '− ' : line.kind === 'add' ? '+ ' : '  '}{line.text}</code></div>)}
                  </div>
                </details>
              ))}
            </section>
            <div className={`apply-warning ${mode === 'apply' ? '' : 'export-warning'}`}>
              <strong>{mode === 'apply' ? 'Apply modifies the opened project.' : mode === 'project-copy' ? 'Project Copy is non-destructive.' : 'Changes ZIP is non-destructive.'}</strong>
              <span>{mode === 'apply' ? 'Workbench checks for external file changes first. After a successful write the project is reloaded and staged Undo/Redo history is cleared.' : 'The opened source project and staged Undo/Redo history stay unchanged after export.'}</span>
            </div>
            <footer>
              {!validation.safe && <span className="bad">Action blocked: the proposed patch introduces new errors.</span>}
              {sourceConflicts.length > 0 && mode === 'apply' && <span className="bad">Apply blocked by external file changes.</span>}
              <button onClick={() => setReviewOpen(false)}>Cancel</button>
              <button className="primary" disabled={!canExecute || busy} onClick={executeOutput}>
                {busy ? 'Working…' : mode === 'apply' ? `Apply ${changeSet.changes.length} Changes` : mode === 'project-copy' ? `Export Project Copy · ${outputFileCount} Files` : `Export ${outputFileCount} Changed Files as ZIP`}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
