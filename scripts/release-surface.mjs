import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'release-spec', 'release-contract.json'), 'utf8'));
const publication = contract.updater.publication;

function render(pattern) {
  return pattern
    .replaceAll('{version}', contract.version.semver)
    .replaceAll('{displayVersion}', contract.version.display);
}

const canonicalInstaller = render(publication.installerAssetPattern);
const canonicalSignature = render(publication.installerSignaturePattern);
const isPrerelease = contract.version.semver.includes('-');
const requiredManifestNames = isPrerelease ? ['latest-preview.json'] : ['latest.json', 'latest-preview.json'];
const canonicalNames = new Set([
  canonicalInstaller,
  canonicalSignature,
  `${canonicalInstaller}.sha256`,
  ...requiredManifestNames,
  'THIRD_PARTY_NOTICES.txt',
  'RELEASE_SURFACE.json',
]);

const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  if (index + 1 >= args.length) throw new Error(`${name} requires a value`);
  return args[index + 1];
}
const checkOnly = args.includes('--check');
const inputDir = path.resolve(ROOT, option('--input') ?? 'release');
const outputDir = path.resolve(ROOT, option('--out') ?? 'release/public');
const installerDir = option('--installer-dir');
const repository = option('--repository') ?? process.env.HGW_GITHUB_REPOSITORY ?? '';

function validGithubRepository(value) {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function writeHashSidecar(file) {
  const hash = sha256(file);
  fs.writeFileSync(`${file}.sha256`, `${hash}  ${path.basename(file)}\n`);
  return hash;
}

function findNewestInstaller(directory) {
  const absolute = path.resolve(ROOT, directory);
  if (!fs.existsSync(absolute)) throw new Error(`installer directory does not exist: ${absolute}`);
  const candidates = fs.readdirSync(absolute)
    .filter((name) => /-setup\.exe$/i.test(name))
    .map((name) => ({ name, file: path.join(absolute, name), stat: fs.statSync(path.join(absolute, name)) }))
    .filter((entry) => entry.stat.isFile())
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs || a.name.localeCompare(b.name));
  if (candidates.length === 0) throw new Error(`no *-setup.exe found in ${absolute}`);
  return candidates[0].file;
}

function resolveInstallerSource() {
  if (installerDir) return findNewestInstaller(installerDir);
  const canonical = path.join(inputDir, canonicalInstaller);
  if (fs.existsSync(canonical)) return canonical;
  const legacy = path.join(inputDir, 'Hytale-Generator-Workbench-Setup.exe');
  if (fs.existsSync(legacy)) return legacy;
  throw new Error(`installer missing: expected ${canonicalInstaller} in ${inputDir}`);
}

function resolveSignatureSource(installerSource) {
  if (installerDir) {
    const source = `${installerSource}.sig`;
    if (fs.existsSync(source)) return source;
  }
  const canonical = path.join(inputDir, canonicalSignature);
  if (fs.existsSync(canonical)) return canonical;
  const adjacent = `${installerSource}.sig`;
  if (fs.existsSync(adjacent)) return adjacent;
  throw new Error(`updater signature missing for ${path.basename(installerSource)}`);
}

function assertFileHash(file, expected) {
  const actual = sha256(file);
  if (actual !== expected) throw new Error(`SHA-256 mismatch for ${path.basename(file)}`);
}

function assertHashSidecar(assetName) {
  const asset = path.join(outputDir, assetName);
  const sidecar = `${asset}.sha256`;
  if (!fs.existsSync(sidecar)) throw new Error(`release surface missing SHA-256 sidecar: ${path.basename(sidecar)}`);
  const expected = `${sha256(asset)}  ${assetName}\n`;
  const actual = fs.readFileSync(sidecar, 'utf8');
  if (actual !== expected) throw new Error(`SHA-256 sidecar mismatch for ${assetName}`);
}

function expectedUpdaterManifest(repositoryName, signature) {
  return {
    version: contract.version.semver,
    notes: `${contract.product.name} ${contract.version.display}`,
    platforms: {
      'windows-x86_64': {
        signature,
        url: `https://github.com/${repositoryName}/releases/download/v${contract.version.semver}/${canonicalInstaller}`,
      },
    },
  };
}

function assertUpdaterManifest(name, surfaceManifest, signature) {
  const file = path.join(outputDir, name);
  if (!fs.existsSync(file)) throw new Error(`release surface missing updater manifest: ${name}`);
  const actual = JSON.parse(fs.readFileSync(file, 'utf8'));
  const expected = expectedUpdaterManifest(surfaceManifest.repository, signature);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${name} does not match canonical updater manifest`);
}

function validateSurface() {
  if (!fs.existsSync(outputDir)) throw new Error(`release surface is missing: ${outputDir}`);
  const entries = fs.readdirSync(outputDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) throw new Error(`release surface must contain files only: ${entry.name}`);
    if (!canonicalNames.has(entry.name)) throw new Error(`unexpected release-surface file: ${entry.name}`);
  }
  const required = [
    canonicalInstaller,
    canonicalSignature,
    `${canonicalInstaller}.sha256`,
    'THIRD_PARTY_NOTICES.txt',
    'RELEASE_SURFACE.json',
    ...requiredManifestNames,
  ];
  for (const name of required) {
    if (!fs.existsSync(path.join(outputDir, name))) throw new Error(`release surface missing required file: ${name}`);
  }
  if (isPrerelease && fs.existsSync(path.join(outputDir, 'latest.json'))) {
    throw new Error('prerelease release surface must not contain latest.json for the stable channel');
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, 'RELEASE_SURFACE.json'), 'utf8'));
  if (manifest.version !== contract.version.semver || manifest.displayVersion !== contract.version.display) {
    throw new Error('release surface identity does not match release contract');
  }
  if (!validGithubRepository(manifest.repository)) throw new Error('release surface repository identity is invalid');
  if (manifest.channelClass !== (isPrerelease ? 'preview' : 'stable')) throw new Error('release surface channel class mismatch');
  if (manifest.sourceIncluded !== false || manifest.testsIncluded !== false || manifest.devToolingIncluded !== false) {
    throw new Error('release surface must explicitly exclude source, tests and developer tooling');
  }
  const manifestNames = new Set(manifest.files.map((entry) => entry.name));
  for (const entry of manifest.files) {
    const file = path.join(outputDir, entry.name);
    if (!fs.existsSync(file)) throw new Error(`manifest references missing file: ${entry.name}`);
    assertFileHash(file, entry.sha256);
  }
  for (const requiredName of [canonicalInstaller, canonicalSignature, ...requiredManifestNames]) {
    if (!manifestNames.has(requiredName)) throw new Error(`release surface manifest does not contain ${requiredName}`);
  }
  assertHashSidecar(canonicalInstaller);
  const signature = fs.readFileSync(path.join(outputDir, canonicalSignature), 'utf8').trim();
  if (!signature) throw new Error('updater signature file is empty');
  for (const name of requiredManifestNames) assertUpdaterManifest(name, manifest, signature);
  console.log(`release surface check: PASS (${contract.version.display}; ${manifest.channelClass}; ${entries.length} files)`);
}

if (checkOnly) {
  validateSurface();
  process.exit(0);
}

if (!validGithubRepository(repository)) {
  throw new Error('release surface requires --repository owner/name (or HGW_GITHUB_REPOSITORY) so updater URLs cannot be guessed');
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const staged = [];
function stage(source, canonicalName, sidecar = false) {
  const target = path.join(outputDir, canonicalName);
  fs.copyFileSync(source, target);
  const hash = sha256(target);
  if (sidecar) writeHashSidecar(target);
  staged.push({ name: canonicalName, size: fs.statSync(target).size, sha256: hash });
}
function stageGenerated(name, content) {
  const target = path.join(outputDir, name);
  fs.writeFileSync(target, content);
  staged.push({ name, size: fs.statSync(target).size, sha256: sha256(target) });
}

const installer = resolveInstallerSource();
stage(installer, canonicalInstaller, true);
stage(resolveSignatureSource(installer), canonicalSignature, false);
stage(path.join(ROOT, 'THIRD_PARTY_NOTICES.txt'), 'THIRD_PARTY_NOTICES.txt', false);

const signature = fs.readFileSync(path.join(outputDir, canonicalSignature), 'utf8').trim();
if (!signature) throw new Error('updater signature file is empty');
const updaterManifest = `${JSON.stringify(expectedUpdaterManifest(repository, signature), null, 2)}\n`;
if (!isPrerelease) stageGenerated('latest.json', updaterManifest);
stageGenerated('latest-preview.json', updaterManifest);

const manifest = {
  schemaVersion: 2,
  product: contract.product.name,
  version: contract.version.semver,
  displayVersion: contract.version.display,
  buildId: contract.version.buildId,
  repository,
  channelClass: isPrerelease ? 'preview' : 'stable',
  sourceIncluded: false,
  testsIncluded: false,
  devToolingIncluded: false,
  files: staged,
};
fs.writeFileSync(path.join(outputDir, 'RELEASE_SURFACE.json'), `${JSON.stringify(manifest, null, 2)}\n`);

validateSurface();
console.log(`release surface staged: ${path.relative(ROOT, outputDir)}`);
