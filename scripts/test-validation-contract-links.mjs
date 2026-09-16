import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const pkg = JSON.parse(read('package.json'));

const missingTargets = [];
const collectNodeTargets = (owner, source) => {
  for (const match of source.matchAll(/\bnode\s+(scripts\/[A-Za-z0-9._/-]+\.mjs)\b/g)) {
    if (!exists(match[1])) missingTargets.push(`${owner} -> ${match[1]}`);
  }
};

for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
  if (name.startsWith('test:')) collectNodeTargets(`package:${name}`, command);
}

for (const name of fs.readdirSync('.github/workflows').filter((entry) => entry.endsWith('.yml') || entry.endsWith('.yaml'))) {
  collectNodeTargets(`workflow:${name}`, read(path.join('.github/workflows', name)));
}

const testFiles = fs.readdirSync('scripts').filter((name) => name.startsWith('test-') && name.endsWith('.mjs'));
const activeCrossTestReferences = [];

// Only treat references as dependencies when the test actually consumes or executes the
// referenced script. Historical cleanup tests intentionally contain names of retired test
// files in negative existence assertions; those are evidence of removal, not stale links.
const activeReferencePatterns = [
  { kind: 'read', pattern: /\bread\(\s*['"]scripts\/(test-[A-Za-z0-9._-]+\.mjs)['"]\s*\)/g },
  { kind: 'readFileSync', pattern: /\breadFileSync\(\s*['"]scripts\/(test-[A-Za-z0-9._-]+\.mjs)['"]/g },
  { kind: 'scriptsDir-read', pattern: /\breadFileSync\(\s*path\.join\(\s*scriptsDir\s*,\s*['"](test-[A-Za-z0-9._-]+\.mjs)['"]\s*\)/g },
  { kind: 'spawn', pattern: /\bspawnSync\(\s*process\.execPath\s*,\s*\[\s*['"]scripts\/(test-[A-Za-z0-9._-]+\.mjs)['"]/g },
  { kind: 'exec', pattern: /\bexecFileSync\(\s*process\.execPath\s*,\s*\[\s*['"]scripts\/(test-[A-Za-z0-9._-]+\.mjs)['"]/g },
  { kind: 'gate', pattern: /\b(?:const|let|var)\s+gate\s*=\s*['"]scripts\/(test-[A-Za-z0-9._-]+\.mjs)['"]/g },
];

for (const name of testFiles) {
  const source = read(path.join('scripts', name));
  for (const { kind, pattern } of activeReferencePatterns) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const target = `scripts/${match[1]}`;
      if (target === `scripts/${name}`) continue;
      activeCrossTestReferences.push(`${name} -> ${match[1]} (${kind})`);
      if (!exists(target)) missingTargets.push(`test:${name} -> ${target} (${kind})`);
    }
  }
}
assert.deepEqual(missingTargets, [], `validation contracts reference missing active script targets:\n${missingTargets.join('\n')}`);

// The release-integrity split deliberately moved the expensive temp-project mutation
// contract out of the fast PR suite. Keep historical regression ownership attached to
// the new deep suite so a future refactor cannot silently recreate the stale-reference
// failure that motivated this audit.
const r9 = read('scripts/test-temp-release-dependency-context-fix-v0.11.35-r9.mjs');
assert.match(r9, /test-release-integrity-deep-v0\.11\.34\.mjs/);
assert.doesNotMatch(r9, /const releaseIntegrity = read\('scripts\/test-release-integrity-v0\.11\.34\.mjs'\)/);

const deep = 'node scripts/test-release-integrity-deep-v0.11.34.mjs';
const rcWorkflow = read('.github/workflows/validate-release-candidate.yml');
const releaseWorkflow = read('.github/workflows/release-windows.yml');
assert.ok(rcWorkflow.includes(deep), 'RC workflow must execute deep release-integrity validation');
assert.ok(releaseWorkflow.includes(deep), 'publish validation must execute deep release-integrity validation');

// Flag the most dangerous form of version coupling: asserting that the current release
// identity equals a historical literal. Historical tests may branch on an old version to
// enforce a minimum revision, but the current identity itself must not be pinned forever.
const exactVersionCouplings = [];
for (const name of testFiles) {
  const source = read(path.join('scripts', name));
  const patterns = [
    /assert\.(?:equal|strictEqual)\(\s*contract\.version\.semver\s*,\s*['"]\d+\.\d+\.\d+(?:-[^'"]+)?['"]/g,
    /assert\.(?:equal|strictEqual)\(\s*pkg\.version\s*,\s*['"]\d+\.\d+\.\d+(?:-[^'"]+)?['"]/g,
    /assert\.(?:equal|strictEqual)\(\s*config\.version\s*,\s*['"]\d+\.\d+\.\d+(?:-[^'"]+)?['"]/g,
  ];
  if (patterns.some((pattern) => pattern.test(source))) exactVersionCouplings.push(name);
}
assert.deepEqual(exactVersionCouplings, [], `tests pin the current release to historical exact SemVer literals: ${exactVersionCouplings.join(', ')}`);

// The matrix bypasses exactly these npm wrappers after producing one shared core build.
// Fail closed if a wrapper gains extra work later so the optimization cannot silently skip it.
const directCoreSuites = new Map([
  ['test:core', 'node scripts/test-core.mjs'],
  ['test:performance-tracing', 'node scripts/test-performance-tracing-v0.11.1.mjs'],
  ['test:performance-optimization', 'node scripts/test-performance-optimization-v0.11.5.mjs'],
]);
for (const [name, directCommand] of directCoreSuites) {
  assert.equal(pkg.scripts[name], `npm run typecheck:core && ${directCommand}`, `${name} wrapper changed; update the shared-core matrix contract before bypassing it`);
}

console.log(`validation contract link audit: PASS (${testFiles.length} test files; ${activeCrossTestReferences.length} active cross-test references checked)`);
