import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
export const TYPESCRIPT_CLI = require.resolve('typescript/bin/tsc');

function requestsCoreProject(args) {
  for (let index = 0; index < args.length - 1; index += 1) {
    if (args[index] !== '-p' && args[index] !== '--project') continue;
    return path.basename(String(args[index + 1]).replaceAll('\\', '/')) === 'tsconfig.core.json';
  }
  return false;
}

export function execTypeScript(args, options = {}) {
  if (process.env.HGW_CORE_BUILD_READY === '1' && requestsCoreProject(args)) return undefined;
  return execFileSync(process.execPath, [TYPESCRIPT_CLI, ...args], options);
}

export function spawnTypeScript(args, options = {}) {
  return spawnSync(process.execPath, [TYPESCRIPT_CLI, ...args], options);
}
