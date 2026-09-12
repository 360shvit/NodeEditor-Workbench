import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const store = read('src/store.ts');
const guard = read('src/projects/ProjectLifecycleGuard.tsx');
const folder = read('src/components/FolderOpenButton.tsx');
const bridge = read('src/io/desktopBridge.ts');
const runtime = read('tauri-ui/tauri-runtime.js');
const rust = read('src-tauri/src/main.rs');

assert.match(store, /closeProject:\s*\(\)\s*=>\s*void/);
assert.match(store, /closeProject:\s*\(\)\s*=>\s*set/);
assert.match(store, /workspace:\s*undefined/);
assert.match(store, /project:\s*undefined/);
assert.match(store, /editing:\s*false/);
assert.match(store, /changeSet:\s*emptyChangeSet\(\)/);
assert.match(store, /changePast:\s*\[\]/);
assert.match(store, /changeFuture:\s*\[\]/);

assert.match(guard, /guardProjectAction\('close-project'/);
assert.match(guard, /guardProjectAction\('exit-app'/);
assert.match(guard, /Review Changes/);
assert.match(guard, /Discard & Switch/);
assert.match(guard, /Discard & Close/);
assert.match(guard, /Discard & Exit/);
assert.match(guard, /beforeunload/);
assert.match(guard, /desktopSetPendingChangeCount\(changeCount\)/);
assert.match(guard, /subscribeDesktopAppCloseRequested/);
assert.doesNotMatch(guard, /resetChanges\(\)/, 'guard must not discard before a project picker/scan succeeds');

assert.match(folder, /guardProjectAction\('switch-project'/);
assert.match(folder, /requestCloseProject/);
assert.match(folder, />Close Project</);

assert.match(bridge, /desktopSetPendingChangeCount/);
assert.match(bridge, /desktopCloseProject/);
assert.match(bridge, /desktopExitApplication/);
assert.match(bridge, /hgw:app-close-requested/);
assert.match(runtime, /app-close-requested/);
assert.match(runtime, /\/api\/project\/close/);
assert.match(runtime, /\/api\/app\/pending-changes/);
assert.match(runtime, /\/api\/app\/exit/);

assert.match(rust, /pending_change_count:\s*AtomicU64/);
assert.match(rust, /CloseRequested/);
assert.match(rust, /api\.prevent_close\(\)/);
assert.match(rust, /window\.emit\("app-close-requested"/);
assert.match(rust, /fn close_project/);
assert.match(rust, /fn set_pending_changes/);
assert.match(rust, /fn exit_application/);
assert.match(rust, /watcher[\s\S]*= None/);

console.log('project lifecycle safety checks passed after v0.9.4 cleanup.');
