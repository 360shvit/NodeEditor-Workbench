import assert from 'node:assert/strict';
import fs from 'node:fs';

const rust = fs.readFileSync('src-tauri/src/main.rs', 'utf8');
const capability = JSON.parse(fs.readFileSync('src-tauri/capabilities/default.json', 'utf8'));
const config = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));

function block(name) {
  const needle = `fn ${name}(`;
  const start = rust.indexOf(needle);
  assert.ok(start >= 0, `missing Rust function ${name}`);
  const ends = [rust.indexOf('\nfn ', start + needle.length), rust.indexOf('\n#[tauri::command]', start + needle.length)]
    .filter((value) => value > start);
  return rust.slice(start, ends.length ? Math.min(...ends) : rust.length);
}

assert.deepEqual(capability.permissions, ['core:event:default', 'core:webview:allow-set-webview-zoom']);
assert.doesNotMatch(JSON.stringify(capability), /dialog:|fs:|shell:|process:|http:/);
assert.equal(config.app.security.csp['default-src'], "'self'");
assert.equal(config.app.security.csp['script-src'], "'self'");
assert.equal(config.app.security.csp['object-src'], "'none'");
assert.equal(config.app.security.csp['frame-src'], "'none'");

assert.match(block('safe_relative'), /Component::Normal/);
assert.match(block('resolve_existing_project_file'), /fs::canonicalize\(&joined\)/);
assert.match(block('resolve_existing_project_file'), /canonical\.starts_with\(&project\.canonical_root\)/);
assert.match(block('active_project'), /revalidate_authorized_directory/);
assert.match(block('commit_discovery_roots'), /revalidate_authorized_directory/);
assert.match(block('output_root'), /revalidate_authorized_directory/);
assert.match(block('ensure_output_path'), /fs::canonicalize\(&target\)/);
assert.match(block('select_worldgen_log_from_folder'), /canonical_folder/);
assert.match(block('select_worldgen_log_from_folder'), /canonical\.starts_with\(&canonical_folder\)/);
assert.match(block('read_worldgen_performance'), /revalidate_authorized_directory\(&folder, &folder/);

assert.match(rust, /metadata_is_reparse_point\(&metadata\)/);
assert.match(rust, /X-Hytale-Save-Token/);
assert.match(rust, /MAX_PROJECT_ENTRIES/);
assert.match(rust, /MAX_JSON_FILE_BYTES/);
assert.match(rust, /MAX_JSON_NESTING/);
assert.match(rust, /authorized_directory_retarget_is_rejected/);
assert.match(rust, /output_authority_retarget_is_rejected_before_write/);
assert.match(rust, /worldgen_folder_authority_retarget_is_rejected/);

console.log('Pre-1.0 Audit 07 — Native/Tauri authority boundary: PASS');
