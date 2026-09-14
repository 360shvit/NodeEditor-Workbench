import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CARGO_MANIFEST = path.join(ROOT, 'src-tauri', 'Cargo.toml');
const PACKAGE_LOCK = path.join(ROOT, 'package-lock.json');
const DEFAULT_TARGET = 'x86_64-pc-windows-msvc';

const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  if (index + 1 >= args.length) throw new Error(`${name} requires a value`);
  return args[index + 1];
}

const target = option('--target') ?? DEFAULT_TARGET;
const output = option('--output');

function cargoMetadata(extraArgs = []) {
  const result = spawnSync(
    'cargo',
    ['metadata', '--locked', '--format-version', '1', '--manifest-path', CARGO_MANIFEST, ...extraArgs],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stderr || 'cargo metadata failed\n');
    process.exit(result.status || 1);
  }
  return JSON.parse(result.stdout);
}

function packageIsProcMacro(pkg) {
  return (pkg.targets ?? []).some((targetInfo) => (targetInfo.kind ?? []).includes('proc-macro'));
}

function sourceCodeUrl(pkg) {
  if (typeof pkg.source === 'string' && pkg.source.startsWith('registry+')) {
    return `https://crates.io/crates/${encodeURIComponent(pkg.name)}/${encodeURIComponent(pkg.version)}`;
  }
  return pkg.repository ?? pkg.homepage ?? null;
}

function discoverComplianceFiles(pkg) {
  const packageDir = path.dirname(pkg.manifest_path);
  const found = new Set();
  const legalName = /^(LICENSE|LICENCE|COPYING|NOTICE|COPYRIGHT)(?:$|[._-])/i;

  function addFile(absolute) {
    try {
      if (!fs.statSync(absolute).isFile()) return;
      found.add(path.relative(packageDir, absolute).replaceAll('\\', '/'));
    } catch {
      // A missing candidate is handled by the aggregate review below.
    }
  }

  if (pkg.license_file) addFile(pkg.license_file);

  function walk(dir, depth) {
    if (depth > 2) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isFile() && legalName.test(entry.name)) {
        addFile(absolute);
      } else if (entry.isDirectory() && depth < 2 && /^(licenses?|legal|notices?)$/i.test(entry.name)) {
        walk(absolute, depth + 1);
      }
    }
  }

  walk(packageDir, 0);
  return [...found].sort((a, b) => a.localeCompare(b));
}

function normalizeCargoPackage(pkg, classification, reason) {
  const complianceFiles = classification === 'runtime' ? discoverComplianceFiles(pkg) : [];
  return {
    ecosystem: 'cargo',
    name: pkg.name,
    version: pkg.version,
    license: pkg.license ?? null,
    licenseFile: pkg.license_file ? path.basename(pkg.license_file) : null,
    classification,
    reason,
    source: pkg.source,
    repository: pkg.repository ?? null,
    sourceCodeUrl: classification === 'runtime' ? sourceCodeUrl(pkg) : null,
    complianceFiles,
    noticeFiles: complianceFiles.filter((file) => /^NOTICE(?:$|[._-])/i.test(path.basename(file))),
  };
}

function classifyCargo(fullMetadata, targetMetadata) {
  const fullNodes = new Map((fullMetadata.resolve?.nodes ?? []).map((node) => [node.id, node]));
  const targetNodes = new Map((targetMetadata.resolve?.nodes ?? []).map((node) => [node.id, node]));
  const fullPackages = new Map((fullMetadata.packages ?? []).map((pkg) => [pkg.id, pkg]));
  const targetPackages = new Map((targetMetadata.packages ?? []).map((pkg) => [pkg.id, pkg]));
  const rootManifest = path.resolve(CARGO_MANIFEST);
  const root = (targetMetadata.packages ?? []).find((pkg) => !pkg.source && path.resolve(pkg.manifest_path) === rootManifest);
  if (!root) throw new Error('Unable to identify root Cargo package for distribution classification.');

  const reached = new Map();
  const visited = new Set();
  const mark = (id, kind) => {
    if (!reached.has(id)) reached.set(id, new Set());
    reached.get(id).add(kind);
  };

  function walk(id, context) {
    const visitKey = `${id}\u0000${context}`;
    if (visited.has(visitKey)) return;
    visited.add(visitKey);
    mark(id, context);
    const node = targetNodes.get(id);
    if (!node) return;
    for (const dep of node.deps ?? []) {
      const depPkg = targetPackages.get(dep.pkg);
      if (!depPkg) continue;
      const depKinds = dep.dep_kinds?.length ? dep.dep_kinds : [{ kind: null }];
      for (const depKind of depKinds) {
        let next;
        if (context === 'development') next = 'development';
        else if (depKind.kind === 'dev') next = 'development';
        else if (context === 'build' || depKind.kind === 'build') next = 'build';
        else next = 'runtime';
        if (packageIsProcMacro(depPkg) && next === 'runtime') next = 'build';
        walk(dep.pkg, next);
      }
    }
  }

  walk(root.id, 'runtime');

  const externalIds = [...fullNodes.keys()].filter((id) => fullPackages.get(id)?.source);
  const packages = [];
  const unclassified = [];

  for (const id of externalIds) {
    const pkg = fullPackages.get(id);
    if (!targetNodes.has(id)) {
      packages.push(normalizeCargoPackage(pkg, 'other-target', `not resolved for ${target}`));
      continue;
    }
    const kinds = reached.get(id) ?? new Set();
    if (kinds.has('runtime')) {
      packages.push(normalizeCargoPackage(pkg, 'runtime', `reachable through a normal dependency path for ${target}`));
    } else if (kinds.has('build')) {
      packages.push(normalizeCargoPackage(pkg, 'build-only', `reachable only through build/proc-macro paths for ${target}`));
    } else if (kinds.has('development')) {
      packages.push(normalizeCargoPackage(pkg, 'development-only', `reachable only through dev-dependency paths for ${target}`));
    } else {
      unclassified.push(`${pkg.name}@${pkg.version}`);
    }
  }

  if (unclassified.length) {
    throw new Error(`Target-resolved Cargo packages were not classified: ${unclassified.join(', ')}`);
  }
  return packages;
}

function classifyNpm() {
  const lock = JSON.parse(fs.readFileSync(PACKAGE_LOCK, 'utf8'));
  if (lock.lockfileVersion !== 3) throw new Error(`Unsupported package-lock version: ${lock.lockfileVersion}`);
  return Object.entries(lock.packages ?? {})
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
        classification: 'build-only',
        reason: 'npm package code is not copied into the installed runtime; TypeScript emits application AMD modules and local compatibility modules satisfy runtime imports',
        source: metadata.resolved ?? null,
      };
    });
}

const vendored = [
  {
    ecosystem: 'vendored',
    name: 'Preact',
    version: null,
    license: 'MIT',
    classification: 'runtime',
    reason: 'vendored runtime implementation in tauri-ui/preact-lite.js',
    sourcePath: 'tauri-ui/preact-lite.js',
  },
  {
    ecosystem: 'vendored',
    name: 'Lucide icon geometry',
    version: '1.29.0',
    license: 'ISC AND MIT',
    classification: 'runtime',
    reason: 'selected icon geometry vendored in src/components/LucideIcon.tsx; some selected icons are Feather-derived',
    sourcePath: 'src/components/LucideIcon.tsx',
  },
];

for (const required of [CARGO_MANIFEST, PACKAGE_LOCK]) {
  if (!fs.existsSync(required)) throw new Error(`Required dependency input is missing: ${path.relative(ROOT, required)}`);
}

const fullMetadata = cargoMetadata();
const targetMetadata = cargoMetadata(['--filter-platform', target]);
const packages = [...classifyNpm(), ...classifyCargo(fullMetadata, targetMetadata), ...vendored]
  .sort((a, b) => a.classification.localeCompare(b.classification) || a.ecosystem.localeCompare(b.ecosystem) || a.name.localeCompare(b.name) || String(a.version).localeCompare(String(b.version)));

const invalid = packages.filter((pkg) => !pkg.name || (pkg.ecosystem !== 'vendored' && !pkg.version));
if (invalid.length) throw new Error(`Distribution classification contains package(s) without required identity metadata: ${invalid.map((pkg) => `${pkg.ecosystem}:${pkg.name}`).join(', ')}`);

const runtimePackages = packages.filter((pkg) => pkg.classification === 'runtime');
const runtimeCargoPackages = runtimePackages.filter((pkg) => pkg.ecosystem === 'cargo');
const missingLicense = runtimePackages.filter((pkg) => !pkg.license && !pkg.licenseFile);
if (missingLicense.length) throw new Error(`Runtime-distributed package(s) lack license metadata: ${missingLicense.map((pkg) => `${pkg.ecosystem}:${pkg.name}@${pkg.version ?? 'vendored'}`).join(', ')}`);

const counts = packages.reduce((acc, pkg) => {
  acc[pkg.classification] = (acc[pkg.classification] ?? 0) + 1;
  return acc;
}, {});
const runtimeLicenseExpressions = [...new Set(runtimePackages.map((pkg) => pkg.license ?? `FILE:${pkg.licenseFile}`))].sort();
const packageIdentity = (pkg) => `${pkg.ecosystem}:${pkg.name}@${pkg.version ?? 'vendored'}`;
const mplRuntime = runtimeCargoPackages
  .filter((pkg) => /(^|[^A-Za-z0-9-])MPL-2\.0([^A-Za-z0-9-]|$)/.test(pkg.license ?? ''))
  .sort((a, b) => packageIdentity(a).localeCompare(packageIdentity(b)));
const mplRuntimePackages = mplRuntime.map(packageIdentity);
const mplSourceAvailability = mplRuntime.map((pkg) => ({
  package: packageIdentity(pkg),
  sourceCodeUrl: pkg.sourceCodeUrl,
  complianceFiles: pkg.complianceFiles,
}));
const missingMplSource = mplRuntime.filter((pkg) => !pkg.sourceCodeUrl || pkg.complianceFiles.length === 0);
if (missingMplSource.length) {
  throw new Error(`MPL runtime package(s) lack source location or detected license material: ${missingMplSource.map(packageIdentity).join(', ')}`);
}

const apacheRuntimePackages = runtimePackages
  .filter((pkg) => /(^|[^A-Za-z0-9-])Apache-2\.0([^A-Za-z0-9-]|$)/.test(pkg.license ?? ''))
  .map((pkg) => `${packageIdentity(pkg)} [${pkg.license}]`)
  .sort();
const compoundRuntimePackages = runtimePackages
  .filter((pkg) => pkg.license && /\bAND\b|\bOR\b|\/|\bWITH\b/.test(pkg.license))
  .map((pkg) => `${packageIdentity(pkg)} [${pkg.license}]`)
  .sort();
const licenseFileRuntimePackages = runtimePackages
  .filter((pkg) => !pkg.license && pkg.licenseFile)
  .map((pkg) => `${packageIdentity(pkg)} [FILE:${pkg.licenseFile}]`)
  .sort();
const cargoRuntimeMissingComplianceFiles = runtimeCargoPackages
  .filter((pkg) => pkg.complianceFiles.length === 0)
  .map((pkg) => `${packageIdentity(pkg)} [${pkg.license ?? `FILE:${pkg.licenseFile}`}]`)
  .sort();
const cargoRuntimeNoticeFiles = runtimeCargoPackages
  .filter((pkg) => pkg.noticeFiles.length > 0)
  .map((pkg) => ({ package: packageIdentity(pkg), noticeFiles: pkg.noticeFiles }))
  .sort((a, b) => a.package.localeCompare(b.package));
const cargoRuntimeComplianceFileCount = runtimeCargoPackages.reduce((total, pkg) => total + pkg.complianceFiles.length, 0);

const report = {
  schemaVersion: 3,
  target,
  policy: {
    npmRuntimeModel: 'local-compatibility-modules-no-node_modules-code-shipped',
    cargoClassification: 'target-filtered dependency traversal; proc-macros/build-dependencies are build-only unless independently runtime-reachable',
    licenseReview: 'runtime license expressions are classified, package legal files are discovered from Cargo source directories, and compound/alternative expressions are not silently reduced to a chosen license',
    mplSourceAvailability: 'registry package source is referenced by exact crate name/version; the application does not vendor modified Cargo registry source',
  },
  counts,
  runtimeLicenseExpressions,
  review: {
    mplRuntimePackages,
    mplSourceAvailability,
    apacheRuntimePackages,
    compoundRuntimePackages,
    licenseFileRuntimePackages,
    cargoRuntimeMissingComplianceFiles,
    cargoRuntimeNoticeFiles,
    cargoRuntimeComplianceFileCount,
  },
  packages,
};

if (output) {
  const absolute = path.resolve(ROOT, output);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Third-party distribution classification written to ${path.relative(ROOT, absolute)}`);
}

console.log(`Third-party distribution classification: PASS (${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(', ')})`);
console.log(`Runtime license expressions/files: ${runtimeLicenseExpressions.join(', ')}`);
console.log(`Runtime Cargo legal files discovered: ${cargoRuntimeComplianceFileCount} across ${runtimeCargoPackages.length} packages`);
console.log(`Runtime Cargo packages without detected root legal material: ${cargoRuntimeMissingComplianceFiles.length ? cargoRuntimeMissingComplianceFiles.join(', ') : 'none'}`);
console.log(`Runtime Cargo NOTICE files: ${cargoRuntimeNoticeFiles.length ? cargoRuntimeNoticeFiles.map((entry) => `${entry.package} => ${entry.noticeFiles.join('|')}`).join(', ') : 'none'}`);
console.log(`Runtime MPL-2.0 packages: ${mplRuntimePackages.length ? mplRuntimePackages.join(', ') : 'none'}`);
for (const entry of mplSourceAvailability) {
  console.log(`MPL source: ${entry.package} => ${entry.sourceCodeUrl}; legal=${entry.complianceFiles.join('|')}`);
}
console.log(`Runtime packages mentioning Apache-2.0: ${apacheRuntimePackages.length ? apacheRuntimePackages.join(', ') : 'none'}`);
console.log(`Runtime compound/alternative license expressions: ${compoundRuntimePackages.length ? compoundRuntimePackages.join(', ') : 'none'}`);
console.log(`Runtime license-file-only packages: ${licenseFileRuntimePackages.length ? licenseFileRuntimePackages.join(', ') : 'none'}`);
