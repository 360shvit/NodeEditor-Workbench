import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const pkg = JSON.parse(read('../package.json'));
const config = JSON.parse(read('../src-tauri/tauri.conf.json'));
const cargo = read('../src-tauri/Cargo.toml');
const app = read('../src/App.tsx');
const commands = read('../src/commands/commandRegistry.ts');
const quickOpen = read('../src/components/QuickOpen.tsx');
const search = read('../src/components/SearchSidebar.tsx');
const tabs = read('../src/components/FileTabs.tsx');
const changes = read('../src/components/ChangePanel.tsx');
const explorer = read('../src/components/ProjectExplorer.tsx');
const policy = read('../src/projectFiles/loadPolicy.ts');
const tree = read('../src/projectFiles/inventoryTree.ts');
const descriptorIndex = read('../src/projectFiles/descriptorIndex.ts');
const loader = read('../src/io/folderLoader.ts');
const rust = read('../src-tauri/src/main.rs');
const store = read('../src/store.ts');
const persistence = read('../src/projects/projectPersistence.ts');

assert.equal(pkg.version, JSON.parse(read('../release-spec/release-contract.json')).version.semver);
assert.equal(config.version, JSON.parse(read('../release-spec/release-contract.json')).version.semver);
assert.match(cargo, new RegExp(`^version = "${pkg.version.replaceAll('.', '\\.')}"`, 'm'));
assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);

// 1) Central command/hotkey registry + Quick Open. App consumes the registry instead of hard-coded global chord checks.
assert.match(commands, /export const WORKBENCH_COMMANDS/);
assert.match(commands, /quickOpen[\s\S]*Mod\+P/);
assert.match(commands, /commandShortcutConflicts/);
assert.match(commands, /commandForKeyboardEvent/);
assert.match(app, /commandForKeyboardEvent\(event\)/);
assert.doesNotMatch(app, /event\.ctrlKey\s*&&\s*event\.shiftKey/);
assert.match(quickOpen, /> commands/);
assert.match(quickOpen, /WORKBENCH_COMMANDS/);
assert.match(quickOpen, /searchProject\(project/);

// 2) Search sidebar: persistent query, recent dropdown, live top three direct matches; Enter always opens Search tab.
assert.match(search, /recentSearches/);
assert.match(search, /Top matches/);
assert.match(search, /\.slice\(0, 3\)/);
assert.match(search, /onClick=\{\(\) => openDirect\(result\)\}/);
assert.match(search, /if \(event\.key === 'Enter'\) submit\(\)/);
assert.match(search, /recordRecentSearch\(query\);[\s\S]*openSearchTab\(query\)/);
assert.match(store, /searchSidebarQuery: string/);
assert.match(store, /recentSearches: string\[\]/);
assert.match(persistence, /searchSidebarQuery\?: string/);
assert.match(persistence, /recentSearches\?: string\[\]/);

// 3) Staged/dirty file indicators intentionally remain deferred; don't accidentally introduce a second file-state badge language.
assert.doesNotMatch(explorer, /staged-file-indicator|dirty-file-indicator/);

// 4) Changes stays the quick staged editor; full file diff exists only in Apply/Export review.
assert.match(changes, /Review & Export/);
assert.match(changes, /buildUnifiedDiff/);
assert.match(changes, /apply-diff-review/);
assert.match(changes, /Edit or remove staged values in the Changes tab/);
assert.doesNotMatch(tabs, /Unified Diff|File Diff/);

// 5) Existing tabs gain context actions without replacing the tab model.
for (const action of ['Close Others', 'Close to the Right', 'Close All', 'Copy Relative Path', 'Reveal in Explorer']) assert.match(tabs, new RegExp(action));
assert.match(store, /closeOtherTabs:/);
assert.match(store, /closeTabsToRight:/);
assert.match(store, /revealFileInExplorer:/);

// 6) Whole project inventory + selective semantic loading.
assert.match(descriptorIndex, /workspace\.sourceEntries\.keys\(\)/);
assert.match(explorer, /inventory-only/);
assert.match(explorer, /generator flow orchestrator/);
assert.match(tree, /descriptorMatchesExplorerScope/);
assert.match(policy, /ProjectFileLoadMode = 'semantic-json' \| 'semantic-structured' \| 'raw-text' \| 'metadata-only'/);
assert.match(policy, /'graph-document'/);
assert.match(policy, /'flow-orchestrator'/);
assert.match(policy, /'flow-entrypoint'/);
assert.match(policy, /'runtime-config'/);
assert.match(policy, /worldstructure/);
assert.match(policy, /const materialized = \[\.\.\.paths\]/, 'one-shot Map.keys() iterators must be materialized once');
assert.match(policy, /userRules: ProjectLoadRule\[\] = \[\]/, 'future user load rules must have an architectural hook');
assert.match(loader, /inventoryDirectory/);
assert.match(loader, /readSemanticInputs/);
assert.match(loader, /loadModeForProjectPath\(path, selectedRoot, markerDirectories\) !== 'semantic-json'/);
assert.match(rust, /Phase 1: inventory only/);
assert.match(rust, /Phase 2: detector-based semantic discovery/);
assert.match(rust, /default_semantic_candidate/);
assert.match(rust, /detect_semantic_file/);
assert.match(rust, /worldstructure/);

console.log(JSON.stringify({
  version: '0.11.34',
  commandRegistry: true,
  quickOpen: true,
  searchTopMatches: 3,
  searchEnterCreatesTab: true,
  fileStateModel: true,
  reviewDiffOnly: true,
  tabContextActions: true,
  wholeProjectInventory: true,
  selectiveSemanticLoading: true,
  futureUserLoadRulesHook: true,
}, null, 2));
