import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareSemver, parseSemver } from './release-version.mjs';

export async function checkReleasePublication({ repository, version, getJson }) {
  if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Invalid publication repository');
  const candidate = parseSemver(version);
  const api = `https://api.github.com/repos/${repository}/releases/tags/`;
  if (await getJson(`${api}${encodeURIComponent(`v${version}`)}`, true)) throw new Error('Version release already exists; same-SemVer republish is forbidden.');
  const preview = candidate.prerelease.length > 0;
  let advancePreview = true;
  for (const channel of preview ? ['preview'] : ['stable', 'preview']) {
    const rolling = await getJson(`${api}updater-${channel}`, true);
    if (!rolling) continue; // Only a confirmed HTTP 404 permits bootstrap.
    const asset = channel === 'stable' ? 'latest.json' : 'latest-preview.json';
    if (rolling.draft || !Array.isArray(rolling.assets) || rolling.assets.filter(entry => entry.name === asset).length !== 1) throw new Error(`Invalid ${channel} rolling release; repair it explicitly before publishing.`);
    const manifest = await getJson(`https://github.com/${repository}/releases/download/updater-${channel}/${asset}`, false);
    const existing = parseSemver(manifest?.version);
    if (channel === 'stable' && existing.prerelease.length) throw new Error('Stable rolling manifest contains a prerelease.');
    const platform = manifest.platforms?.['windows-x86_64'];
    const expectedUrl = `https://github.com/${repository}/releases/download/v${manifest.version}/Hytale-Generator-Workbench_${manifest.version}_x64-setup.exe`;
    if (platform?.url !== expectedUrl || typeof platform.signature !== 'string' || !platform.signature.trim()) throw new Error(`Invalid ${channel} updater target.`);
    if (compareSemver(version, manifest.version) <= 0) {
      // A stable hotfix can advance Stable while Preview already tracks a future release.
      if (!preview && channel === 'preview') advancePreview = false;
      else throw new Error(`Refusing ${channel} manifest regression or same-version replacement.`);
    }
  }
  return { advancePreview };
}

export async function fetchPublicationJson(url, allowMissing, token = process.env.GH_TOKEN) {
  const headers = { Accept: 'application/vnd.github+json' };
  // Never forward the repository token to public asset/CDN redirects.
  const api = new URL(url).hostname === 'api.github.com';
  if (api && token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { headers, redirect: api ? 'error' : 'follow', signal: AbortSignal.timeout(30_000) });
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new Error(`Publication preflight failed (HTTP ${response.status}).`);
  const value = await response.json();
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Publication preflight returned invalid JSON metadata.');
  return value;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'release-spec/release-contract.json'), 'utf8'));
  const result = await checkReleasePublication({ repository: process.env.GITHUB_REPOSITORY, version: contract.version.semver, getJson: fetchPublicationJson });
  if (!process.env.GITHUB_OUTPUT) throw new Error('Publication preflight requires GITHUB_OUTPUT.');
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `advance_preview=${result.advancePreview}\n`);
  console.log(`Publication preflight: PASS (advance Preview: ${result.advancePreview})`);
}
