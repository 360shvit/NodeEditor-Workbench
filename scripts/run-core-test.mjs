import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execTypeScript } from './typescript-cli.mjs';

const script = process.argv[2];
if (!script) throw new Error('Usage: node scripts/run-core-test.mjs <test-script>');

if (process.env.HGW_CORE_BUILD_READY !== '1') {
  execTypeScript(['-p', 'tsconfig.core.json', '--pretty', 'false'], { stdio: 'inherit' });
}

await import(pathToFileURL(path.resolve(script)).href);
