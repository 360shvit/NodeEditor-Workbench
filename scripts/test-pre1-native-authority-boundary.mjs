import assert from 'node:assert/strict';
import fs from 'node:fs';

const rust = fs.readFileSync('src-tauri/src/main.rs', 'utf8');
const capability = JSON.parse(fs.readFileSync('src-tauri/capabilities/default.json', 'utf8'));
const config = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));

function functionBlock(name) {
  const start = rust.indexOf(`fn ${name}`);
  assert.ok(start >= 0, `missing Rust function ${name}`);
  const nextFn = rust.indexOf('\nfn ', start + 4);
  const nextCommand = rust.indexOf('\n#[tauri::command]', start + 4);
  const candidates = [nextFn, nextCommand].filter((value) => value > start);
  const end = candidates.length ? Math.min(...candidates) : rust.length;
  return rust.slice(start, end);
}

// WebView capability stays intentionally tiny: native dialogs/filesystem remain Rust-owned.
assert.deepEqual(capability.permissions, ['core:event:default', 'core:webview:allow-set-webview-zoom']);
assert.doesNotMatch(JSON.stringify(capability), /dialog:|fs:|shell:|process:|http:/);
assert.equal(config.app.security.csp['default-src'], "'self'");
assert.equal(config.app.security.csp['script-src'], "'self'");
assert.equal(config.app.security.csp['object-src'], "'none'");
assert.equal(config.app.security.csp['frame-src'], "'none'");

// Project authority: frontend paths are relative and existing files are canonicalized back under the selected root.
const safeRelative = functionBlock('safe_relative');
assert.match(safeRelative, /Component::Normal/);
assert.match(safeRelative, /Unsafe relative path rejected/);
const resolveProject = functionBlock('resolve_existing_project_file');
assert.match(resolveProject, /fs::canonicalize\(&joined\)/);
assert.match(resolveProject, /canonical\.starts_with\(&project\.canonical_root\)/);
assert.match(resolveProject, /canonical\.is_file\(\)/);

// Windows reparse points/junctions must be rejected at all non-project picker/output write boundaries.
assert.match(rust, /fn metadata_is_reparse_point/);
for (const name of [
  'inspect_output_path',
  'ensure_output_path',
  'select_output_directory',
  'select_worldgen_log',
  'select_worldgen_log_folder',
  'read_worldgen_performance',
  'register_save_target_path',
  'revalidate_registered_save_target',
]) {
  assert.match(functionBlock(name), /metadata_is_reparse_point/, `${name} must reject Windows reparse points`);
}
assert.match(functionBlock('select_worldgen_log_from_folder'), /metadata_is_reparse_point/);

// Opaque handles prevent arbitrary frontend path registration after native user authorization.
for (const field of ['output_roots', 'save_targets', 'worldgen_logs']) assert.match(rust, new RegExp(`${field}: Mutex<HashMap`));
assert.match(rust, /X-Hytale-Save-Token/);
assert.match(rust, /Native save token is no longer valid/);
for (const retired of ['register_output', 'register_save_target', 'write_project_files', 'scan_project']) {
  assert.doesNotMatch(rust, new RegExp(`fn ${retired}\\b`));
}

// Resource and structural safety limits are native, not UI-only.
for (const constant of [
  'MAX_PROJECT_ENTRIES',
  'MAX_JSON_FILES',
  'MAX_JSON_FILE_BYTES',
  'MAX_TOTAL_JSON_BYTES',
  'MAX_JSON_NESTING',
  'MAX_APPLY_FILES',
  'MAX_DISCOVERY_PROBE_FILES',
  'MAX_DISCOVERY_PROBE_FILE_BYTES',
  'MAX_DISCOVERY_PROBE_TOTAL_BYTES',
  'MAX_SOURCE_PREVIEW_BYTES',
]) assert.match(rust, new RegExp(`const ${constant}:`));
assert.match(functionBlock('apply_project_files'), /resolve_existing_project_file/);
assert.match(functionBlock('apply_project_files'), /MAX_APPLY_FILES/);
assert.match(rust, /project_scan_rejects_external_junction_and_reports_reparse/);
assert.match(rust, /output_write_rejects_in_root_junction_component/);

console.log(JSON.stringify({
  capabilityLeastPrivilege: true,
  projectCanonicalContainment: true,
  reparsePointDenials: true,
  nativeGrantHandles: true,
  nativeResourceLimits: true,
}, null, 2));
console.log('Pre-1.0 Audit 07 — Native/Tauri authority boundary: PASS');
