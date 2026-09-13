import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;
if (outputIndex >= 0 && !outputPath) throw new Error('--output requires a path');

const read = (file) => fs.readFileSync(file, 'utf8');
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const packageLockPath = 'package-lock.json';
const cargoLockPath = 'src-tauri/Cargo.lock';
const cargoManifestPath = 'src-tauri/Cargo.toml';

for (const required of [packageLockPath, cargoLockPath, cargoManifestPath]) {
  if (!fs.existsSync(required)) throw new Error(`Required dependency input is missing: ${required}`);
}

const packageLock = JSON.parse(read(packageLockPath));
if (packageLock.lockfileVersion !== 3) throw new Error(`Unsupported package-lock version: ${packageLock.lockfileVersion}`);

const npmPackages = Object.entries(packageLock.packages ?? {})
  .filter(([lockPath]) => lockPath !== '')
  .map(([lockPath, metadata]) => {
    const marker = 'node_modules/';
    const markerIndex = lockPath.lastIndexOf(marker);
    const name = markerIndex >= 0 ? lockPath.slice(markerIndex + marker.length) : lockPath;
    return {
      ecosystem: 'npm',
      name,
      version: metadata.version ?? null,
      license: metadata.license ?? null,
      scope: metadata.dev || metadata.devOptional ? 'development' : 'runtime',
      source: metadata.resolved ?? null,
    };
  });

const cargo = spawnSync(
  'cargo',
  ['metadata', '--locked', '--format-version', '1', '--manifest-path', cargoManifestPath],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);
if (cargo.status !== 0) {
  process.stderr.write(cargo.stderr || 'cargo metadata failed\n');
  process.exit(cargo.status || 1);
}

const cargoMetadata = JSON.parse(cargo.stdout);
const resolvedPackageIds = new Set((cargoMetadata.resolve?.nodes ?? []).map((node) => node.id));
const cargoPackages = (cargoMetadata.packages ?? [])
  .filter((pkg) => pkg.source && resolvedPackageIds.has(pkg.id))
  .map((pkg) => ({
    ecosystem: 'cargo',
    name: pkg.name,
    version: pkg.version,
    license: pkg.license ?? null,
    licenseFile: pkg.license_file ? path.basename(pkg.license_file) : null,
    source: pkg.source,
  }));

const packages = [...npmPackages, ...cargoPackages].sort((a, b) =>
  a.ecosystem.localeCompare(b.ecosystem) ||
  a.name.localeCompare(b.name) ||
  String(a.version).localeCompare(String(b.version)) ||
  String(a.source).localeCompare(String(b.source)),
);

const missingLicense = packages.filter((pkg) => !pkg.license && !pkg.licenseFile);
const invalidVersion = packages.filter((pkg) => !pkg.name || !pkg.version);
if (invalidVersion.length > 0) {
  throw new Error(`Dependency inventory contains ${invalidVersion.length} package(s) without name/version metadata.`);
}
if (missingLicense.length > 0) {
  const names = missingLicense.map((pkg) => `${pkg.ecosystem}:${pkg.name}@${pkg.version}`).join(', ');
  throw new Error(`Dependency inventory contains package(s) without declared license metadata: ${names}`);
}

const report = {
  schemaVersion: 1,
  inputs: {
    packageLock: { path: packageLockPath, sha256: sha256(packageLockPath) },
    cargoLock: { path: cargoLockPath, sha256: sha256(cargoLockPath) },
  },
  counts: {
    total: packages.length,
    npm: npmPackages.length,
    cargo: cargoPackages.length,
  },
  packages,
};

if (outputPath) {
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Third-party inventory written to ${outputPath}`);
}

const licenseExpressions = [...new Set(packages.map((pkg) => pkg.license ?? `FILE:${pkg.licenseFile}`))].sort();
console.log(`Third-party inventory: PASS (${report.counts.npm} npm, ${report.counts.cargo} Cargo, ${report.counts.total} total)`);
console.log(`Declared license expressions/files: ${licenseExpressions.join(', ')}`);
