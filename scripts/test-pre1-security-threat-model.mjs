import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const read = (file) => fs.readFileSync(file, 'utf8');
const config = JSON.parse(read('src-tauri/tauri.conf.json'));
const capability = JSON.parse(read('src-tauri/capabilities/default.json'));
const rust = read('src-tauri/src/main.rs');
const cargoLock = read('src-tauri/Cargo.lock');
const runtime = read('tauri-ui/tauri-runtime.js');
const desktopBridge = read('src/io/desktopBridge.ts');
const releaseWorkflow = read('.github/workflows/release-windows.yml');
const validationWorkflow = read('.github/workflows/build-tauri-windows.yml');
const dependencyWorkflow = read('.github/workflows/dependency-approval.yml');
const dependabotConfig = read('.github/dependabot.yml');
const securityPolicy = read('SECURITY.md');
const updaterPublicKey = read('src-tauri/updater.pubkey').trim();

// Renderer boundary: global Tauri remains an explicit compatibility choice, so the
// renderer must stay self-scripted, network-restricted and free of application-owned
// raw-HTML/code-evaluation sinks.
assert.equal(config.app.withGlobalTauri, true, 'withGlobalTauri is an explicit audited compatibility boundary');
assert.equal(config.app.security.csp['default-src'], "'self'");
assert.equal(config.app.security.csp['script-src'], "'self'");
assert.equal(config.app.security.csp['connect-src'], 'ipc: http://ipc.localhost');
assert.equal(config.app.security.csp['object-src'], "'none'");
assert.equal(config.app.security.csp['frame-src'], "'none'");
assert.equal(config.app.security.csp['base-uri'], "'none'");
assert.deepEqual(capability.permissions, ['core:event:default', 'core:webview:allow-set-webview-zoom']);
assert.doesNotMatch(JSON.stringify(capability), /dialog:|fs:|shell:|process:|http:|updater:/);

const rendererOwnedFiles = [
  ...walk('src').filter((file) => /\.(?:ts|tsx|js|jsx|html)$/.test(file)),
  'tauri-ui/tauri-runtime.js',
  'tauri-ui/bootstrap.js',
  'tauri-ui/index.html',
];
const rendererForbidden = [
  /dangerouslySetInnerHTML/,
  /\.innerHTML\s*=/,
  /insertAdjacentHTML\s*\(/,
  /document\.write\s*\(/,
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /createElement\s*\(\s*['"]script['"]\s*\)/,
];
for (const file of rendererOwnedFiles) {
  const source = read(file);
  for (const pattern of rendererForbidden) assert.doesNotMatch(source, pattern, `${file} introduces an unaudited renderer code/HTML sink`);
}

// The Tauri bridge may route only explicit local API paths to explicit native
// commands. Non-API requests delegate to native fetch but CSP connect-src prevents
// arbitrary remote networking from the packaged renderer.
assert.match(runtime, /if \(!url\.pathname\.startsWith\('\/api\/'\)\) return nativeFetch\(input, init\)/);
assert.doesNotMatch(runtime, /invoke\([^'"`]/, 'Tauri command names must not be computed dynamically');
assert.doesNotMatch(desktopBridge, /fetch\(\s*['"]https?:\/\//i);

// Production native code must not spawn an OS shell/process. Windows mklink usage is
// intentionally confined to cfg(test) junction fixtures.
const testModuleMarker = '#[cfg(all(test, windows))]';
const testModuleIndex = rust.indexOf(testModuleMarker);
assert.ok(testModuleIndex >= 0, 'Windows native safety test module is required');
const productionRust = rust.slice(0, testModuleIndex);
assert.doesNotMatch(productionRust, /std::process::Command|Command::new\s*\(/);

// Tauri security floor: GHSA-7gmj-67g7-phm9 / CVE-2026-42184 affects Tauri
// >=2.0 through <=2.11.0 on Windows/Android. Keep the checked lock above 2.11.0.
const tauriLockMatch = cargoLock.match(/\[\[package\]\]\s+name = "tauri"\s+version = "(\d+)\.(\d+)\.(\d+)"/m);
assert.ok(tauriLockMatch, 'Cargo.lock must contain the resolved tauri package');
const tauriLockedVersion = tauriLockMatch.slice(1, 4).map(Number);
assert.ok(atLeastTriplet(tauriLockedVersion, [2, 11, 1]), `locked Tauri ${tauriLockedVersion.join('.')} is below the 2.11.1 origin-confusion security floor`);

// Updater trust stays native and signature-bound. The public verification key is
// source material; private signing material must remain GitHub Environment secrets.
assert.match(rust, /include_str!\("\.\.\/updater\.pubkey"\)/);
assert.match(rust, /\.pubkey\(UPDATER_PUBLIC_KEY\.trim\(\)\)/);
assert.match(rust, /https:\/\/github\.com\/\{\}\/releases\/download\/updater-stable\/latest\.json/);
assert.match(rust, /https:\/\/github\.com\/\{\}\/releases\/download\/updater-preview\/latest-preview\.json/);
assert.match(rust, /selected\.channel != payload\.channel \|\| selected\.update\.version != payload\.expected_version/);
assert.match(rust, /Update download or signature verification failed/);
assert.match(rust, /pending_change_count\.load\(Ordering::Relaxed\)/);
assert.match(releaseWorkflow, /environment: release/);
assert.match(releaseWorkflow, /TAURI_SIGNING_PRIVATE_KEY: \$\{\{ secrets\.TAURI_SIGNING_PRIVATE_KEY \}\}/);
assert.match(releaseWorkflow, /TAURI_SIGNING_PRIVATE_KEY_PASSWORD: \$\{\{ secrets\.TAURI_SIGNING_PRIVATE_KEY_PASSWORD \}\}/);
assert.doesNotMatch(updaterPublicKey, /UNCONFIGURED/);
const decodedUpdaterKey = Buffer.from(updaterPublicKey, 'base64').toString('utf8');
assert.match(decodedUpdaterKey, /minisign public key/i);
assert.doesNotMatch(decodedUpdaterKey, /secret key/i);

// Supply-chain CI: external actions are immutable-SHA pinned, validation is read-only,
// release write permission is isolated to the protected release environment, and the
// pull_request_target dependency gate never checks out/runs PR code.
for (const workflow of fs.readdirSync('.github/workflows').filter((name) => /\.ya?ml$/.test(name))) {
  const source = read(path.join('.github/workflows', workflow));
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*-?\s*uses:\s*([^\s#]+)/);
    if (!match || match[1].startsWith('./')) continue;
    assert.match(match[1], /@[0-9a-f]{40}$/i, `${workflow} contains an unpinned external action: ${match[1]}`);
  }
}
assert.match(validationWorkflow, /permissions:\s*\n\s*contents: read/);
assert.match(validationWorkflow, /persist-credentials: false/);
assert.match(validationWorkflow, /npm ci --ignore-scripts/);
assert.match(validationWorkflow, /cargo test --locked/);
assert.match(releaseWorkflow, /permissions:\s*\n\s*contents: read/);
assert.match(releaseWorkflow, /publish:[\s\S]*?environment: release[\s\S]*?permissions:\s*\n\s*contents: write/);
assert.match(releaseWorkflow, /npm ci --ignore-scripts/);
assert.match(releaseWorkflow, /-- --locked/);
assert.match(dependencyWorkflow, /pull_request_target:/);
assert.doesNotMatch(dependencyWorkflow, /actions\/checkout|npm\s|node\s+scripts\/|cargo\s/);
assert.match(dependencyWorkflow, /commit_id == \\"\$PR_HEAD_SHA\\"/);
for (const ecosystem of ['npm', 'cargo', 'github-actions']) {
  assert.match(dependabotConfig, new RegExp(`package-ecosystem:\\s*["']?${ecosystem}["']?`), `Dependabot must monitor ${ecosystem}`);
}
assert.match(dependabotConfig, /interval:\s*["']weekly["']/);

// Tracked-source secret hygiene. Variable names and GitHub secret references are fine;
// literal private-key/PAT material and obvious local-secret files are not.
const trackedFiles = listTrackedFiles();
const forbiddenNames = /(^|\/)(?:\.env(?:\..*)?|id_rsa|id_ed25519|.*(?:private|signing)[-_]?key.*\.(?:pem|key)|.*\.(?:p12|pfx))$/i;
for (const file of trackedFiles) assert.doesNotMatch(file.replaceAll('\\', '/'), forbiddenNames, `tracked secret-like file: ${file}`);
const textExtensions = /(?:^|\/)(?:[^/]+\.(?:md|txt|json|ya?ml|toml|lock|ts|tsx|js|mjs|cjs|rs|cmd|ps1|py|html|css)|\.gitignore|\.gitattributes|\.nvmrc)$/i;
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /untrusted comment:\s*minisign (?:encrypted )?secret key/i,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
];
for (const file of trackedFiles.filter((entry) => textExtensions.test(entry))) {
  const source = read(file);
  for (const pattern of secretPatterns) assert.doesNotMatch(source, pattern, `${file} contains secret-like literal material`);
}

// Security reporting is an explicit operational release requirement. Connector/CI
// cannot prove the repository-admin setting, so the policy must keep that manual gate
// visible rather than silently claiming it is enabled.
assert.match(securityPolicy, /Private Vulnerability Reporting|private contact/i);
assert.match(securityPolicy, /before the source repository is advertised publicly/i);
assert.match(securityPolicy, /Do not include private signing keys/i);

console.log(JSON.stringify({
  rendererRawHtmlOrEvalSinks: 0,
  productionProcessSpawns: 0,
  frontendNativeCapabilities: capability.permissions,
  tauriLockedVersion: tauriLockedVersion.join('.'),
  tauriOriginConfusionFloor: '>=2.11.1',
  updaterVerificationKey: 'public minisign key embedded; private key absent from source',
  externalActionsPinnedBySha: true,
  dependabotEcosystems: ['npm', 'cargo', 'github-actions'],
  dependencyPrTargetExecutesPrCode: false,
  trackedSecretLiteralScan: 'PASS',
  privateVulnerabilityReporting: 'manual/admin verification required before stable 1.0',
}, null, 2));
console.log('Pre-1.0 Audit 08 — Security & threat model: PASS');

function atLeastTriplet(actual, minimum) {
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] > minimum[index]) return true;
    if (actual[index] < minimum[index]) return false;
  }
  return true;
}

function walk(root) {
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function listTrackedFiles() {
  if (fs.existsSync('.git')) {
    return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  }
  const skipped = new Set(['node_modules', 'build', 'release', '.core-build', '.support-build', 'src-tauri/target']);
  const visit = (root) => {
    const out = [];
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory() && (entry.name === '.git' || skipped.has(root === '.' ? entry.name : `${root}/${entry.name}`))) continue;
      const full = root === '.' ? entry.name : `${root}/${entry.name}`;
      if (entry.isDirectory()) out.push(...visit(full));
      else if (entry.isFile()) out.push(full);
    }
    return out;
  };
  return visit('.');
}
