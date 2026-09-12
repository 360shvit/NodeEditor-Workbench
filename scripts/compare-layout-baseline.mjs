import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { buildEditorMetadataForFile, buildLayoutProposal, buildProject } from '../.core-build/index.js';

const root = process.argv[2];
if (!root) throw new Error('Usage: npm run typecheck:core && node scripts/compare-layout-baseline.mjs <fixture-root>');
const manifestPath = new URL('./layout-baseline-v0.7.2.json', import.meta.url);
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function sha256(value) {
  const bytes = typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

const inputs = [];
for (const [name, expectedHash] of Object.entries(manifest.fixtures)) {
  const text = await fs.readFile(path.join(root, name), 'utf8');
  assert.equal(sha256(text), expectedHash, `${name}: fixture differs from the recorded v0.7.2 baseline input`);
  inputs.push({ path: name, text });
}
const project = buildProject(inputs);
const graphFiles = project.files.filter((file) => {
  const metadata = buildEditorMetadataForFile(file);
  return file.nodes.some((node) => metadata.nodes.get(node.id)?.position);
});

const quick = process.argv.includes('--quick');
const selectedCases = quick ? manifest.cases.filter((testCase) => !testCase.name.startsWith('author-50') && !testCase.name.startsWith('author-100')) : manifest.cases;
const results = [];
for (const testCase of selectedCases) {
  const proposal = buildLayoutProposal(graphFiles, testCase.settings);
  const canonical = stable({ ...proposal, createdAt: 0 });
  const actual = sha256(canonical);
  assert.equal(actual, testCase.sha256, `${testCase.name}: layout proposal changed from v0.7.2 golden baseline`);
  results.push({ name: testCase.name, sha256: actual, patches: proposal.patches.length, blocked: proposal.blocked });
}
console.log(JSON.stringify({ baseline: manifest.label, identical: true, quick, cases: results }, null, 2));
