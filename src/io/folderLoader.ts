import { detectWorkspace, workspaceFromNativeId, workspaceFromSegment, workspaceHintFromSelectedRoot, type SourceFileInput } from '../core';
import { isWorkspaceMarker, loadModeForProjectPath, projectPathDirectory } from '../projectFiles/loadPolicy';
import {
  desktopCheckConflicts,
  desktopChooseOutputDirectory,
  desktopExistingTargetFiles,
  desktopExportToDirectory,
  desktopOpenProject,
  desktopOpenProjectAt,
  desktopReadProjectFile,
  desktopReadProjectTextPreview,
  desktopReloadProject,
  desktopProbeProjectPath,
  desktopSelectProjectProbePath,
  desktopRemoveProjectProbePath,
  desktopResetProjectProbePaths,
  desktopApplyProjectFiles,
  hasDesktopBridge,
  type DesktopOutputDirectory,
  type DesktopSemanticFileInfo,
  type DesktopProjectTextPreview,
} from './desktopBridge';
import { recordRuntimeEvent } from '../support/runtimeDiagnostics';
import { measurePerformanceAsync } from '../support/performanceTracing';

export type WorkspaceSourceEntry =
  | { kind: 'handle'; handle: FileSystemFileHandle }
  | { kind: 'file'; file: File }
  | { kind: 'desktop'; path: string };

export type OutputDirectoryRef = FileSystemDirectoryHandle | DesktopOutputDirectory;

export interface LoadedWorkspace {
  /** JSON inputs consumed by the semantic project parser. Paths are relative to the selected root. */
  files: SourceFileInput[];
  /** Writable JSON handles for direct apply. */
  handles: Map<string, FileSystemFileHandle>;
  /** Every source file, including non-JSON assets, for full-project output. */
  sourceEntries: Map<string, WorkspaceSourceEntry>;
  /** Selected root handle when the project came from Open folder. */
  rootHandle?: FileSystemDirectoryHandle;
  writable: boolean;
  sourceKind: 'directory' | 'snapshot';
  /** Native Tauri desktop host mode. Browser builds leave this false/undefined. */
  desktopBridge?: boolean;
  /** Stable native project root. Present for Tauri desktop projects only. */
  projectRoot?: string;
  /** Detector output for semantic files. Desktop scans are authoritative; browser mode may omit it. */
  semanticInfo?: Map<string, DesktopSemanticFileInfo>;
  /** User-approved relative folders that receive bounded detector probing on future reloads. */
  discoveryRoots?: string[];
  /** Original selected root folder name. */
  label: string;
}

export interface WorkspaceTextPreview {
  path: string;
  size: number;
  kind: 'text' | 'binary' | 'too-large' | string;
  text?: string;
}

const MAX_BROWSER_SOURCE_PREVIEW_BYTES = 4 * 1024 * 1024;

async function inventoryDirectory(
  directory: FileSystemDirectoryHandle,
  prefix = '',
  handles = new Map<string, FileSystemFileHandle>(),
  sourceEntries = new Map<string, WorkspaceSourceEntry>(),
): Promise<void> {
  for await (const [name, handle] of directory.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === 'directory') {
      await inventoryDirectory(handle, path, handles, sourceEntries);
      continue;
    }
    handles.set(path, handle);
    sourceEntries.set(path, { kind: 'handle', handle });
  }
}

async function sourceEntryText(source: WorkspaceSourceEntry): Promise<string> {
  if (source.kind === 'file') return source.file.text();
  if (source.kind === 'desktop') return (await desktopReadProjectFile(source.path)).text();
  return (await source.handle.getFile()).text();
}

async function readSemanticInputs(
  sourceEntries: Map<string, WorkspaceSourceEntry>,
  selectedRoot: string,
): Promise<SourceFileInput[]> {
  const paths = [...sourceEntries.keys()];
  const markerDirectories = paths.filter(isWorkspaceMarker).map(projectPathDirectory);
  const files: SourceFileInput[] = [];
  for (const path of paths) {
    if (loadModeForProjectPath(path, selectedRoot, markerDirectories) !== 'semantic-json') continue;
    const source = sourceEntries.get(path);
    if (!source) continue;
    files.push({ path, text: await sourceEntryText(source) });
  }
  return files;
}

function directoryPath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(0, index) : '';
}

function fileName(path: string): string {
  return path.replace(/\\/g, '/').split('/').filter(Boolean).at(-1) ?? path;
}

function looksLikeNodeEditorAsset(file: SourceFileInput): boolean {
  try {
    const raw = JSON.parse(file.text) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const record = raw as Record<string, unknown>;
    return typeof record.$NodeId === 'string' || (record.$NodeEditorMetadata !== null && typeof record.$NodeEditorMetadata === 'object');
  } catch {
    return false;
  }
}

function applyWorkspaceHints(files: SourceFileInput[], selectedRoot: string) {
  // Native NodeEditor workspaces are described by a _Workspace.json marker.
  // The XAML only exposes WorkspaceList; the shipped editor strings show the
  // marker plus WorkspaceName/Roots validation. Use it when a full editor/mod
  // tree contains those configuration files.
  const configs = files.flatMap((file) => {
    if (fileName(file.path).toLowerCase() !== '_workspace.json') return [];
    try {
      const raw = JSON.parse(file.text) as { WorkspaceName?: unknown; Roots?: unknown };
      const dir = directoryPath(file.path);
      const fallback = dir.split('/').filter(Boolean).at(-1) || selectedRoot;
      const label = typeof raw.WorkspaceName === 'string' && raw.WorkspaceName.trim() ? raw.WorkspaceName.trim() : fallback;
      return [{ dir, workspace: workspaceFromNativeId(label, 'content') }];
    } catch {
      return [];
    }
  }).sort((a, b) => b.dir.length - a.dir.length);

  const selectedRootHint = workspaceHintFromSelectedRoot(selectedRoot);
  for (const file of files) {
    if (fileName(file.path).toLowerCase() === '_workspace.json') continue;

    const config = configs.find((item) => !item.dir || file.path === item.dir || file.path.startsWith(`${item.dir}/`));
    if (config) {
      file.workspaceHint = config.workspace;
      continue;
    }

    if (selectedRootHint) {
      file.workspaceHint = selectedRootHint;
      continue;
    }

    if (selectedRoot.toLowerCase() === 'hytalegenerator') {
      const firstSegment = file.path.replace(/\\/g, '/').split('/').filter(Boolean)[0];
      if (firstSegment) file.workspaceHint = workspaceFromSegment(firstSegment);
      continue;
    }

    // Full-mod fallback: semantic folders such as Biome/Density can live
    // anywhere, not only below HytaleGenerator. If no semantic path exists,
    // the folder directly containing recognized JSON files becomes a workspace.
    const pathWorkspace = detectWorkspace(file.path);
    if (pathWorkspace.id !== 'unknown') {
      file.workspaceHint = pathWorkspace;
      continue;
    }
    const parent = directoryPath(file.path).split('/').filter(Boolean).at(-1);
    if (parent && looksLikeNodeEditorAsset(file)) file.workspaceHint = workspaceFromSegment(parent, 'path');
  }
}

function projectJsonFiles(files: SourceFileInput[]): SourceFileInput[] {
  return files.filter((file) => fileName(file.path).toLowerCase() !== '_workspace.json');
}

function workspaceFromDesktopScan(scan: Awaited<ReturnType<typeof desktopOpenProject>>): LoadedWorkspace {
  const files: SourceFileInput[] = scan.files.map((file) => ({ path: file.path, text: file.text }));
  applyWorkspaceHints(files, scan.label);
  const semanticInfo = new Map((scan.semanticFiles ?? []).map((info) => [info.path.replace(/\\/g, '/'), info]));
  for (const file of files) {
    const info = semanticInfo.get(file.path.replace(/\\/g, '/'));
    if (info?.workspace) file.workspaceHint = workspaceFromNativeId(info.workspace, 'content');
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  const sourceEntries = new Map<string, WorkspaceSourceEntry>();
  for (const path of scan.entries) sourceEntries.set(path, { kind: 'desktop', path });
  return {
    files: projectJsonFiles(files),
    handles: new Map(),
    sourceEntries,
    writable: true,
    sourceKind: 'directory',
    desktopBridge: true,
    projectRoot: scan.root,
    semanticInfo,
    discoveryRoots: scan.discoveryRoots ?? [],
    label: scan.label,
  };
}

export async function openDirectoryWorkspace(rootPath?: string, traceId?: string): Promise<LoadedWorkspace> {
  if (hasDesktopBridge()) {
    const scan = rootPath ? await desktopOpenProjectAt(rootPath, traceId) : await desktopOpenProject(traceId);
    const prepareStarted = performance.now();
    const workspace = workspaceFromDesktopScan(scan);
    recordRuntimeEvent('project.workspace.prepare', {
      traceId,
      durationMs: performance.now() - prepareStarted,
      data: { inventoryFiles: workspace.sourceEntries.size, semanticInputs: workspace.files.length },
    });
    return workspace;
  }
  if (!('showDirectoryPicker' in window)) {
    throw new Error('Directory picker is not supported by this browser. Use Open snapshot instead.');
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  const handles = new Map<string, FileSystemFileHandle>();
  const sourceEntries = new Map<string, WorkspaceSourceEntry>();
  await inventoryDirectory(handle, '', handles, sourceEntries);
  const files = await readSemanticInputs(sourceEntries, handle.name);
  applyWorkspaceHints(files, handle.name);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return {
    files: projectJsonFiles(files),
    handles,
    sourceEntries,
    rootHandle: handle,
    writable: true,
    sourceKind: 'directory',
    label: handle.name,
  };
}

export async function reloadDirectoryWorkspace(workspace: LoadedWorkspace): Promise<LoadedWorkspace> {
  return measurePerformanceAsync('project.workspace-reload', async () => {
    if (workspace.desktopBridge) return workspaceFromDesktopScan(await desktopReloadProject());
    if (!workspace.rootHandle) throw new Error('No source directory handle is available for reload.');
    const handles = new Map<string, FileSystemFileHandle>();
    const sourceEntries = new Map<string, WorkspaceSourceEntry>();
    await inventoryDirectory(workspace.rootHandle, '', handles, sourceEntries);
    const files = await readSemanticInputs(sourceEntries, workspace.rootHandle.name);
    applyWorkspaceHints(files, workspace.rootHandle.name);
    files.sort((a, b) => a.path.localeCompare(b.path));
    return {
      files: projectJsonFiles(files),
      handles,
      sourceEntries,
      rootHandle: workspace.rootHandle,
      writable: true,
      sourceKind: 'directory',
      label: workspace.rootHandle.name,
    };
  }, { data: { host: workspace.desktopBridge ? 'desktop' : 'browser', inventoryFiles: workspace.sourceEntries.size } });
}

export async function probeWorkspaceFolder(workspace: LoadedWorkspace, path: string): Promise<{ workspace: LoadedWorkspace; detected: DesktopSemanticFileInfo[]; probedRoot: string }> {
  if (!workspace.desktopBridge) {
    throw new Error('Semantic folder re-scan is currently available in the native desktop host only.');
  }
  return measurePerformanceAsync('project.discovery.probe', async () => {
    const result = await desktopProbeProjectPath(path);
    return { workspace: workspaceFromDesktopScan(result.scan), detected: result.detected, probedRoot: result.probedRoot };
  }, { data: { inventoryFiles: workspace.sourceEntries.size } });
}

export async function selectWorkspaceProbeFolder(workspace: LoadedWorkspace): Promise<{ workspace: LoadedWorkspace; detected: DesktopSemanticFileInfo[]; probedRoot: string }> {
  if (!workspace.desktopBridge) throw new Error('Custom semantic discovery folders are available in the native desktop host only.');
  const result = await desktopSelectProjectProbePath();
  return { workspace: workspaceFromDesktopScan(result.scan), detected: result.detected, probedRoot: result.probedRoot };
}

export async function removeWorkspaceProbeFolder(workspace: LoadedWorkspace, path: string): Promise<LoadedWorkspace> {
  if (!workspace.desktopBridge) throw new Error('Custom semantic discovery folders are available in the native desktop host only.');
  return workspaceFromDesktopScan(await desktopRemoveProjectProbePath(path));
}

export async function resetWorkspaceProbeFolders(workspace: LoadedWorkspace): Promise<LoadedWorkspace> {
  if (!workspace.desktopBridge) throw new Error('Custom semantic discovery folders are available in the native desktop host only.');
  return workspaceFromDesktopScan(await desktopResetProjectProbePaths());
}

export async function workspaceFromFolderSnapshot(fileList: FileList): Promise<LoadedWorkspace> {
  const allFiles = Array.from(fileList);
  const rawPaths = allFiles.map((file) => (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name);
  const roots = [...new Set(rawPaths.map((path) => path.replace(/\\/g, '/').split('/').filter(Boolean)[0]).filter(Boolean))];
  const root = roots.length === 1 ? roots[0] : undefined;
  const stripRoot = (path: string) => {
    const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!root) return normalized;
    const prefix = `${root}/`;
    return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
  };

  const sourceEntries = new Map<string, WorkspaceSourceEntry>();
  for (let index = 0; index < allFiles.length; index += 1) {
    const file = allFiles[index];
    const path = stripRoot(rawPaths[index] || file.name);
    sourceEntries.set(path, { kind: 'file', file });
  }

  const label = root || 'Folder snapshot';
  const files = await readSemanticInputs(sourceEntries, label);
  applyWorkspaceHints(files, label);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return {
    files: projectJsonFiles(files),
    handles: new Map(),
    sourceEntries,
    writable: false,
    sourceKind: 'snapshot',
    label,
  };
}

export async function readWorkspaceTextPreview(workspace: LoadedWorkspace, path: string): Promise<WorkspaceTextPreview> {
  const source = workspace.sourceEntries.get(path);
  if (!source) throw new Error(`Source file is no longer available: ${path}`);
  if (workspace.desktopBridge) {
    return desktopReadProjectTextPreview(path) as Promise<DesktopProjectTextPreview>;
  }
  if (source.kind === 'desktop') throw new Error('Desktop source preview requires the native project bridge.');
  const blob = source.kind === 'file' ? source.file : await source.handle.getFile();
  if (blob.size > MAX_BROWSER_SOURCE_PREVIEW_BYTES) return { path, size: blob.size, kind: 'too-large' };
  const bytes = new Uint8Array(await blob.arrayBuffer());
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { path, size: blob.size, kind: 'text', text };
  } catch {
    return { path, size: blob.size, kind: 'binary' };
  }
}

export async function readWorkspaceEntry(workspace: LoadedWorkspace, path: string): Promise<Blob> {
  const source = workspace.sourceEntries.get(path);
  if (!source) throw new Error(`Source file is no longer available: ${path}`);
  if (source.kind === 'file') return source.file;
  if (source.kind === 'desktop') return desktopReadProjectFile(source.path);
  return source.handle.getFile();
}

export async function checkWorkspaceConflicts(
  workspace: LoadedWorkspace,
  paths: Iterable<string>,
): Promise<string[]> {
  if (!workspace.writable) return [];
  const originalTexts = new Map(workspace.files.map((file) => [file.path, file.text]));
  if (workspace.desktopBridge) {
    const selected = new Map<string, string>();
    for (const path of paths) {
      const original = originalTexts.get(path);
      if (original !== undefined) selected.set(path, original);
    }
    return desktopCheckConflicts(selected);
  }
  const conflicts: string[] = [];
  for (const path of paths) {
    const original = originalTexts.get(path);
    if (original === undefined) continue;
    const handle = workspace.handles.get(path);
    if (!handle) {
      conflicts.push(path);
      continue;
    }
    const current = await (await handle.getFile()).text();
    if (current !== original) conflicts.push(path);
  }
  return conflicts.sort();
}

async function directoryForPath(root: FileSystemDirectoryHandle, segments: string[]): Promise<FileSystemDirectoryHandle> {
  let current = root;
  for (const segment of segments) current = await current.getDirectoryHandle(segment, { create: true });
  return current;
}

export async function writeBlobsToDirectory(
  root: FileSystemDirectoryHandle,
  entries: Map<string, Blob | string>,
): Promise<void> {
  for (const [rawPath, data] of entries) {
    const segments = rawPath.replace(/\\/g, '/').split('/').filter(Boolean);
    const filename = segments.pop();
    if (!filename) continue;
    const directory = await directoryForPath(root, segments);
    const handle = await directory.getFileHandle(filename, { create: true });
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
  }
}

export async function existingTargetFiles(
  root: FileSystemDirectoryHandle,
  paths: Iterable<string>,
): Promise<string[]> {
  const existing: string[] = [];
  for (const rawPath of paths) {
    const segments = rawPath.replace(/\\/g, '/').split('/').filter(Boolean);
    const filename = segments.pop();
    if (!filename) continue;
    try {
      let current = root;
      for (const segment of segments) current = await current.getDirectoryHandle(segment);
      await current.getFileHandle(filename);
      existing.push(rawPath);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') continue;
      // Some browsers use TypeMismatchError when a path component is not a directory.
      if (error instanceof DOMException && error.name === 'TypeMismatchError') continue;
      throw error;
    }
  }
  return existing.sort();
}

export async function writeWorkspaceFiles(
  workspace: LoadedWorkspace,
  textsByPath: Map<string, string>,
): Promise<string[]> {
  if (!workspace.writable) throw new Error('This workspace is read-only. Re-open it with the directory picker.');
  if (workspace.desktopBridge) {
    const originals = new Map(workspace.files.map((file) => [file.path, file.text]));
    return desktopApplyProjectFiles(originals, textsByPath);
  }
  for (const [path, text] of textsByPath) {
    const handle = workspace.handles.get(path);
    if (!handle) throw new Error(`No writable file handle found for ${path}.`);
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
  }
  return [];
}

export async function chooseOutputDirectory(): Promise<OutputDirectoryRef> {
  if (hasDesktopBridge()) return desktopChooseOutputDirectory();
  if (!('showDirectoryPicker' in window)) throw new Error('Folder output is not supported by this browser.');
  return window.showDirectoryPicker({ mode: 'readwrite' });
}

export function isDesktopOutputDirectory(target: OutputDirectoryRef): target is DesktopOutputDirectory {
  return (target as DesktopOutputDirectory).kind === 'desktop-output';
}

export async function outputDirectoryIsSource(workspace: LoadedWorkspace, target: OutputDirectoryRef): Promise<boolean> {
  if (isDesktopOutputDirectory(target)) return Boolean(target.isSource);
  return Boolean(workspace.rootHandle && await target.isSameEntry(workspace.rootHandle));
}

export async function existingOutputTargetFiles(target: OutputDirectoryRef, paths: Iterable<string>): Promise<string[]> {
  return isDesktopOutputDirectory(target)
    ? desktopExistingTargetFiles(target, paths)
    : existingTargetFiles(target, paths);
}

export async function writeOutputDirectory(
  workspace: LoadedWorkspace,
  target: OutputDirectoryRef,
  changedTexts: Map<string, string>,
  scope: 'full' | 'changed',
  browserEntries?: Map<string, Blob | string>,
): Promise<number> {
  if (isDesktopOutputDirectory(target)) return desktopExportToDirectory(target, scope, changedTexts);
  if (!browserEntries) throw new Error('Browser output entries were not prepared.');
  await writeBlobsToDirectory(target, browserEntries);
  return browserEntries.size;
}

export function outputDirectoryLabel(target: OutputDirectoryRef): string {
  return isDesktopOutputDirectory(target) ? target.name : target.name;
}
