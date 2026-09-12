import assert from 'node:assert/strict';
import fs from 'node:fs';

const store = fs.readFileSync('src/store.ts', 'utf8');
const explorer = fs.readFileSync('src/components/ProjectExplorer.tsx', 'utf8');
const embedded = fs.readFileSync('tauri-ui/app.js', 'utf8');

// Semantic recognition and editor routing are separate decisions.
assert.match(store, /if \(info\) return info\.role === 'graph-document'/);
assert.match(store, /function fileNavigationTab/);
assert.match(store, /selectFile:[\s\S]*fileNavigationTab\(state\.workspace, file\)/);

// Old sessions that stored FLOW / ENTRY / CONFIG as file tabs migrate to Source tabs.
assert.match(store, /legacySourcePaths/);
assert.match(store, /migratedActiveSourcePath/);
assert.match(store, /restoredFileCandidates\.filter\(\(file\) => fileUsesNodeInspector/);

// Navigation and watcher reloads must respect the same routing boundary.
assert.match(store, /navigateBack:[\s\S]*fileNavigationTab\(state\.workspace, file\)/);
assert.match(store, /navigateForward:[\s\S]*fileNavigationTab\(state\.workspace, file\)/);
assert.match(store, /applyExternalWorkspaceReload:[\s\S]*fileNavigationTab\(workspace, file\)/);

// Explorer is explicit: only graph-document opens the Node Inspector.
assert.match(explorer, /const opensAsSource = descriptor\.role !== 'graph-document'/);
assert.match(explorer, /opensAsSource \? onOpenSource\(file\.path\) : onSelect\(file\.id\)/);
assert.match(explorer, /Semantic references remain available to Graph and Diagnostics/);

// Embedded desktop UI must contain the same rule.
assert.match(embedded, /fileUsesNodeInspector/);
assert.match(embedded, /graph-document/);
assert.match(embedded, /Semantic references remain available to Graph and Diagnostics/);

console.log('v0.10.4-r2 semantic role -> source/editor routing checks passed.');
