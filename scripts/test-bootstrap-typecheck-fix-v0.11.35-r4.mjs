import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compareSemver } from './release-version.mjs';

const read = (path) => fs.readFileSync(path, 'utf8');
const contract = JSON.parse(read('release-spec/release-contract.json'));
assert.ok(compareSemver(contract.version.semver, '0.11.35') >= 0, 'current release must not precede the v0.11.35 fix baseline');
if (contract.version.semver === '0.11.35') assert.match(contract.version.revision, /^r[4-9]$|^r[1-9]\d+$/, 'v0.11.35 candidates must be r4 or later');

const icons = read('src/components/LucideIcon.tsx');
assert.match(icons, /\n  info: \[/, 'local info icon must exist for updater status UI');

const graph = read('src/features/project-graph/ProjectGraphView.tsx');
assert.ok(graph.includes('graph?.root?.fileId'), 'graph fit effect must depend on canonical root fileId');
assert.ok(!graph.includes('graph?.root?.id'), 'nonexistent root.id dependency must not return');

const store = read('src/store.ts');
assert.ok((store.match(/focusedLocation\?\.fileId && focusedLocation\.nodeId && focusedLocation\.location/g) ?? []).length >= 3, 'focused-node reconstruction must require fileId/nodeId/location');

const focus = read('src/workbench/modalFocus.ts');
assert.ok((focus.match(/!current \|\| !container\.contains\(current\)/g) ?? []).length >= 2, 'focus trap must narrow absent current element before contains()');

console.log('v0.11.35-r4 bootstrap typecheck repair contract: PASS');
