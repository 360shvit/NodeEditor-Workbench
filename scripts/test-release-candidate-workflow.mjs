import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflowPath = '.github/workflows/validate-release-candidate.yml';
assert.ok(fs.existsSync(workflowPath), 'release-candidate workflow must exist');
const workflow = fs.readFileSync(workflowPath, 'utf8');

for (const token of [
  'workflow_dispatch:',
  'permissions:\n  contents: read',
  'runs-on: windows-2025',
  'environment: release',
  "refs/heads/main",
  'TAURI_SIGNING_PRIVATE_KEY',
  'src-tauri/updater.pubkey',
  'npm run release:check',
  'npm run test:github-updater-integration',
  'node node_modules/typescript/bin/tsc -p tsconfig.app.json',
  'npm run test:rc-regression-matrix',
  'npm run audit:unused-carry',
  'cargo test --locked --manifest-path src-tauri/Cargo.toml',
  'audit-third-party-inventory.mjs --output evidence/third-party-inventory.json',
  'cargo install tauri-cli --version 2.11.0 --locked',
  'HGW_DISTRIBUTION_KIND: installed',
  'cargo tauri build --bundles nsis',
  'release-surface.mjs --installer-dir',
  'release-surface.mjs --check',
  'evidence/release-public-sha256.txt',
  'retention-days: 7',
]) {
  assert.ok(workflow.includes(token), `release-candidate workflow missing ${token}`);
}

assert.doesNotMatch(workflow, /^[ \t]*push:/m, 'release-candidate workflow must not trigger on push');
assert.doesNotMatch(workflow, /^[ \t]*pull_request:/m, 'release-candidate workflow must not trigger on pull requests');
assert.doesNotMatch(workflow, /contents:[ \t]*write/, 'release-candidate workflow must not receive repository write permission');
assert.doesNotMatch(workflow, /\bgh[ \t]+release\b/i, 'release-candidate workflow must never publish a GitHub release');
assert.doesNotMatch(workflow, /release[ \t]+create/i, 'release-candidate workflow must never create a release');
assert.doesNotMatch(workflow, /release[ \t]+upload/i, 'release-candidate workflow must never upload to a GitHub release');

const uses = [...workflow.matchAll(/^[ \t]*-[ \t]+uses:[ \t]+([^\s#]+)/gm)].map((match) => match[1]);
assert.ok(uses.length >= 4, 'release-candidate workflow must use pinned setup and artifact actions');
for (const use of uses) {
  const split = use.lastIndexOf('@');
  assert.ok(split > 0, `action reference must contain @: ${use}`);
  assert.match(use.slice(split + 1), /^[0-9a-f]{40}$/i, `action must use full immutable SHA: ${use}`);
}
for (const action of ['actions/checkout', 'actions/setup-node', 'dtolnay/rust-toolchain', 'actions/upload-artifact']) {
  assert.ok(uses.some((use) => use.startsWith(`${action}@`)), `release-candidate workflow must use ${action}`);
}

console.log('release-candidate workflow contract: PASS');
