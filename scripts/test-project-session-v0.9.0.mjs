import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const store = readFileSync(new URL('../src/store.ts', import.meta.url), 'utf8');
const persistence = readFileSync(new URL('../src/projects/projectPersistence.ts', import.meta.url), 'utf8');
const folder = readFileSync(new URL('../src/components/FolderOpenButton.tsx', import.meta.url), 'utf8');
const explorer = readFileSync(new URL('../src/components/ProjectExplorer.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const bridge = readFileSync(new URL('../src/io/desktopBridge.ts', import.meta.url), 'utf8');
const loader = readFileSync(new URL('../src/io/folderLoader.ts', import.meta.url), 'utf8');
const runtime = readFileSync(new URL('../tauri-ui/tauri-runtime.js', import.meta.url), 'utf8');
const rust = readFileSync(new URL('../src-tauri/src/main.rs', import.meta.url), 'utf8');

assert.match(app, /RELEASE_MILESTONE, RELEASE_MILESTONE_NAME/);
const commands = readFileSync(new URL('../src/commands/commandRegistry.ts', import.meta.url), 'utf8');
assert.match(commands, /Alt\+ArrowLeft/);
assert.match(commands, /Alt\+ArrowRight/);
assert.match(commands, /Mod\+Shift\+T/);
assert.match(app, /commandForKeyboardEvent\(event\)/);
assert.match(store, /navigationPast: NavigationLocation\[\]/);
assert.match(store, /navigationFuture: NavigationLocation\[\]/);
assert.match(store, /navigateBack: \(\) => void/);
assert.match(store, /navigateForward: \(\) => void/);
assert.match(store, /reopenClosedFile: \(\) => void/);
assert.match(store, /explorerFolderState: Record<string, boolean>/);
assert.match(store, /editing: false,[\s\S]*changeSet: emptyChangeSet\(\),[\s\S]*changePast: \[\],[\s\S]*changeFuture: \[\]/);

assert.match(persistence, /hytale-workbench\.projects\.v1/);
assert.match(persistence, /hytale-workbench\.project-session\.v1:/);
assert.match(persistence, /openFilePaths/);
assert.match(persistence, /navigationCurrent/);
assert.match(persistence, /navigationPast/);
assert.match(persistence, /navigationFuture/);
assert.match(persistence, /recentlyClosedFilePaths/);
assert.match(persistence, /sidebarView/);
assert.match(persistence, /sidebarVisible/);
const writer = persistence.slice(persistence.indexOf('export function writeProjectSession'));
assert.doesNotMatch(writer, /changeSet\s*:/i);
assert.doesNotMatch(writer, /changePast\s*:/i);
assert.doesNotMatch(writer, /changeFuture\s*:/i);
assert.doesNotMatch(writer, /editing\s*:/i);
assert.doesNotMatch(writer, /old(?:File|Source)?Text\s*:/i);

assert.match(folder, /Recent projects/);
assert.match(folder, /toggleRecentProjectPinned/);
assert.match(folder, /forgetRecentProject/);
assert.match(folder, /openFolder\(project\.rootPath\)/);
assert.match(folder, /openDirectoryWorkspace\(rootPath, traceId\)/);
assert.match(explorer, /Open editors/i);
assert.match(explorer, /Reopen closed editor/);
assert.match(explorer, /explorerFolderState/);

assert.match(bridge, /root: string/);
assert.match(bridge, /desktopOpenProjectAt/);
assert.match(bridge, /\/api\/project\/open-recent/);
assert.match(bridge, /REAUTHORIZE_RECENT/);
assert.match(loader, /projectRoot\?: string/);
assert.match(loader, /projectRoot: scan\.root/);
assert.match(runtime, /\/api\/project\/open-recent/);
assert.match(runtime, /invoke\('open_recent_project'/);
assert.match(runtime, /invoke\('select_project'/);
assert.match(rust, /struct ProjectScan \{[\s\S]*root: String/);
assert.match(rust, /root: canonical_root\.to_string_lossy\(\)\.to_string\(\)/);

const icon = readFileSync(new URL('../src-tauri/icons/app-icon-source.png', import.meta.url));
const iconHash = createHash('sha256').update(icon).digest('hex');
assert.equal(iconHash, '5437f9f1fbfc51d27b2249c9d525a106ae6f70cc921a2578b331a39cf312f505');

console.log(JSON.stringify({
  version: '0.11.34',
  persistent: ['recent-projects', 'open-file-editors', 'workspace/filter/explorer state', 'navigation', 'recently-closed-file-editors'],
  sessionOnly: ['editing', 'changeSet', 'undo', 'redo'],
  fileContentsPersisted: false,
  recentProjectsRescanFilesystem: true,
  recentProjectsRequireNativeGrant: true,
  navigationShortcuts: ['Alt+Left', 'Alt+Right', 'Ctrl+Shift+T'],
  newIconSourceHash: iconHash,
}, null, 2));
