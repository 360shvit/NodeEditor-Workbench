import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const rust = read('src-tauri/src/main.rs');
const pkg = JSON.parse(read('package.json'));

assert.equal(
  pkg.scripts['test:pre1-apply-transaction-recovery'],
  'node scripts/test-pre1-apply-transaction-recovery.mjs',
  'Track 09 gate must stay registered in package.json',
);

assert.equal(pkg.scripts['test:pre1-security-threat-model'], 'node scripts/test-pre1-security-threat-model.mjs');
assert.match(rust, /const MAX_APPLY_FILES: usize = 10_000;/);
assert.match(rust, /apply_transaction_lock: Mutex<\(\)>/);
assert.match(rust, /struct ApplyRecoveryJournal[\s\S]*?project_root: String,[\s\S]*?txn_id: u64,[\s\S]*?files: Vec<String>/);

const optionalRead = sliceBetween(
  rust,
  'fn read_optional_utf8_file(',
  '\nfn read_recovery_journal(',
);
assert.match(optionalRead, /ErrorKind::NotFound/);
assert.match(optionalRead, /Err\(error\) => Err\(io_error\(context, error\)\)/);

const journalRead = sliceBetween(
  rust,
  'fn read_recovery_journal(',
  '\nfn write_recovery_journal(',
);
assert.match(journalRead, /read_optional_utf8_file/);
assert.match(journalRead, /Cannot read Apply recovery journal; refusing Apply/);

const commitMarker = sliceBetween(
  rust,
  'fn parse_recovery_commit_marker(',
  '\nfn recovery_commit_state(',
);
assert.match(commitMarker, /parse::<u64>/);
assert.match(commitMarker, /id != txn_id/);
assert.match(commitMarker, /refusing recovery/);

const recovery = sliceBetween(
  rust,
  'fn recover_journal_for_root(',
  '\nfn recover_project_transaction(',
);
assert.match(recovery, /recovery_commit_state\(app, journal\.txn_id\)\?/);
assert.doesNotMatch(recovery, /fs::read_to_string\(&commit_path\)\s*\.ok\(\)/);

for (const [label, start, end] of [
  ['project switch', 'fn set_active_project(', '\nfn discovery_profiles_path('],
  ['reload', 'async fn reload_project(', '\n#[tauri::command]\nasync fn probe_project_path('],
  ['project close', 'fn close_project(', '\n#[tauri::command]\nfn set_pending_changes('],
  ['application exit', 'fn exit_application(', '\n#[tauri::command]\nfn read_project_file('],
  ['Apply', 'fn apply_project_files(', '\nfn select_worldgen_log_from_folder('],
]) {
  const block = sliceBetween(rust, start, end);
  assert.match(block, /apply_transaction_lock\.lock\(\)/, `${label} must serialize against Apply/recovery`);
}

const secureOriginal = sliceBetween(
  rust,
  'fn secure_original_for_apply(',
  '\nfn verify_committed_apply_target(',
);
assert.match(secureOriginal, /fs::rename\(&entry\.target, &entry\.backup\)/);
assert.match(secureOriginal, /fs::read_to_string\(&entry\.backup\)/);
assert.match(secureOriginal, /current == entry\.expected/);

const verifyTarget = sliceBetween(
  rust,
  'fn verify_committed_apply_target(',
  '\nfn rollback_prepared(',
);
assert.match(verifyTarget, /current != entry\.text/);
assert.match(verifyTarget, /file\.sync_all\(\)/);

const apply = sliceBetween(
  rust,
  'fn apply_project_files(',
  '\nfn select_worldgen_log_from_folder(',
);
for (const marker of [
  'write_recovery_journal(&app, &journal)?',
  'fs::copy(&entry.target, &entry.temp)',
  'secure_original_for_apply(entry)',
  'fs::rename(&entry.temp, &entry.target)',
  'verify_committed_apply_target(entry)',
  'mark_recovery_committed(&app, txn_id)',
  'suppression.insert(entry.target.clone()',
  'clear_recovery_journal(&app)?',
]) {
  assert.ok(apply.includes(marker), `Apply contract marker missing: ${marker}`);
}
assertOrder(apply, [
  'write_recovery_journal(&app, &journal)?',
  'fs::copy(&entry.target, &entry.temp)',
  'secure_original_for_apply(entry)',
  'fs::rename(&entry.temp, &entry.target)',
  'verify_committed_apply_target(entry)',
  'mark_recovery_committed(&app, txn_id)',
  'suppression.insert(entry.target.clone()',
]);
assert.match(apply, /resolved\.push\(\(path, file\.path, file\.expected, file\.text\)\)/);
assert.match(apply, /return rollback_apply_conflict\(&app, &prepared, &entry\.display\)/);

const watcher = sliceBetween(
  rust,
  'fn build_project_watcher(',
  '\nfn clear_active_project(',
);
assert.match(watcher, /active_writes/);
assert.match(watcher, /current == entry\.expected/);
assert.match(watcher, /if suppressed \{ continue; \}/);

for (const nativeTest of [
  'optional_recovery_metadata_read_fails_closed_on_non_file',
  'recovery_commit_marker_requires_exact_transaction_identity',
  'late_apply_conflict_preserves_external_change_for_rollback',
  'committed_apply_target_verification_detects_concurrent_rewrite',
  'rollback_prepared_surfaces_restore_failure_and_retains_backup',
]) {
  assert.match(rust, new RegExp(`fn ${nativeTest}\\(`), `missing native Track 09 fixture: ${nativeTest}`);
}

console.log('Pre-1.0 Audit 09 — Apply transaction, recovery & concurrency: PASS');

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `missing start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `missing end marker after ${startMarker}: ${endMarker}`);
  return source.slice(start, end);
}

function assertOrder(source, markers) {
  let previous = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    assert.ok(index >= 0, `missing ordered marker: ${marker}`);
    assert.ok(index > previous, `marker is out of order: ${marker}`);
    previous = index;
  }
}
