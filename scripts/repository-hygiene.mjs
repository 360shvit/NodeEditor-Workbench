import path from 'node:path';

export function assertPublicPaths(files) {
  const generated = /^(?:build|release|\.core-build|\.support-build|src-tauri\/target)(\/|$)|(^|\/)(?:node_modules|\.vs|\.vscode|\.idea)(\/|$)|(^|\/)(?:\.env(?:\..*)?|[^/]+\.(?:log|tmp|bak|pfx|p12|pem|key|tsbuildinfo))$|^THIRD_PARTY_NOTICES\.txt$|^docs\/history\//i;
  for (const file of files) {
    if (file === '.env.example') continue;
    if (generated.test(file)) throw new Error(`Generated/private/local path in public source: ${file}`);
  }
}

export function assertDocumentLinks(files, read) {
  const tracked = new Set(files);
  let checked = 0;
  for (const file of files.filter(file => file.endsWith('.md'))) {
    const text = read(file);
    for (const match of text.matchAll(/\[[^\]\n]*\]\(([^\s)]+)\)/g)) {
      const url = match[1].replace(/^<|>$/g, '');
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(url)) continue;
      const relative = decodeURIComponent(url.split('#')[0]);
      if (!relative) continue;
      const destination = path.posix.normalize(path.posix.join(path.posix.dirname(file), relative));
      if (relative.startsWith('/') || destination.startsWith('../') || !tracked.has(destination)) {
        throw new Error(`Documentation link is outside public tracked source or missing: ${file} -> ${url}`);
      }
      checked++;
    }
  }
  return checked;
}
