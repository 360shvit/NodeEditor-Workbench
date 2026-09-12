import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { buildProject, emptyChangeSet, renameSymbol, applyChangeSet, symbolKey } from '../.core-build/index.js';

const root = process.argv[2];
async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.name.toLowerCase().endsWith('.json')) out.push(full);
  }
  return out;
}
const files = await walk(root);
const inputs = await Promise.all(files.map(async (full) => ({
  path: path.relative(root, full).split(path.sep).join('/'),
  text: await fs.readFile(full, 'utf8'),
})));
const project = buildProject(inputs);
const record = project.symbolIndex.get(symbolKey('Density', 'Ps-Rocks'));
assert.ok(record, 'Ps-Rocks must exist in the real project');
let changes = emptyChangeSet();
changes = renameSymbol(project, changes, 'Density', 'Ps-Rocks', 'Ps-Generativ-Rocks', { includeLive: true, includeFloating: false });
const preview = applyChangeSet(project, changes).project;
const renamed = preview.symbolIndex.get(symbolKey('Density', 'Ps-Generativ-Rocks'));
assert.ok(renamed);
assert.equal(renamed.definitions.length, record.definitions.filter(x => x.location === 'live').length);
assert.equal(renamed.references.length, record.references.filter(x => x.location === 'live').length);
assert.ok(preview.diagnostics.filter(d => d.severity === 'error').length <= project.diagnostics.filter(d => d.severity === 'error').length);
console.log(JSON.stringify({
  oldDefinitions: record.definitions.length,
  oldReferences: record.references.length,
  stagedChanges: changes.changes.length,
  liveRenameDefinitions: renamed.definitions.length,
  liveRenameReferences: renamed.references.length,
  baselineErrors: project.diagnostics.filter(d => d.severity === 'error').length,
  previewErrors: preview.diagnostics.filter(d => d.severity === 'error').length,
}, null, 2));
