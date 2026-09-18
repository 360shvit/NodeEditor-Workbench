import fs from 'node:fs';

const mainPath = 'src-tauri/src/main.rs';
const packagePath = 'package.json';
let source = fs.readFileSync(mainPath, 'utf8');

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing rewrite target: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Rewrite target is not unique: ${label}`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceBetween(label, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing rewrite start: ${label}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Missing rewrite end: ${label}`);
  if (source.indexOf(startMarker, start + startMarker.length) >= 0) throw new Error(`Rewrite start is not unique: ${label}`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

replaceOnce(
  'fail-closed recovery journal read',
`fn read_recovery_journal(app: &AppHandle) -> Result<Option<ApplyRecoveryJournal>, String> {
    let path = recovery_journal_path(app)?;
    let Ok(raw) = fs::read_to_string(&path) else { return Ok(None); };
    let journal = serde_json::from_str::<ApplyRecoveryJournal>(&raw)
        .map_err(|error| io_error("Cannot parse Apply recovery journal; no project files were modified", error))?;
    Ok(Some(journal))
}
`,
`fn read_optional_utf8_file(path: &Path, context: &str) -> Result<Option<String>, String> {
    match fs::read_to_string(path) {
        Ok(raw) => Ok(Some(raw)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(io_error(context, error)),
    }
}

fn read_recovery_journal(app: &AppHandle) -> Result<Option<ApplyRecoveryJournal>, String> {
    let path = recovery_journal_path(app)?;
    let Some(raw) = read_optional_utf8_file(
        &path,
        "Cannot read Apply recovery journal; refusing Apply until recovery metadata is readable",
    )? else { return Ok(None); };
    let journal = serde_json::from_str::<ApplyRecoveryJournal>(&raw)
        .map_err(|error| io_error("Cannot parse Apply recovery journal; no project files were modified", error))?;
    Ok(Some(journal))
}
`
);

replaceOnce(
  'strict recovery commit marker',
`fn recover_journal_for_root(app: &AppHandle, root: &Path, journal: &ApplyRecoveryJournal) -> Result<(), String> {
    let commit_path = recovery_commit_path(app)?;
    let committed = fs::read_to_string(&commit_path)
        .ok()
        .and_then(|value| value.trim().parse::<u64>().ok())
        .map(|id| id == journal.txn_id)
        .unwrap_or(false);

`,
`fn parse_recovery_commit_marker(raw: &str, txn_id: u64) -> Result<bool, String> {
    let id = raw.trim().parse::<u64>()
        .map_err(|error| io_error("Cannot parse Apply commit marker; refusing recovery", error))?;
    if id != txn_id {
        return Err(format!(
            "Apply commit marker belongs to transaction {id}, but the recovery journal expects {txn_id}; refusing recovery."
        ));
    }
    Ok(true)
}

fn recovery_commit_state(app: &AppHandle, txn_id: u64) -> Result<bool, String> {
    let commit_path = recovery_commit_path(app)?;
    let Some(raw) = read_optional_utf8_file(
        &commit_path,
        "Cannot read Apply commit marker; refusing recovery",
    )? else { return Ok(false); };
    parse_recovery_commit_marker(&raw, txn_id)
}

fn recover_journal_for_root(app: &AppHandle, root: &Path, journal: &ApplyRecoveryJournal) -> Result<(), String> {
    let committed = recovery_commit_state(app, journal.txn_id)?;

`
);

replaceOnce(
  'serialize project switch against Apply',
`fn set_active_project(app: &AppHandle, state: &State<'_, DesktopState>, root: PathBuf, trace_id: Option<String>) -> Result<ProjectScan, String> {
    let native_open_started = Instant::now();
`,
`fn set_active_project(app: &AppHandle, state: &State<'_, DesktopState>, root: PathBuf, trace_id: Option<String>) -> Result<ProjectScan, String> {
    let _transaction_guard = state.apply_transaction_lock.lock()
        .map_err(|_| "Apply transaction lock is poisoned.".to_string())?;
    let native_open_started = Instant::now();
`
);

replaceOnce(
  'serialize reload recovery against Apply',
`#[tauri::command]
async fn reload_project(app: AppHandle, state: State<'_, DesktopState>) -> Result<ProjectScan, String> {
    let project = active_project(&state)?;
`,
`#[tauri::command]
async fn reload_project(app: AppHandle, state: State<'_, DesktopState>) -> Result<ProjectScan, String> {
    let _transaction_guard = state.apply_transaction_lock.lock()
        .map_err(|_| "Apply transaction lock is poisoned.".to_string())?;
    let project = active_project(&state)?;
`
);

replaceOnce(
  'serialize close against Apply',
`#[tauri::command]
fn close_project(state: State<'_, DesktopState>) -> Result<ClosedResult, String> {
    clear_active_project(&state)?;
`,
`#[tauri::command]
fn close_project(state: State<'_, DesktopState>) -> Result<ClosedResult, String> {
    let _transaction_guard = state.apply_transaction_lock.lock()
        .map_err(|_| "Apply transaction lock is poisoned.".to_string())?;
    clear_active_project(&state)?;
`
);

replaceOnce(
  'serialize exit against Apply',
`#[tauri::command]
fn exit_application(app: AppHandle) -> Result<ExitingResult, String> {
    app.exit(0);
`,
`#[tauri::command]
fn exit_application(app: AppHandle, state: State<'_, DesktopState>) -> Result<ExitingResult, String> {
    let _transaction_guard = state.apply_transaction_lock.lock()
        .map_err(|_| "Apply transaction lock is poisoned.".to_string())?;
    app.exit(0);
`
);

replaceBetween(
  'prepared Apply helpers',
  'fn transaction_file(path: &Path, txn_id: u64, kind: &str) -> Result<PathBuf, String> {',
  '\n#[tauri::command]\nfn apply_project_files',
`#[derive(Debug)]
struct PreparedApplyFile {
    target: PathBuf,
    temp: PathBuf,
    backup: PathBuf,
    display: String,
    expected: String,
    text: String,
}

fn transaction_file(path: &Path, txn_id: u64, kind: &str) -> Result<PathBuf, String> {
    let name = path.file_name().and_then(|value| value.to_str()).ok_or_else(|| "Project file name is not valid UTF-8.".to_string())?;
    Ok(path.with_file_name(format!(".{name}.hgw-txn-{txn_id}.{kind}")))
}

fn secure_original_for_apply(entry: &PreparedApplyFile) -> Result<bool, String> {
    fs::rename(&entry.target, &entry.backup)
        .map_err(|error| io_error(&format!("Cannot secure original before apply: {}", entry.target.display()), error))?;
    let current = fs::read_to_string(&entry.backup)
        .map_err(|error| io_error(&format!("Cannot revalidate apply source: {}", entry.display), error))?;
    Ok(current == entry.expected)
}

fn verify_committed_apply_target(entry: &PreparedApplyFile) -> Result<(), String> {
    let current = fs::read_to_string(&entry.target)
        .map_err(|error| io_error(&format!("Cannot verify applied target: {}", entry.display), error))?;
    if current != entry.text {
        return Err(format!(
            "Applied target changed during transaction commit: {}. Automatic rollback is required.",
            entry.display
        ));
    }
    fs::File::open(&entry.target)
        .and_then(|file| file.sync_all())
        .map_err(|error| io_error(&format!("Cannot sync applied target: {}", entry.display), error))
}

fn rollback_prepared(prepared: &[PreparedApplyFile]) -> Result<(), String> {
    let mut failures = Vec::new();
    for entry in prepared.iter().rev() {
        if entry.temp.exists() {
            if let Err(error) = fs::remove_file(&entry.temp) {
                failures.push(io_error(&format!("Cannot remove staged Apply file {}", entry.temp.display()), error));
            }
        }
        if entry.backup.exists() {
            let mut target_ready = true;
            if entry.target.exists() {
                if let Err(error) = fs::remove_file(&entry.target) {
                    failures.push(io_error(&format!("Cannot remove partially committed Apply target {}", entry.target.display()), error));
                    target_ready = false;
                }
            }
            if target_ready {
                if let Err(error) = fs::rename(&entry.backup, &entry.target) {
                    failures.push(io_error(&format!("Cannot restore Apply backup {}", entry.backup.display()), error));
                }
            }
        }
    }
    if failures.is_empty() { Ok(()) } else { Err(failures.join(" | ")) }
}

fn rollback_apply_failure(
    app: &AppHandle,
    prepared: &[PreparedApplyFile],
    primary_error: String,
) -> String {
    match rollback_prepared(prepared) {
        Ok(()) => match clear_recovery_journal(app) {
            Ok(()) => primary_error,
            Err(metadata_error) => format!(
                "{primary_error} Automatic rollback succeeded, but recovery metadata could not be cleared: {metadata_error}. Reopen this project before applying more changes."
            ),
        },
        Err(rollback_error) => format!(
            "{primary_error} Automatic rollback was incomplete: {rollback_error}. Recovery journal and backups were retained; reopen this project to retry recovery before applying more changes."
        ),
    }
}

fn rollback_apply_conflict(
    app: &AppHandle,
    prepared: &[PreparedApplyFile],
    display: &str,
) -> Result<ApplyResult, String> {
    rollback_prepared(prepared).map_err(|rollback_error| format!(
        "Apply detected a concurrent external change for {display}, but automatic rollback was incomplete: {rollback_error}. Recovery metadata and backups were retained; reopen this project before applying more changes."
    ))?;
    clear_recovery_journal(app).map_err(|metadata_error| format!(
        "Apply detected a concurrent external change for {display} and rolled back safely, but recovery metadata could not be cleared: {metadata_error}. Reopen this project before applying more changes."
    ))?;
    Ok(ApplyResult { conflicts: vec![display.to_string()], written: 0 })
}
`
);

replaceBetween(
  'Apply transaction implementation',
  '#[tauri::command]\nfn apply_project_files',
  '\nfn select_worldgen_log_from_folder',
`#[tauri::command]
fn apply_project_files(payload: ApplyPayload, app: AppHandle, state: State<'_, DesktopState>) -> Result<ApplyResult, String> {
    let _apply_guard = state.apply_transaction_lock.lock().map_err(|_| "Apply transaction lock is poisoned.".to_string())?;
    if payload.files.len() > MAX_APPLY_FILES {
        return Err(format!("Apply safety limit exceeded: more than {MAX_APPLY_FILES} files in one transaction."));
    }
    let project = active_project(&state)?;
    ensure_apply_transaction_slot(&app, &project.root)?;
    let mut seen = HashSet::new();
    let mut resolved = Vec::with_capacity(payload.files.len());
    let mut conflicts = Vec::new();

    for file in payload.files {
        if !seen.insert(file.path.clone()) {
            return Err(format!("Duplicate apply path rejected: {}", file.path));
        }
        if file.text.len() as u64 > MAX_JSON_FILE_BYTES {
            return Err(format!("Apply safety limit exceeded for {}.", file.path));
        }
        validate_json_nesting(&file.text, &file.path)?;
        serde_json::from_str::<serde_json::Value>(&file.text)
            .map_err(|error| io_error(&format!("Apply rejected invalid JSON for {}", file.path), error))?;
        let path = match resolve_existing_project_file(&project, &file.path) {
            Ok(path) => path,
            Err(_) => { conflicts.push(file.path); continue; }
        };
        match fs::read_to_string(&path) {
            Ok(current) if current == file.expected => resolved.push((path, file.path, file.expected, file.text)),
            _ => conflicts.push(file.path),
        }
    }

    if !conflicts.is_empty() {
        conflicts.sort();
        return Ok(ApplyResult { conflicts, written: 0 });
    }

    let txn_id = state.next_token.fetch_add(1, Ordering::Relaxed);
    let journal = ApplyRecoveryJournal {
        project_root: project.canonical_root.to_string_lossy().to_string(),
        txn_id,
        files: resolved.iter().map(|(_, display, _, _)| display.clone()).collect(),
    };
    write_recovery_journal(&app, &journal)?;
    let mut prepared: Vec<PreparedApplyFile> = Vec::with_capacity(resolved.len());

    for (target, display, expected, text) in resolved {
        let temp = transaction_file(&target, txn_id, "tmp")?;
        let backup = transaction_file(&target, txn_id, "bak")?;
        if temp.exists() || backup.exists() {
            return Err(rollback_apply_failure(
                &app,
                &prepared,
                format!("Apply transaction artifact already exists for {display}. Reopen the project to recover it safely."),
            ));
        }
        prepared.push(PreparedApplyFile { target, temp, backup, display, expected, text });
        let entry = prepared.last().expect("prepared Apply entry");
        if let Err(error) = fs::copy(&entry.target, &entry.temp) {
            let primary = io_error(&format!("Cannot prepare apply transaction for {}", entry.display), error);
            return Err(rollback_apply_failure(&app, &prepared, primary));
        }
        if let Err(error) = fs::write(&entry.temp, entry.text.as_bytes()) {
            let primary = io_error(&format!("Cannot stage apply transaction for {}", entry.display), error);
            return Err(rollback_apply_failure(&app, &prepared, primary));
        }
        match fs::File::open(&entry.temp).and_then(|file| file.sync_all()) {
            Ok(()) => {}
            Err(error) => {
                let primary = io_error(&format!("Cannot sync staged apply transaction for {}", entry.display), error);
                return Err(rollback_apply_failure(&app, &prepared, primary));
            }
        }
    }

    {
        let mut active = state.active_write_paths.lock().map_err(|_| "Active-write state lock is poisoned.".to_string())?;
        for entry in &prepared { active.insert(entry.target.clone()); }
    }

    for entry in &prepared {
        match secure_original_for_apply(entry) {
            Ok(true) => {}
            Ok(false) => {
                if let Ok(mut active) = state.active_write_paths.lock() { active.clear(); }
                return rollback_apply_conflict(&app, &prepared, &entry.display);
            }
            Err(primary) => {
                if let Ok(mut active) = state.active_write_paths.lock() { active.clear(); }
                return Err(rollback_apply_failure(&app, &prepared, primary));
            }
        }
        if let Err(error) = fs::rename(&entry.temp, &entry.target) {
            if let Ok(mut active) = state.active_write_paths.lock() { active.clear(); }
            let primary = io_error(&format!("Cannot commit apply transaction: {}", entry.target.display()), error);
            return Err(rollback_apply_failure(&app, &prepared, primary));
        }
    }

    for entry in &prepared {
        if let Err(primary) = verify_committed_apply_target(entry) {
            if let Ok(mut active) = state.active_write_paths.lock() { active.clear(); }
            return Err(rollback_apply_failure(&app, &prepared, primary));
        }
    }

    if let Err(error) = mark_recovery_committed(&app, txn_id) {
        if let Ok(mut active) = state.active_write_paths.lock() { active.clear(); }
        return Err(rollback_apply_failure(
            &app,
            &prepared,
            format!("Cannot commit Apply recovery state: {error}"),
        ));
    }

    if let Ok(mut suppression) = state.watch_suppression.lock() {
        for entry in &prepared {
            suppression.insert(entry.target.clone(), SuppressedWrite { expected: entry.text.clone(), until: Instant::now() + Duration::from_secs(2) });
        }
    }
    if let Ok(mut active) = state.active_write_paths.lock() { active.clear(); }

    let mut cleanup_complete = true;
    for entry in &prepared {
        if entry.temp.exists() && fs::remove_file(&entry.temp).is_err() { cleanup_complete = false; }
        if entry.backup.exists() && fs::remove_file(&entry.backup).is_err() { cleanup_complete = false; }
    }
    if cleanup_complete { clear_recovery_journal(&app)?; }

    Ok(ApplyResult { conflicts: Vec::new(), written: prepared.len() })
}
`
);

replaceOnce(
  'existing rollback fixture uses PreparedApplyFile',
`        let prepared = vec![(target.clone(), temp.clone(), backup.clone(), "new".to_string())];

        let error = rollback_prepared(&prepared).expect_err("rollback failure must be surfaced");
`,
`        let prepared = vec![PreparedApplyFile {
            target: target.clone(),
            temp: temp.clone(),
            backup: backup.clone(),
            display: "target.json".to_string(),
            expected: "old".to_string(),
            text: "new".to_string(),
        }];

        let error = rollback_prepared(&prepared).expect_err("rollback failure must be surfaced");
`
);

replaceOnce(
  'insert Track 09 native fixtures',
`    #[test]
    fn rollback_prepared_surfaces_restore_failure_and_retains_backup() {
`,
`    #[test]
    fn optional_recovery_metadata_read_fails_closed_on_non_file() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-recovery-metadata-{unique}"));
        fs::create_dir_all(&base).expect("create recovery metadata fixture");
        let missing = base.join("missing.json");
        assert!(read_optional_utf8_file(&missing, "read optional metadata").expect("missing is allowed").is_none());
        let not_a_file = base.join("journal.json");
        fs::create_dir(&not_a_file).expect("create directory at journal path");
        let error = read_optional_utf8_file(&not_a_file, "read recovery metadata")
            .expect_err("non-file recovery metadata must fail closed");
        assert!(error.contains("read recovery metadata"));
        fs::remove_dir_all(&base).expect("clean recovery metadata fixture");
    }

    #[test]
    fn recovery_commit_marker_requires_exact_transaction_identity() {
        assert!(parse_recovery_commit_marker("42\n", 42).expect("matching marker"));
        assert!(parse_recovery_commit_marker("41", 42).expect_err("mismatch must fail closed").contains("expects 42"));
        assert!(parse_recovery_commit_marker("not-a-number", 42).expect_err("invalid marker must fail closed").contains("Cannot parse Apply commit marker"));
    }

    #[test]
    fn late_apply_conflict_preserves_external_change_for_rollback() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-apply-late-conflict-{unique}"));
        fs::create_dir_all(&base).expect("create late-conflict fixture");
        let target = base.join("target.json");
        let temp = base.join("temp.json");
        let backup = base.join("backup.json");
        fs::write(&target, b"{\"value\":2}").expect("write external edit");
        fs::write(&temp, b"{\"value\":3}").expect("write staged edit");
        let prepared = vec![PreparedApplyFile {
            target: target.clone(),
            temp: temp.clone(),
            backup: backup.clone(),
            display: "target.json".to_string(),
            expected: "{\"value\":1}".to_string(),
            text: "{\"value\":3}".to_string(),
        }];

        assert!(!secure_original_for_apply(&prepared[0]).expect("secure current file"));
        assert!(backup.exists(), "external edit must be captured as the backup");
        rollback_prepared(&prepared).expect("rollback late conflict");
        assert_eq!(fs::read_to_string(&target).expect("restored target"), "{\"value\":2}");
        assert!(!temp.exists());
        assert!(!backup.exists());

        fs::remove_dir_all(&base).expect("clean late-conflict fixture");
    }

    #[test]
    fn committed_apply_target_verification_detects_concurrent_rewrite() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-apply-verify-{unique}"));
        fs::create_dir_all(&base).expect("create verify fixture");
        let target = base.join("target.json");
        fs::write(&target, b"{\"value\":4}").expect("write concurrent target");
        let entry = PreparedApplyFile {
            target: target.clone(),
            temp: base.join("temp.json"),
            backup: base.join("backup.json"),
            display: "target.json".to_string(),
            expected: "{\"value\":1}".to_string(),
            text: "{\"value\":3}".to_string(),
        };
        let error = verify_committed_apply_target(&entry).expect_err("unexpected final content must be rejected");
        assert!(error.contains("changed during transaction commit"));
        fs::remove_dir_all(&base).expect("clean verify fixture");
    }

    #[test]
    fn rollback_prepared_surfaces_restore_failure_and_retains_backup() {
`
);

fs.writeFileSync(mainPath, source);

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.scripts['test:pre1-apply-transaction-recovery'] = 'node scripts/test-pre1-apply-transaction-recovery.mjs';
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log('Prepared Pre-1.0 Track 09 apply transaction/recovery hardening.');
