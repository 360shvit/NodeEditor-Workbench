import assert from 'node:assert/strict';
import fs from 'node:fs';

const rust = fs.readFileSync('src-tauri/src/main.rs', 'utf8');
const bridge = fs.readFileSync('src/io/desktopBridge.ts', 'utf8');
const loader = fs.readFileSync('src/io/folderLoader.ts', 'utf8');
const explorer = fs.readFileSync('src/components/ProjectExplorer.tsx', 'utf8');
const inspector = fs.readFileSync('src/features/inspector/InspectorPane.tsx', 'utf8');
const tabs = fs.readFileSync('src/components/FileTabs.tsx', 'utf8');
const store = fs.readFileSync('src/store.ts', 'utf8');
const persistence = fs.readFileSync('src/projects/projectPersistence.ts', 'utf8');
const runtime = fs.readFileSync('tauri-ui/tauri-runtime.js', 'utf8');

// Native profile management stays project-relative and detector based.
for (const symbol of [
  'select_project_probe_path',
  'remove_project_probe_path',
  'reset_project_probe_paths',
  'commit_discovery_roots',
]) assert.match(rust, new RegExp(symbol));
assert.match(rust, /Semantic discovery folders must be inside the active project/);
assert.match(rust, /scan_tree\(&project\.root, &discovery_roots\)/);
assert.match(rust, /persist_discovery_roots/);
assert.doesNotMatch(rust, /force[_ -]?load/i);

// Raw source preview is a separate bounded read-only filesystem operation.
assert.match(rust, /MAX_SOURCE_PREVIEW_BYTES: u64 = 4 \* 1024 \* 1024/);
assert.match(rust, /read_project_text_preview/);
assert.match(rust, /kind: "too-large"/);
assert.match(rust, /kind: "binary"/);
assert.match(runtime, /\/api\/project\/text-preview/);
assert.match(bridge, /desktopReadProjectTextPreview/);
assert.match(loader, /readWorkspaceTextPreview/);
assert.match(loader, /TextDecoder\('utf-8', \{ fatal: true \}\)/);

// Inventory files open a source tab; source tabs do not become semantic file tabs.
assert.match(explorer, /onOpenSource\(descriptor\.path\)/);
assert.match(store, /kind: 'source'/);
assert.match(store, /openSourceTab/);
assert.match(inspector, /SourceInspectorContent/);
assert.match(inspector, /read only/i);
assert.match(inspector, /Preview limit exceeded/);
assert.match(inspector, /Binary \/ non-UTF-8/);
assert.match(tabs, /Open Read-only Source/);
assert.match(tabs, /SOURCE/);

// File-level diagnostics can route into the read-only source view.
assert.match(inspector, /diagnostic-source-button/);
assert.match(inspector, /!diagnostic\.nodeId/);
assert.match(inspector, /openSourceTab\(file!\.path\)/);

// Session persistence may retain source paths, never cached source text.
assert.match(persistence, /openSourcePaths/);
assert.match(persistence, /activeSourcePath/);
assert.doesNotMatch(persistence, /sourceText|previewText|fileContents|rawSource/);
assert.match(store, /openSourcePaths: sourceTabs\.map\(\(tab\) => tab\.path\)/);

// Discovery profile UI exposes add / rescan / remove / reset and protects staged work.
assert.match(explorer, /Semantic discovery/);
assert.match(explorer, /Add folder/);
assert.match(explorer, /Re-scan with current detectors/);
assert.match(explorer, /Remove custom discovery root/);
assert.match(explorer, /Reset defaults/);
assert.match(explorer, /Removing discovery roots is locked while staged changes exist/);

const embedded = fs.readFileSync('tauri-ui/app.js', 'utf8');
assert.match(embedded, /Split Workview/);
assert.match(embedded, /SourceInspectorContent/);
assert.match(embedded, /Semantic discovery/);
assert.match(embedded, /openSourcePaths/);
assert.match(embedded, /file-text/);

console.log('v0.10.4 load-profile / bounded source-view checks passed.');
