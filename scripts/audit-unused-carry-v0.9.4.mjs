import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, dirname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../src', import.meta.url)));
const sourceExtensions = new Set(['.ts', '.tsx']);

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : sourceExtensions.has(extname(path)) ? [path] : [];
  });
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return undefined;
  let base = resolve(dirname(fromFile), specifier);
  if (/\.(js|jsx|mjs)$/.test(base)) base = base.replace(/\.(js|jsx|mjs)$/, '');
  const candidates = [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')];
  return candidates.find((candidate) => {
    try { return statSync(candidate).isFile(); } catch { return false; }
  });
}

const files = walk(root);
const graph = new Map();
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const specs = [...source.matchAll(/(?:import|export)[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  const sideEffects = [...source.matchAll(/import\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  graph.set(file, [...new Set([...specs, ...sideEffects].map((specifier) => resolveImport(file, specifier)).filter(Boolean))]);
}

const entry = join(root, 'main.tsx');
const reachable = new Set();
const stack = [entry];
while (stack.length) {
  const file = stack.pop();
  if (!file || reachable.has(file)) continue;
  reachable.add(file);
  for (const dependency of graph.get(file) ?? []) stack.push(dependency);
}

const unreachable = files
  .filter((file) => !reachable.has(file))
  .map((file) => relative(root, file).replaceAll('\\', '/'))
  .filter((file) => file !== 'io/fileSystemAccess.d.ts');

console.log(JSON.stringify({ unreachable }, null, 2));
if (unreachable.length) {
  console.error(`Unexpected unreachable source files: ${unreachable.join(', ')}`);
  process.exitCode = 1;
}
