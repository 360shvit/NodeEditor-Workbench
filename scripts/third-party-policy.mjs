import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function readThirdPartyPolicy(root) {
  const policy = JSON.parse(fs.readFileSync(path.join(root, 'release-spec/third-party-policy.json'), 'utf8'));
  if (policy.schemaVersion !== 1) throw new Error('Unsupported third-party review policy');
  return policy;
}

export function assertReviewedCargoSources(metadata, rootManifest, policy) {
  const root = metadata.packages?.find(pkg => path.resolve(pkg.manifest_path) === path.resolve(rootManifest));
  if (!root || root.source || metadata.resolve?.root !== root.id || !metadata.resolve.nodes.some(node => node.id === root.id)) {
    throw new Error('Third-party review requires a complete resolved application Cargo graph');
  }
  const resolved = new Set(metadata.resolve.nodes.map(node => node.id));
  const packages = new Map(metadata.packages.map(pkg => [pkg.id, pkg]));
  for (const id of resolved) {
    const pkg = packages.get(id);
    if (!pkg) throw new Error('Resolved Cargo package is missing metadata');
    if (id !== root.id && pkg.source !== policy.cargoRegistry) {
      throw new Error(`Cargo dependency source requires review: ${pkg.name}@${pkg.version}`);
    }
    // RUSTSEC-2026-0285 / GHSA-2mjx-qc3c-rqvc. The existing Windows graph uses rustls 0.23.
    if (pkg.name === 'rustls') {
      const version = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version)?.slice(1).map(Number);
      const minimum = [0, 23, 45];
      const comparison = version?.map((value, index) => value - minimum[index]).find(value => value !== 0) ?? 0;
      if (!version || comparison < 0) throw new Error(`rustls ${pkg.version} is below the reviewed 0.23.45 security floor`);
    }
  }
}

export function assertReviewedRuntimeLicenses(packages, policy) {
  const reviewed = new Set(policy.runtimeLicenseExpressions);
  for (const pkg of packages.filter(pkg => pkg.classification === 'runtime')) {
    if (!reviewed.has(pkg.license)) {
      throw new Error(`Runtime license requires review: ${pkg.ecosystem}:${pkg.name}@${pkg.version ?? 'vendored'} [${pkg.license ?? 'license-file-only'}]`);
    }
  }
}

export function assertReviewedVendoredFiles(root, policy, packages) {
  const expected = new Map(packages.map(pkg => [`${pkg.ecosystem}:${pkg.name}@${pkg.version ?? 'vendored'}`, pkg]));
  if (policy.vendored.length !== expected.size) throw new Error('Vendored review coverage does not match the distributed components');
  const seen = new Set();
  for (const entry of policy.vendored) {
    const pkg = expected.get(entry.identity);
    if (!pkg || seen.has(entry.identity) || pkg.sourcePath !== entry.path || pkg.license !== entry.license) {
      throw new Error(`Vendored review identity/license mismatch: ${entry.identity}`);
    }
    seen.add(entry.identity);
    const text = fs.readFileSync(path.join(root, entry.path), 'utf8').replaceAll('\r\n', '\n');
    const hash = createHash('sha256').update(text, 'utf8').digest('hex');
    if (hash !== entry.sha256Lf) throw new Error(`Vendored component requires renewed provenance/license review: ${entry.path}`);
  }
}
