import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { buildProject, buildEditorMetadataForFile, summarizeGeometry } from '../.core-build/index.js';

const root = process.argv[2];
if (!root) throw new Error('Usage: node scripts/test-real-geometry.mjs <HytaleGenerator-root>');
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
const graphFiles = project.files.filter((file) => {
  const metadata = buildEditorMetadataForFile(file);
  return file.nodes.some((node) => metadata.nodes.get(node.id)?.position);
});
const summary = summarizeGeometry(graphFiles, true, true);
assert.equal(summary.unpositioned, 0, 'all nodes in the selected real graph files should carry editor positions');
assert.equal(summary.fallback, 0, 'real regression project should resolve geometry without fallback');
console.log(JSON.stringify({ graphFiles: graphFiles.length, ...summary }, null, 2));
