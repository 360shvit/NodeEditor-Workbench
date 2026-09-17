import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const normalize = (value) => value.split(path.sep).join('/');
const relative = (value) => normalize(path.relative(root, value));

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) files.push(full);
  }
  return files;
}

const sourceFiles = walk(srcRoot).sort();
const sourceSet = new Set(sourceFiles.map((file) => path.resolve(file)));

function resolveRelativeImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return undefined;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  return candidates.find((candidate) => sourceSet.has(path.resolve(candidate)));
}

function importSpecifiers(source, { includeTypeOnly }) {
  const values = new Set();
  const input = includeTypeOnly
    ? source
    : source.replace(/^\s*(?:import|export)\s+type\b[\s\S]*?;\s*$/gm, '');
  const staticImport = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicImport = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const matcher of [staticImport, dynamicImport]) {
    matcher.lastIndex = 0;
    for (let match = matcher.exec(input); match; match = matcher.exec(input)) values.add(match[1]);
  }
  return [...values];
}

function buildGraph(includeTypeOnly) {
  const graph = new Map();
  for (const file of sourceFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const deps = importSpecifiers(source, { includeTypeOnly })
      .map((specifier) => resolveRelativeImport(file, specifier))
      .filter(Boolean)
      .map((target) => path.resolve(target));
    graph.set(path.resolve(file), [...new Set(deps)]);
  }
  return graph;
}

function findCycles(graph) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycles = [];
  function visit(file) {
    if (visited.has(file)) return;
    if (visiting.has(file)) {
      const start = stack.indexOf(file);
      cycles.push([...stack.slice(start), file].map(relative));
      return;
    }
    visiting.add(file);
    stack.push(file);
    for (const dep of graph.get(file) ?? []) visit(dep);
    stack.pop();
    visiting.delete(file);
    visited.add(file);
  }
  for (const file of graph.keys()) visit(file);
  return cycles;
}

const runtimeGraph = buildGraph(false);
const fullGraph = buildGraph(true);
const runtimeCycles = findCycles(runtimeGraph);
const fullCycles = findCycles(fullGraph);
assert.deepEqual(runtimeCycles, [], `frontend runtime relative-import cycles detected:\n${runtimeCycles.map((cycle) => cycle.join(' -> ')).join('\n')}`);

const knownTypeOnlyCycle = new Set(['src/store.ts', 'src/projects/projectPersistence.ts']);
const unexpectedFullCycles = fullCycles.filter((cycle) => {
  const members = new Set(cycle.slice(0, -1));
  return members.size !== knownTypeOnlyCycle.size || [...members].some((member) => !knownTypeOnlyCycle.has(member));
});
assert.deepEqual(unexpectedFullCycles, [], `unexpected frontend type/import cycles detected:\n${unexpectedFullCycles.map((cycle) => cycle.join(' -> ')).join('\n')}`);
assert.ok(fullCycles.some((cycle) => {
  const members = new Set(cycle.slice(0, -1));
  return members.size === knownTypeOnlyCycle.size && [...members].every((member) => knownTypeOnlyCycle.has(member));
}), 'documented store/projectPersistence type-only ownership cycle must remain explicit until it is intentionally extracted');

const violations = [];
for (const [file, deps] of fullGraph) {
  const fileRel = relative(file);
  for (const dep of deps) {
    const depRel = relative(dep);
    if (fileRel.startsWith('src/core/') && !depRel.startsWith('src/core/')) {
      violations.push(`${fileRel} -> ${depRel}: core must not depend on application/UI layers`);
    }
    if (fileRel.startsWith('src/commands/') && !depRel.startsWith('src/commands/')) {
      violations.push(`${fileRel} -> ${depRel}: command registry must stay independent from store/UI ownership`);
    }
    if (fileRel === 'src/store.ts' && /^(?:src\/components|src\/features|src\/commands)\//.test(depRel)) {
      violations.push(`${fileRel} -> ${depRel}: store must not depend on presentation/feature components`);
    }
    if (depRel === 'src/App.tsx' && fileRel !== 'src/main.tsx') {
      violations.push(`${fileRel} -> ${depRel}: App is a composition root and must not become a reusable dependency`);
    }
  }
}
assert.deepEqual(violations, [], `frontend boundary violations detected:\n${violations.join('\n')}`);

const main = fs.readFileSync(path.join(srcRoot, 'main.tsx'), 'utf8');
const errorBoundary = fs.readFileSync(path.join(srcRoot, 'components/AppErrorBoundary.tsx'), 'utf8');
const commandRegistry = fs.readFileSync(path.join(srcRoot, 'commands/commandRegistry.ts'), 'utf8');
const persistence = fs.readFileSync(path.join(srcRoot, 'projects/projectPersistence.ts'), 'utf8');
assert.match(main, /<AppErrorBoundary>[\s\S]*?<ProjectLifecycleProvider>[\s\S]*?<App \/>[\s\S]*?<\/ProjectLifecycleProvider>[\s\S]*?<\/AppErrorBoundary>/);
assert.match(errorBoundary, /componentDidCatch\(/);
assert.match(errorBoundary, /recordRuntimeError\('runtime\.react-error-boundary'/);
assert.doesNotMatch(commandRegistry, /from ['"]\.\.\/store['"]/);
assert.doesNotMatch(commandRegistry, /from ['"]\.\.\/components\//);
assert.doesNotMatch(commandRegistry, /from ['"]\.\.\/features\//);
assert.match(persistence, /import type \{[^}]*InspectorFilters[^}]*\} from ['"]\.\.\/store['"]/s);

const storeSize = fs.statSync(path.join(srcRoot, 'store.ts')).size;
const appSize = fs.statSync(path.join(srcRoot, 'App.tsx')).size;
assert.ok(storeSize < 100_000, `src/store.ts exceeded the temporary anti-growth ceiling: ${storeSize} bytes`);
assert.ok(appSize < 32_000, `src/App.tsx exceeded the temporary anti-growth ceiling: ${appSize} bytes`);

const roadmap = fs.readFileSync(path.join(root, 'docs/PRE_1_0_AUDIT_ROADMAP.md'), 'utf8');
const audit = fs.readFileSync(path.join(root, 'docs/audits/PRE_1_0_04_FRONTEND_ARCHITECTURE.md'), 'utf8');
assert.match(roadmap, /\| 04 \| Frontend architecture & component boundaries[\s\S]*?\| \*\*PASS\*\* \|/);
assert.match(roadmap, /Track 05 is next/);
assert.match(audit, /\*\*Status:\*\* PASS/);
assert.match(audit, /Finding 04-A/);
assert.match(audit, /Finding 04-B/);
assert.match(audit, /Finding 04-C/);

console.log(JSON.stringify({
  files: sourceFiles.length,
  runtimeRelativeEdges: [...runtimeGraph.values()].reduce((sum, deps) => sum + deps.length, 0),
  allRelativeEdges: [...fullGraph.values()].reduce((sum, deps) => sum + deps.length, 0),
  runtimeCycles: runtimeCycles.length,
  documentedTypeOnlyCycles: fullCycles.length,
  boundaryViolations: violations.length,
  storeBytes: storeSize,
  appBytes: appSize,
}, null, 2));
console.log('Pre-1.0 Audit 04 — Frontend Architecture: PASS');
