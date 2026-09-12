import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

// The existing hygiene gate describes a distributable source tree, not an
// installed working directory. Preserve that gate verbatim in an isolated tree.
// Include tracked files even when ignored, so committed build output still fails.
const root = process.cwd();
const gate = 'scripts/test-public-repo-clean-v0.11.35-r10.mjs';
let temporary;
try {
  if (!fs.existsSync(path.join(root, '.git'))) {
    // An unpacked source archive must itself be clean; no filtering is allowed.
    const result = spawnSync(process.execPath, [gate], { stdio: 'inherit' });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } else {
    const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
    assert.ok(files.length > 0, 'source inventory must not be empty');
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hgw-public-source-'));
    for (const file of new Set(files)) {
      assert.ok(!path.isAbsolute(file) && !file.split(/[\\/]/).includes('..'), `invalid source path: ${file}`);
      const source = path.join(root, file);
      assert.ok(fs.lstatSync(source).isFile(), `source entry must be a regular file: ${file}`);
      const target = path.join(temporary, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }
    const result = spawnSync(process.execPath, [gate], { cwd: temporary, stdio: 'inherit' });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
} finally {
  if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
}
