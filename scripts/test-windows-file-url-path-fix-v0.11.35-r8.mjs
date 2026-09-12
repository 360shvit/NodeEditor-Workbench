import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptsDir = path.join(root, 'scripts');
const offenders = [];
for (const name of readdirSync(scriptsDir)) {
  if (!/\.(?:mjs|js)$/.test(name)) continue;
  const text = readFileSync(path.join(scriptsDir, name), 'utf8');
  if (/new URL\([^\n]*import\.meta\.url\)\.pathname/.test(text)) offenders.push(name);
}
assert.deepEqual(offenders, [], `filesystem paths must use fileURLToPath(), not URL.pathname: ${offenders.join(', ')}`);

const reactCompat = readFileSync(path.join(scriptsDir, 'test-react-compat-v0.9.4-r2.mjs'), 'utf8');
assert.match(reactCompat, /fileURLToPath\(new URL\('\.\.', import\.meta\.url\)\)/);
const carryAudit = readFileSync(path.join(scriptsDir, 'audit-unused-carry-v0.9.4.mjs'), 'utf8');
assert.match(carryAudit, /fileURLToPath\(new URL\('\.\.\/src', import\.meta\.url\)\)/);

console.log('v0.11.35-r8 Windows file-URL path contract: PASS');
