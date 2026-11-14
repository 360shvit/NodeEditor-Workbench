import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSemver } from './release-version.mjs';
import { fetchPublicationJson } from './check-release-publication.mjs';

function validateReleaseIdentity(repository, expectedReleaseId) {
  if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')) throw new Error('Invalid release repository');
  if (!Number.isSafeInteger(expectedReleaseId) || expectedReleaseId <= 0) throw new Error('A verified draft release ID is required');
}

export function verifyReleaseAssets({ release, repository, version, expectedAssets, draft, expectedReleaseId }) {
  validateReleaseIdentity(repository, expectedReleaseId);
  const prerelease = parseSemver(version).prerelease.length > 0;
  if (typeof draft !== 'boolean' || !release || release.tag_name !== `v${version}` || release.draft !== draft || release.prerelease !== prerelease || !Number.isSafeInteger(release.id) || release.id <= 0 || typeof release.immutable !== 'boolean' || (draft && release.immutable)) throw new Error('Unexpected version release identity or publication state');
  if (release.id !== expectedReleaseId) throw new Error('Version release identity changed after draft verification');
  const tagPrefix = `https://github.com/${repository}/releases/tag/`;
  const canonicalTag = `v${version}`;
  const releaseSlug = typeof release.html_url === 'string' && release.html_url.startsWith(tagPrefix) ? release.html_url.slice(tagPrefix.length) : '';
  // GitHub assigns unpublished drafts a temporary URL. Bind asset URLs to this
  // exact draft, while published assets must use the canonical version tag.
  const temporaryDraft = draft && /^untagged-[a-f0-9]+(?:-[a-f0-9]+)*$/.test(releaseSlug);
  if (releaseSlug !== canonicalTag && !temporaryDraft) throw new Error('Version release URL identity mismatch');
  const downloadPrefix = `https://github.com/${repository}/releases/download/${releaseSlug}/`;
  if (!Array.isArray(expectedAssets) || expectedAssets.length === 0 || !Array.isArray(release.assets) || release.assets.length !== expectedAssets.length) throw new Error('Version release asset inventory mismatch');
  const remaining = new Map();
  for (const asset of expectedAssets) {
    if (!asset || typeof asset.name !== 'string' || !/^[A-Za-z0-9_+.-]+$/.test(asset.name) || asset.name === '.' || asset.name === '..' || remaining.has(asset.name) || !Number.isSafeInteger(asset.size) || asset.size <= 0 || !/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error('Invalid local release asset inventory');
    remaining.set(asset.name, asset);
  }
  for (const asset of release.assets) {
    const expected = remaining.get(asset?.name);
    if (!expected || asset.state !== 'uploaded' || asset.size !== expected.size || asset.digest !== `sha256:${expected.sha256}` || asset.browser_download_url !== `${downloadPrefix}${asset.name}`) throw new Error('Version release asset name, state, size, URL or digest mismatch');
    remaining.delete(asset.name);
  }
  if (remaining.size !== 0) throw new Error('Version release has missing assets');
  return { id: release.id, immutable: release.immutable };
}

export async function verifyGitHubReleaseAssets(options, getJson = fetchPublicationJson) {
  const { repository, version, expectedReleaseId, draft } = options;
  validateReleaseIdentity(repository, expectedReleaseId);
  parseSemver(version);
  // The tag endpoint only returns published releases. Both checks first bind
  // to the numeric ID captured immediately after draft creation.
  const release = await getJson(`https://api.github.com/repos/${repository}/releases/${expectedReleaseId}`, false);
  const result = verifyReleaseAssets({ ...options, release });
  if (!draft) {
    const published = await getJson(`https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(`v${version}`)}`, false);
    verifyReleaseAssets({ ...options, release: published });
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--draft', '--published'].includes(args[0])) throw new Error('Use exactly --draft or --published');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'release-spec/release-contract.json'), 'utf8'));
  const repository = process.env.GITHUB_REPOSITORY;
  const version = contract.version.semver;
  const draft = args[0] === '--draft';
  const expectedReleaseId = Number(process.env.EXPECTED_RELEASE_ID);
  validateReleaseIdentity(repository, expectedReleaseId);
  const directory = path.join(root, 'release/public');
  const expectedAssets = fs.readdirSync(directory, { withFileTypes: true }).map(entry => {
    if (!entry.isFile()) throw new Error('Unexpected non-file in checked release surface');
    const bytes = fs.readFileSync(path.join(directory, entry.name));
    return { name: entry.name, size: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  });
  const result = await verifyGitHubReleaseAssets({ repository, version, expectedAssets, draft, expectedReleaseId });
  if (draft) {
    if (!process.env.GITHUB_OUTPUT) throw new Error('Draft verification requires GITHUB_OUTPUT');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `release_id=${result.id}\n`);
  }
  console.log(`GitHub ${draft ? 'draft' : 'published'} assets: PASS (${expectedAssets.length} files; immutable: ${result.immutable})`);
}
