import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compareSemver } from './release-version.mjs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const contract = JSON.parse(read('release-spec/release-contract.json'));
assert.ok(compareSemver(contract.version.semver, '0.11.35') >= 0, 'current release must not precede the v0.11.35 fix baseline');
if (contract.version.semver === '0.11.35') assert.match(contract.version.revision, /^r(?:10|1[1-9]|[2-9]\d|\d{3,})$/, 'v0.11.35 candidates must be r10 or later');
assert.equal(fs.existsSync('docs/history'), false);
for (const file of ['docs/PRODUCT_GUIDE.md','docs/ARCHITECTURE.md','docs/KNOWN_LIMITS.md','docs/BUILD_PLAN.md','docs/VALIDATION.md','docs/CHANGELOG.md','release-spec/README.md','scripts/generate-third-party-notices.mjs','tools/windows/Freeze-Windows-Dependencies.cmd','tools/windows/Generate-Updater-Signing-Key.cmd','tools/windows/Install-Windows-Installer-Tooling.cmd']) assert.ok(fs.existsSync(file), `missing public contract: ${file}`);
for (const file of ['docs/REPOSITORY_BOOTSTRAP_V0.11.35.md','docs/GITHUB_UPDATER_INTEGRATION_V0.11.35.md','docs/ACCEPTANCE_PROTOCOL.md','docs/ROADMAP_TO_V1.md','docs/DOCUMENTATION_INDEX.md','docs/LICENSE_DECISION.md','docs/THIRD_PARTY_LICENSE_PROCESS.md','docs/DEEP_CLEAN_V0.11.35_R3.md','docs/TEMP_RELEASE_DEPENDENCY_CONTEXT_FIX_V0.11.35_R9.md']) assert.equal(fs.existsSync(file), false, `internal doc leaked: ${file}`);
for (const dir of ['node_modules','build','release','.core-build','.support-build','src-tauri/target']) assert.equal(fs.existsSync(dir), false, `generated dir leaked: ${dir}`);
assert.match(read('.gitignore'), /^\/THIRD_PARTY_NOTICES\.txt$/m, 'generated third-party notice must stay out of source history');
for (const file of fs.readdirSync('scripts').filter((name) => name.endsWith('.mjs'))) assert.doesNotMatch(read(path.join('scripts',file)), /docs\/history\//, `${file} depends on internal history`);
assert.doesNotMatch(read('README.md'), /docs\/history|REPOSITORY_BOOTSTRAP_V0\.11\.35|TEMP_RELEASE_DEPENDENCY_CONTEXT/i);
assert.doesNotMatch(read('docs/BUILD_PLAN.md'), /docs\/history|DEEP_CLEAN_V0\.11\.35/i);
console.log(`${contract.version.display} public repository clean contract: PASS`);
