import { outputPaths, type OutputScope } from '../core';
import type { LoadedWorkspace } from './folderLoader';
import { readWorkspaceEntry } from './folderLoader';
import { createZipBlob, type ZipEntryInput } from './zip';

export async function buildOutputEntries(
  workspace: LoadedWorkspace,
  changedTexts: Map<string, string>,
  scope: OutputScope,
): Promise<Map<string, Blob | string>> {
  const paths = outputPaths(workspace.sourceEntries.keys(), changedTexts.keys(), scope);
  const entries = new Map<string, Blob | string>();
  for (const path of paths) {
    const changed = changedTexts.get(path);
    entries.set(path, changed !== undefined ? changed : await readWorkspaceEntry(workspace, path));
  }
  return entries;
}

export async function buildOutputZip(
  workspace: LoadedWorkspace,
  changedTexts: Map<string, string>,
  scope: OutputScope,
): Promise<Blob> {
  const entries = await buildOutputEntries(workspace, changedTexts, scope);
  const zipEntries: ZipEntryInput[] = [...entries].map(([path, data]) => ({ path, data }));
  return createZipBlob(zipEntries);
}
