import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const rail = readFileSync(new URL('../src/components/WorkbenchRail.tsx', import.meta.url), 'utf8');
const explorer = readFileSync(new URL('../src/components/ProjectExplorer.tsx', import.meta.url), 'utf8');
const search = readFileSync(new URL('../src/components/SearchSidebar.tsx', import.meta.url), 'utf8');
const start = readFileSync(new URL('../src/components/ProjectStartScreen.tsx', import.meta.url), 'utf8');
const store = readFileSync(new URL('../src/store.ts', import.meta.url), 'utf8');
const persistence = readFileSync(new URL('../src/projects/projectPersistence.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
assert.match(app, /ProjectStartScreen/);
assert.match(app, /WorkbenchRail/);
assert.match(app, /WorkbenchSidebar/);
assert.doesNotMatch(app, /<SearchBar/);
assert.doesNotMatch(app, /editing-control/);
assert.doesNotMatch(app, /<DiagnosticsSummary/);

assert.match(rail, /Explorer/);
assert.match(rail, /Search/);
assert.match(rail, /Diagnostics/);
assert.match(rail, /Changes/);
assert.match(rail, /Layout/);
assert.match(rail, /Project Graph/);
assert.match(rail, /Editing \$\{editing \? 'On' : 'Off'\}/);
assert.match(rail, /setEditing\(!editing\)/);
assert.match(rail, /data-tooltip/);
assert.doesNotMatch(rail, /title=\{label\}/);
assert.match(rail, /LucideIcon/);
assert.match(rail, /folder-tree/);
assert.match(rail, /git-compare-arrows/);
assert.doesNotMatch(rail, /[▤⌕Δ◫◇✎⚙]/);

assert.doesNotMatch(explorer, /Workbench views/);
assert.doesNotMatch(explorer, />Layout</);
assert.match(explorer, /Open editors/i);
assert.match(explorer, /Scope/);
assert.match(explorer, /Files/);

assert.match(search, /Project query/);
assert.match(search, /openSearchTab\(query\)/);
assert.match(search, /Open Search Tab/);
assert.match(search, /is:unresolved/);
assert.match(search, /workspace:Density/);

assert.match(start, /Recent Projects/);
assert.match(start, /Open Project/);
assert.match(start, /toggleRecentProjectPinned/);
assert.match(start, /forgetRecentProject/);
assert.match(start, /rescanned from disk every time they open/);

assert.match(store, /export type SidebarView = 'explorer' \| 'search'/);
assert.match(store, /sidebarVisible: boolean/);
assert.match(store, /activateSidebar/);
assert.match(store, /editing: false/);
assert.match(persistence, /sidebarView/);
assert.match(persistence, /sidebarVisible/);
const writer = persistence.slice(persistence.indexOf('export function writeProjectSession'));
assert.doesNotMatch(writer, /changeSet\s*:/i);
assert.doesNotMatch(writer, /changePast\s*:/i);
assert.doesNotMatch(writer, /changeFuture\s*:/i);
assert.doesNotMatch(writer, /editing\s*:/i);
assert.doesNotMatch(writer, /old(?:File|Source)?Text\s*:/i);

assert.match(styles, /workbench-rail/);
assert.match(styles, /editing-rail-button\.editing-off/);
assert.match(styles, /editing-rail-button\.editing-on/);
assert.match(styles, /project-start-screen/);
assert.match(styles, /search-sidebar/);
assert.match(styles, /universal-tooltip/);
assert.match(app, /UniversalTooltip/);

console.log('v0.10.1 desktop shell compatibility boundary OK');
