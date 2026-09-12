import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));

assert.equal(pkg.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(tauri.version, JSON.parse(read('release-spec/release-contract.json')).version.semver);
assert.equal(read('BUILD_ID.txt').trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);
assert.match(read('src/support/runtimeDiagnostics.ts'), /RELEASE_DISPLAY_VERSION/);
assert.match(read('src/support/runtimeDiagnostics.ts'), /milestone: RELEASE_MILESTONE/);
assert.match(read('src/support/runtimeDiagnostics.ts'), /profile: RELEASE_VALIDATION_PROFILE/);
assert.match(read('src/App.tsx'), /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(read('tauri-ui/app.js'), /exports\.RELEASE_MILESTONE = 'v[^']+'/);
assert.match(read('tauri-ui/app.js'), /exports\.RELEASE_MILESTONE_NAME = '[^']+'/);

// Every package.json `node <file>` target must actually exist.
for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
  for (const match of command.matchAll(/(?:^|&&\s*|\s)node\s+([^\s]+)/g)) {
    const rel = match[1];
    assert.ok(fs.existsSync(path.join(root, rel)), `${name} references missing Node target ${rel}`);
  }
}
assert.equal(pkg.scripts['test:runtime-stability'], 'node scripts/test-runtime-stability-v0.11.28.mjs');

// Proven dead carry must remain removed in both source and packaged runtime.
const deadSourceChecks = [
  ['src/core/layout/normalize.ts', /function rectChanged\(/],
  ['src/core/layout/treeNormalize.ts', /function requiredLeftShift\(/],
  ['src/store.ts', /function activeTabForPane\(/],
  ['src/core/semanticReferences.ts', /import \{ symbolKey \} from '\.\/symbolIndex\.js';/],
  ['src/App.tsx', /const reopenClosedFile = useWorkbenchStore\(\(state\) => state\.reopenClosedFile\);/],
];
for (const [rel, pattern] of deadSourceChecks) assert.doesNotMatch(read(rel), pattern, `${rel} reintroduced cleanup carry`);
const packaged = read('tauri-ui/app.js');
for (const pattern of [/function rectChanged\(/, /function requiredLeftShift\(/, /function activeTabForPane\(/, /store_23\.useWorkbenchStore\)\(\(state\) => state\.reopenClosedFile/]) {
  assert.doesNotMatch(packaged, pattern);
}

// Runtime source graph: all TS/TSX files are reachable from main, except the deliberate ambient declaration.
const srcRoot = path.join(root, 'src');
const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(srcRoot);
const relOf = (full) => path.relative(root, full).replaceAll('\\', '/');
const sourceSet = new Set(sourceFiles.map(relOf));
const importPattern = /(?:import|export)\s+(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
function resolveImport(fromRel, spec) {
  if (!spec.startsWith('.')) return undefined;
  const fromDir = path.dirname(path.join(root, fromRel));
  let candidate = path.resolve(fromDir, spec);
  let rel = relOf(candidate);
  const candidates = [];
  if (/\.jsx?$/.test(rel)) candidates.push(rel.replace(/\.jsx?$/, '.ts'), rel.replace(/\.jsx?$/, '.tsx'));
  candidates.push(rel, `${rel}.ts`, `${rel}.tsx`, `${rel}/index.ts`, `${rel}/index.tsx`);
  return candidates.find((item) => sourceSet.has(item));
}
const graph = new Map([...sourceSet].map((rel) => [rel, new Set()]));
for (const rel of sourceSet) {
  const text = read(rel);
  for (const match of text.matchAll(importPattern)) {
    const spec = match[1] ?? match[2];
    if (!spec?.startsWith('.') || spec.endsWith('.css')) continue;
    const resolved = resolveImport(rel, spec);
    assert.ok(resolved, `unresolved relative source import ${spec} from ${rel}`);
    graph.get(rel).add(resolved);
  }
}
const reachable = new Set();
const stack = ['src/main.tsx'];
while (stack.length) {
  const rel = stack.pop();
  if (reachable.has(rel)) continue;
  reachable.add(rel);
  for (const next of graph.get(rel) ?? []) stack.push(next);
}
const allowedUnreachable = new Set(['src/io/fileSystemAccess.d.ts']);
const unexpectedUnreachable = [...sourceSet].filter((rel) => !reachable.has(rel) && !allowedUnreachable.has(rel));
assert.deepEqual(unexpectedUnreachable, [], `unreachable runtime source: ${unexpectedUnreachable.join(', ')}`);

// Current code carries no obvious temporary markers.
for (const base of ['src', 'src-tauri/src']) {
  const files = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else files.push(full);
    }
  };
  visit(path.join(root, base));
  for (const full of files) {
    const text = fs.readFileSync(full, 'utf8');
    assert.doesNotMatch(text, /\b(?:TODO|FIXME|HACK|XXX)\b/, `${relOf(full)} contains temporary carry marker`);
  }
}

assert.equal(read('src/styles.css'), read('tauri-ui/styles.css'), 'source and packaged CSS must remain byte-identical');

console.log('v0.11.30 project cleanup/hygiene contract: PASS');
