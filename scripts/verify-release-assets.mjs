import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSemver } from './release-version.mjs';
import { fetchPublicationJson } from './check-release-publication.mjs';

export function verifyReleaseAssets({ release, repository, version, expectedAssets, draft, expectedReleaseId }) {
  if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Invalid release repository');
  const prerelease = parseSemver(version).prerelease.length > 0;
  if (typeof draft !== 'boolean' || !release || release.tag_name !== `v${version}` || release.draft !== draft || release.prerelease !== prerelease || !Number.isSafeInteger(release.id) || release.id <= 0 || typeof release.immutable !== 'boolean' || (draft && release.immutable)) throw new Error('Unexpected version release identity or publication state');
  if (expectedReleaseId !== undefined && release.id !== expectedReleaseId) throw new Error('Version release identity changed after draft verification');
  if (!Array.isArray(expectedAssets) || expectedAssets.length === 0 || !Array.isArray(release.assets) || release.assets.length !== expectedAssets.length) throw new Error('Version release asset inventory mismatch');
  const remaining = new Map();
  for (const asset of expectedAssets) {
    if (!asset || typeof asset.name !== 'string' || !/^[A-Za-z0-9_+.-]+$/.test(asset.name) || asset.name === '.' || asset.name === '..' || remaining.has(asset.name) || !Number.isSafeInteger(asset.size) || asset.size <= 0 || !/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error('Invalid local release asset inventory');
    remaining.set(asset.name, asset);
  }
  for (const asset of release.assets) {
    const expected = remaining.get(asset?.name);
    if (!expected || asset.state !== 'uploaded' || asset.size !== expected.size || asset.digest !== `sha256:${expected.sha256}` || asset.browser_download_url !== `https://github.com/${repository}/releases/download/v${version}/${asset.name}`) throw new Error('Version release asset name, state, size, URL or digest mismatch');
    remaining.delete(asset.name);
  }
  if (remaining.size !== 0) throw new Error('Version release has missing assets');
  return { id: release.id, immutable: release.immutable };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--draft', '--published'].includes(args[0])) throw new Error('Use exactly --draft or --published');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'release-spec/release-contract.json'), 'utf8'));
  const repository = process.env.GITHUB_REPOSITORY;
  if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')) throw new Error('Invalid release repository');
  const version = contract.version.semver;
  parseSemver(version);
  const draft = args[0] === '--draft';
  const expectedReleaseId = process.env.EXPECTED_RELEASE_ID === undefined ? undefined : Number(process.env.EXPECTED_RELEASE_ID);
  if ((!draft || expectedReleaseId !== undefined) && (!Number.isSafeInteger(expectedReleaseId) || expectedReleaseId <= 0)) throw new Error('A verified draft release ID is required');
  const directory = path.join(root, 'release/public');
  const expectedAssets = fs.readdirSync(directory, { withFileTypes: true }).map(entry => {
    if (!entry.isFile()) throw new Error('Unexpected non-file in checked release surface');
    const bytes = fs.readFileSync(path.join(directory, entry.name));
    return { name: entry.name, size: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  });
  const release = await fetchPublicationJson(`https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(`v${version}`)}`, false);
  const result = verifyReleaseAssets({ release, repository, version, expectedAssets, draft, expectedReleaseId });
  if (draft) {
    if (!process.env.GITHUB_OUTPUT) throw new Error('Draft verification requires GITHUB_OUTPUT');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `release_id=${result.id}\n`);
  }
  console.log(`GitHub ${draft ? 'draft' : 'published'} assets: PASS (${expectedAssets.length} files; immutable: ${result.immutable})`);
}
