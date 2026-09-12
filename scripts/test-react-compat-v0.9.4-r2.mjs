import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = join(root, 'src');
const compat = readFileSync(join(root, 'tauri-ui', 'compat-modules.js'), 'utf8');

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

const importedHooks = new Map();
for (const file of filesUnder(sourceRoot)) {
  const text = readFileSync(file, 'utf8');
  const rx = /import\s*\{([^}]*)\}\s*from\s*['"]react['"]/gs;
  let match;
  while ((match = rx.exec(text))) {
    for (const part of match[1].split(',')) {
      const name = part.trim().split(/\s+/)[0];
      if (!/^use[A-Z]/.test(name)) continue;
      if (!importedHooks.has(name)) importedHooks.set(name, []);
      importedHooks.get(name).push(relative(root, file));
    }
  }
}

const reactObjectMatch = compat.match(/var React = \{([\s\S]*?)\n  \};/);
assert.ok(reactObjectMatch, 'embedded React compatibility object must be present');
const exportedHooks = new Set([...reactObjectMatch[1].matchAll(/\b(use[A-Z]\w*):\s*\1\b/g)].map((m) => m[1]));
const missing = [...importedHooks.keys()].filter((name) => !exportedHooks.has(name));
assert.deepEqual(missing, [], `embedded React compatibility layer is missing hooks: ${missing.join(', ')}`);

console.log(JSON.stringify({
  importedHooks: [...importedHooks.keys()].sort(),
  embeddedHooks: [...exportedHooks].sort(),
  missing: [],
}, null, 2));
