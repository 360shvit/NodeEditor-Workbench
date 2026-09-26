import { createHash, createPublicKey, verify } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function base64(value) {
  if (typeof value !== 'string' || !value || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('Invalid signature/key base64');
  const bytes = Buffer.from(value, 'base64');
  if (bytes.toString('base64') !== value) throw new Error('Non-canonical signature/key base64');
  return bytes;
}

// Tauri wraps a Minisign text envelope in base64. Verify both the payload and trusted comment.
// Format parity: locked tauri-plugin-updater 2.11.0 / minisign-verify 0.2.5.
export function verifyUpdaterSignature(bytes, signatureText, publicKeyText) {
  const decodeText = value => new TextDecoder('utf-8', { fatal: true }).decode(base64(value.trim())).trimEnd().split(/\r?\n/);
  const keyLines = decodeText(publicKeyText);
  const sigLines = decodeText(signatureText);
  if (keyLines.length !== 2 || sigLines.length !== 4 || !keyLines[0].startsWith('untrusted comment: ') || !sigLines[0].startsWith('untrusted comment: ') || !sigLines[2].startsWith('trusted comment: ')) throw new Error('Invalid Minisign envelope');
  const key = base64(keyLines[1]);
  const signature = base64(sigLines[1]);
  const globalSignature = base64(sigLines[3]);
  if (key.length !== 42 || signature.length !== 74 || globalSignature.length !== 64) throw new Error('Invalid Minisign record length');
  const algorithm = signature.subarray(0, 2).toString('latin1');
  if (!['Ed', 'ED'].includes(key.subarray(0, 2).toString('latin1')) || !['Ed', 'ED'].includes(algorithm)) throw new Error('Unsupported Minisign algorithm');
  if (!key.subarray(2, 10).equals(signature.subarray(2, 10))) throw new Error('Updater signature key ID mismatch');
  const publicKey = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), key.subarray(10)]), format: 'der', type: 'spki' });
  const payload = algorithm === 'ED' ? createHash('blake2b512').update(bytes).digest() : bytes;
  if (!verify(null, payload, publicKey, signature.subarray(10))) throw new Error('Updater installer signature is invalid');
  const commentPayload = Buffer.concat([signature.subarray(10), Buffer.from(sigLines[2].slice(17), 'utf8')]);
  if (!verify(null, commentPayload, publicKey, globalSignature)) throw new Error('Updater trusted-comment signature is invalid');
  return { keyId: key.subarray(2, 10).toString('hex'), algorithm };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'release-spec/release-contract.json'), 'utf8'));
  const installer = contract.updater.publication.installerAssetPattern.replaceAll('{version}', contract.version.semver).replaceAll('{displayVersion}', contract.version.display);
  const signature = contract.updater.publication.installerSignaturePattern.replaceAll('{version}', contract.version.semver).replaceAll('{displayVersion}', contract.version.display);
  const result = verifyUpdaterSignature(fs.readFileSync(path.join(root, 'release/public', installer)), fs.readFileSync(path.join(root, 'release/public', signature), 'utf8'), fs.readFileSync(path.join(root, 'src-tauri/updater.pubkey'), 'utf8'));
  console.log(`Updater signature verification: PASS (${result.algorithm}; key ID ${result.keyId})`);
}
