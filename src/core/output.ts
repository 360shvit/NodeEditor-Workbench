export type OutputScope = 'full' | 'changed';
export type OutputTarget = 'original' | 'folder' | 'zip';

export function sanitizeOutputBaseName(name: string): string {
  const trimmed = name.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/[. ]+$/g, '');
  return trimmed || 'HytaleProject';
}

export function defaultZipName(rootName: string, scope: OutputScope): string {
  const base = sanitizeOutputBaseName(rootName);
  return scope === 'full' ? `${base}-Refactor.zip` : `${base}-Changed-Files.zip`;
}

export function normalizeZipName(name: string, fallback: string): string {
  const raw = name.trim() || fallback;
  const withoutExtension = raw.toLowerCase().endsWith('.zip') ? raw.slice(0, -4) : raw;
  return `${sanitizeOutputBaseName(withoutExtension)}.zip`;
}

export function outputPaths(allPaths: Iterable<string>, changedPaths: Iterable<string>, scope: OutputScope): string[] {
  const source = scope === 'full' ? allPaths : changedPaths;
  return [...new Set(source)].map((path) => path.replace(/\\/g, '/').replace(/^\/+/, '')).filter(Boolean).sort();
}

export function targetSupportsScope(target: OutputTarget): boolean {
  // Applying in place never needs to rewrite unchanged source files.
  return target !== 'original';
}
