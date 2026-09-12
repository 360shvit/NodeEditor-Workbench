import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const TYPESCRIPT_CLI = require.resolve('typescript/bin/tsc');

export function execTypeScript(args, options = {}) {
  return execFileSync(process.execPath, [TYPESCRIPT_CLI, ...args], options);
}

export function spawnTypeScript(args, options = {}) {
  return spawnSync(process.execPath, [TYPESCRIPT_CLI, ...args], options);
}
