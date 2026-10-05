import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { assertPublicPaths, assertDocumentLinks } from './repository-hygiene.mjs';

// Verify failure paths independently of the repository's current contents.
// Keep the history rejection fixture; it is a constructed test path, never a
// dependency on a retired document. The original public-source gate is unchanged.
const historyFixture = path.posix.join('docs', 'history', 'internal.md');
for (const file of ['node_modules/tool/index.js', 'src-tauri/target/app.exe', 'release/public/update.sig', '.env.production', 'keys/signing.pem', 'app.log', historyFixture]) {
  assert.throws(() => assertPublicPaths([file]), /Generated\/private\/local/);
}
assertPublicPaths(['src/main.tsx', 'src/release/releaseIdentity.ts', 'tauri-ui/app.js', 'src-tauri/Cargo.lock', 'package-lock.json', 'tools/windows/Build.cmd', 'docs/third-party/LICENSE.txt']);
const fixture = new Map([['README.md', '[Guide](docs/guide.md)'], ['docs/guide.md', '[Home](../README.md#home)']]);
assert.equal(assertDocumentLinks([...fixture.keys()], file => fixture.get(file)), 2);
assert.throws(() => assertDocumentLinks(['README.md'], () => '[gone](docs/gone.md)'), /missing/);
assert.throws(() => assertDocumentLinks(['README.md'], () => '[outside](../private.md)'), /outside/);

// Git's index is the public-source boundary, so ignored local build outputs neither
// fail the audit nor hide accidentally tracked output. No whole-disk scan is used.
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
assert.ok(files.length > 0, 'an empty tree is not a successful audit');
assertPublicPaths(files);
const links = assertDocumentLinks(files, file => fs.readFileSync(file, 'utf8'));
const living = ['PRODUCT_GUIDE', 'ARCHITECTURE', 'KNOWN_LIMITS', 'BUILD_PLAN', 'VALIDATION'];
for (const name of living) {
  assert.match(fs.readFileSync(`docs/${name}.md`, 'utf8'), /\*\*Applies to:\*\* the current release contract\./);
}
console.log(`Pre-1.0 Audit 17 repository hygiene: PASS (${files.length} tracked paths, ${links} local documentation links)`);
