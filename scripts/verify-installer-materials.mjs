import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installerReview, verifyInstallerToolset } from './installer-materials.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--evidence')) throw new Error('Usage: node scripts/verify-installer-materials.mjs [--evidence <file>]');
if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) throw new Error('Installer toolset verification requires Windows LOCALAPPDATA');
const { policy, index } = installerReview(root);
const result = verifyInstallerToolset(path.join(process.env.LOCALAPPDATA, 'tauri/NSIS'), index);
if (args.length) {
  const output = path.resolve(args[1]);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ schemaVersion: 1, target: policy.target, tauriCliVersion: policy.tauriCliVersion, toolsetIndexSha256Lf: policy.toolsetIndex.sha256Lf, ...result, upstreamPluginTransitiveLock: 'not published; unresolved' }, null, 2) + '\n');
}
console.log(`Installer toolset provenance: PASS (${result.files} exact files; upstream plug-in transitive lock remains unresolved)`);
