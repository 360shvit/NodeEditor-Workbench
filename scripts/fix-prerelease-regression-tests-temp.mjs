import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, text) => fs.writeFileSync(file, text);

function replaceOrVerify(file, before, after) {
  const source = read(file);
  if (source.includes(before)) {
    if (source.indexOf(before) !== source.lastIndexOf(before)) throw new Error(`${file}: expected text is not unique`);
    write(file, source.replace(before, after));
    return true;
  }
  if (!source.includes(after)) throw new Error(`${file}: neither stale nor replacement text found`);
  return false;
}

function ensureCompareImport(file) {
  const source = read(file);
  if (source.includes("from './release-version.mjs'")) return false;
  const marker = "import fs from 'node:fs';\n";
  if (!source.includes(marker)) throw new Error(`${file}: fs import marker not found`);
  write(file, source.replace(marker, `${marker}import { compareSemver } from './release-version.mjs';\n`));
  return true;
}

const directBuildIdBefore = "assert.match(read('BUILD_ID.txt'), /v0\\.11\\.[0-9]+-r[0-9]+-[a-z0-9-]+/);";
const directBuildIdAfter = "assert.equal(read('BUILD_ID.txt').trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);";
const variableBuildIdBefore = "assert.match(buildId, /v0\\.11\\.[0-9]+-r[0-9]+-[a-z0-9-]+/);";
const variableBuildIdAfter = "assert.equal(buildId.trim(), JSON.parse(read('release-spec/release-contract.json')).version.buildId);";
let directBuildIdUpdates = 0;
let variableBuildIdUpdates = 0;
for (const name of fs.readdirSync('scripts').filter((name) => name.endsWith('.mjs'))) {
  const file = path.join('scripts', name);
  let source = read(file);
  if (source.includes(directBuildIdBefore)) {
    source = source.replaceAll(directBuildIdBefore, directBuildIdAfter);
    directBuildIdUpdates += 1;
  }
  if (source.includes(variableBuildIdBefore)) {
    source = source.replaceAll(variableBuildIdBefore, variableBuildIdAfter);
    variableBuildIdUpdates += 1;
  }
  write(file, source);
}
console.log(`Canonical BUILD_ID assertions updated: direct=${directBuildIdUpdates}, variable=${variableBuildIdUpdates}.`);

const historicalFiles = [
  'scripts/test-deep-clean-v0.11.35-r3.mjs',
  'scripts/test-bootstrap-typecheck-fix-v0.11.35-r4.mjs',
  'scripts/test-windows-bundle-spawn-fix-v0.11.35-r5.mjs',
  'scripts/test-windows-test-typescript-spawn-fix-v0.11.35-r6.mjs',
  'scripts/test-lockfile-bootstrap-contract-fix-v0.11.35-r7.mjs',
  'scripts/test-temp-release-dependency-context-fix-v0.11.35-r9.mjs',
  'scripts/test-public-repo-clean-v0.11.35-r10.mjs',
];
for (const file of historicalFiles) ensureCompareImport(file);

for (const file of [
  'scripts/test-deep-clean-v0.11.35-r3.mjs',
  'scripts/test-bootstrap-typecheck-fix-v0.11.35-r4.mjs',
  'scripts/test-windows-bundle-spawn-fix-v0.11.35-r5.mjs',
  'scripts/test-temp-release-dependency-context-fix-v0.11.35-r9.mjs',
  'scripts/test-public-repo-clean-v0.11.35-r10.mjs',
]) {
  replaceOrVerify(
    file,
    "assert.equal(contract.version.semver, '0.11.35');",
    "assert.ok(compareSemver(contract.version.semver, '0.11.35') >= 0, 'current release must not precede the v0.11.35 fix baseline');",
  );
}

replaceOrVerify(
  'scripts/test-bootstrap-typecheck-fix-v0.11.35-r4.mjs',
  "assert.match(contract.version.revision, /^r[4-9]$|^r[1-9]\\d+$/, 'current candidate must be r4 or later');",
  "if (contract.version.semver === '0.11.35') assert.match(contract.version.revision, /^r[4-9]$|^r[1-9]\\d+$/, 'v0.11.35 candidates must be r4 or later');",
);
replaceOrVerify(
  'scripts/test-windows-bundle-spawn-fix-v0.11.35-r5.mjs',
  "assert.match(contract.version.revision, /^r(?:[5-9]|[1-9]\\d+)$/, 'current candidate must be r5 or later');",
  "if (contract.version.semver === '0.11.35') assert.match(contract.version.revision, /^r(?:[5-9]|[1-9]\\d+)$/, 'v0.11.35 candidates must be r5 or later');",
);
replaceOrVerify(
  'scripts/test-windows-test-typescript-spawn-fix-v0.11.35-r6.mjs',
  "assert.ok(Number(contract.version.revision.slice(1)) >= 6, 'current candidate must be r6 or later');",
  "assert.ok(compareSemver(contract.version.semver, '0.11.35') > 0 || Number(contract.version.revision.slice(1)) >= 6, 'v0.11.35 candidates must be r6 or later; later SemVer releases inherit this fix');",
);
replaceOrVerify(
  'scripts/test-lockfile-bootstrap-contract-fix-v0.11.35-r7.mjs',
  "assert.ok(Number(contract.version.revision.slice(1)) >= 7, 'current candidate must be r7 or later');",
  "assert.ok(compareSemver(contract.version.semver, '0.11.35') > 0 || Number(contract.version.revision.slice(1)) >= 7, 'v0.11.35 candidates must be r7 or later; later SemVer releases inherit this fix');",
);
replaceOrVerify(
  'scripts/test-temp-release-dependency-context-fix-v0.11.35-r9.mjs',
  "assert.match(contract.version.revision, /^r(?:9|[1-9]\\d+)$/, 'r9 fix must survive later internal revisions');",
  "if (contract.version.semver === '0.11.35') assert.match(contract.version.revision, /^r(?:9|[1-9]\\d+)$/, 'v0.11.35 candidates must be r9 or later');",
);
replaceOrVerify(
  'scripts/test-public-repo-clean-v0.11.35-r10.mjs',
  "assert.match(contract.version.revision, /^r(?:10|1[1-9]|[2-9]\\d|\\d{3,})$/);",
  "if (contract.version.semver === '0.11.35') assert.match(contract.version.revision, /^r(?:10|1[1-9]|[2-9]\\d|\\d{3,})$/, 'v0.11.35 candidates must be r10 or later');",
);

const releaseSurfaceFile = 'scripts/test-release-surface-restructure-v0.11.34.mjs';
let releaseSurface = read(releaseSurfaceFile);
if (!releaseSurface.includes("const isPrerelease = contract.version.semver.includes('-');")) {
  const startMarker = "  const names = fs.readdirSync(fixture.output).sort();\n";
  const endMarker = "\n  const check = spawnSync(process.execPath, ['scripts/release-surface.mjs', '--check', '--out', fixture.output], { encoding: 'utf8' });";
  const start = releaseSurface.indexOf(startMarker);
  const end = releaseSurface.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('release-surface test: current-surface assertion block not found');
  const replacement = `  const names = fs.readdirSync(fixture.output).sort();
  const isPrerelease = contract.version.semver.includes('-');
  const expectedNames = [
    'RELEASE_SURFACE.json',
    'THIRD_PARTY_NOTICES.txt',
    fixture.installer,
    \`${'${fixture.installer}'}.sha256\`,
    fixture.signature,
    'latest-preview.json',
    ...(isPrerelease ? [] : ['latest.json']),
  ].sort();
  assert.deepEqual(names, expectedNames);
  assert.ok(!names.includes('source.zip'));
  assert.ok(!names.includes('test-results.txt'));

  const preview = JSON.parse(read(path.join(fixture.output, 'latest-preview.json')));
  assert.equal(preview.version, contract.version.semver);
  assert.equal(preview.platforms['windows-x86_64'].signature, read(path.join(fixture.output, fixture.signature)).trim());
  assert.equal(preview.platforms['windows-x86_64'].url, \`https://github.com/example/hgw/releases/download/v${'${contract.version.semver}'}/${'${fixture.installer}'}\`);
  if (isPrerelease) {
    assert.ok(!fs.existsSync(path.join(fixture.output, 'latest.json')), 'prerelease must not emit Stable rolling manifest');
  } else {
    const latest = JSON.parse(read(path.join(fixture.output, 'latest.json')));
    assert.deepEqual(preview, latest, 'stable release should also advance Preview to the same stable version');
  }
`;
  releaseSurface = `${releaseSurface.slice(0, start)}${replacement}${releaseSurface.slice(end)}`;
  write(releaseSurfaceFile, releaseSurface);
}

console.log('Prerelease-aware release regression contracts prepared.');
