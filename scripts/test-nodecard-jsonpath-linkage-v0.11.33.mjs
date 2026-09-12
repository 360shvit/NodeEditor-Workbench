import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const source = read('src/components/NodeCard.tsx');
const embedded = read('tauri-ui/app.js');

assert.match(
  source,
  /import\s*\{[\s\S]*?\bjsonPathKey\b[\s\S]*?\}\s*from\s*['"]\.\.\/core['"]/,
  'NodeCard must import jsonPathKey from the core barrel instead of relying on a free runtime identifier',
);

const start = embedded.indexOf('define("components/NodeCard"');
const end = embedded.indexOf('\ndefine("components/ReferenceDrawer"', start);
assert.ok(start >= 0 && end > start, 'packaged NodeCard AMD module must exist');
const nodeCardModule = embedded.slice(start, end);

assert.match(nodeCardModule, /\(0, core_\d+\.jsonPathKey\)\(change\.jsonPath\)/);
assert.match(nodeCardModule, /\(0, core_\d+\.jsonPathKey\)\(field\.jsonPath\)/);
assert.doesNotMatch(
  nodeCardModule,
  /(^|[^.\w])jsonPathKey\(/m,
  'packaged NodeCard must not contain a bare jsonPathKey(...) call',
);

// Guard the whole source tree against the same class of regression: every file
// that calls jsonPathKey must either define it or import it explicitly.
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}
for (const file of walk('src')) {
  const text = read(file);
  if (!/\bjsonPathKey\s*\(/.test(text)) continue;
  if (/function\s+jsonPathKey\s*\(/.test(text)) continue;
  assert.match(text, /import\s*\{[\s\S]*?\bjsonPathKey\b[\s\S]*?\}\s*from\s*['"][^'"]+['"]/, `${file} calls jsonPathKey without importing it`);
}

// In the packaged AMD bundle, jsonPathKey calls outside its own function
// definition must always be module-qualified. A free call would become the
// exact ReferenceError caught by the Windows owner test.
const embeddedWithoutDefinition = embedded.replace(/function jsonPathKey\(path\) \{[\s\S]*?\n    \}/, '');
assert.doesNotMatch(
  embeddedWithoutDefinition,
  /(^|[^.\w])jsonPathKey\(/m,
  'packaged app contains an unqualified jsonPathKey(...) runtime call',
);

console.log('PASS v0.11.33 jsonPathKey source/package linkage');
