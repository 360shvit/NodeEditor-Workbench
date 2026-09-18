import fs from 'node:fs';

const path = 'src-tauri/src/main.rs';
let source = fs.readFileSync(path, 'utf8');

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
  source = source.slice(0, start) + replacement + source.slice(end);
}

replaceOnce(
  'persist intended fingerprints in recovery journal',
`struct ApplyRecoveryJournal {
    project_root: String,
    txn_id: u64,
    files: Vec<String>,
}`,
`struct ApplyRecoveryJournal {
    project_root: String,
    txn_id: u64,
    files: Vec<String>,
    #[serde(default)]
    intended_fingerprints: HashMap<String, u64>,
}`,
);

replaceOnce(
  'insert deterministic Apply fingerprint helper',
`fn recovery_journal_path(app: &AppHandle) -> Result<PathBuf, String> {`,
`fn apply_content_fingerprint(bytes: &[u8]) -> u64 {
    // Stable FNV-1a identity fingerprint for crash/race disambiguation. This is not
    // a cryptographic trust primitive; it distinguishes Workbench's own intended
    // bytes from later ordinary filesystem writes without persisting project content.
    let mut hash = 0xcbf29ce484222325u64;
    for byte in bytes {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

fn recovery_journal_path(app: &AppHandle) -> Result<PathBuf, String> {`,
);

replaceBetween(
  'late-writer-safe recovery',
  'fn recover_journal_for_root(app: &AppHandle, root: &Path, journal: &ApplyRecoveryJournal) -> Result<(), String> {',
  '\nfn recover_project_transaction(',
`fn recover_journal_for_root(app: &AppHandle, root: &Path, journal: &ApplyRecoveryJournal) -> Result<(), String> {
    let committed = recovery_commit_state(app, journal.txn_id)?;

    // Removing staged temp files is always safe: they are transaction-owned and are
    // never the user-visible target. Do this even if a later ambiguity forces us to
    // preserve both the current target and its backup for manual reconciliation.
    for raw in journal.files.iter().rev() {
        let target = recovery_target(root, raw)?;
        let temp = transaction_file(&target, journal.txn_id, "tmp")?;
        remove_recovery_artifact(&temp)?;
    }

    if !committed {
        // Preflight every target before restoring any backup. A crash can occur after
        // Workbench replaced a target but before it wrote the commit marker. If another
        // process then writes newer content, recovery must never overwrite that newer
        // file. Older journals without fingerprints are therefore ambiguous only when
        // both target and backup exist, and fail closed in that state.
        for raw in &journal.files {
            let target = recovery_target(root, raw)?;
            let backup = transaction_file(&target, journal.txn_id, "bak")?;
            if !backup.exists() || !target.exists() { continue; }

            let backup_metadata = fs::symlink_metadata(&backup)
                .map_err(|error| io_error("Cannot inspect Apply backup", error))?;
            if backup_metadata.file_type().is_symlink() || metadata_is_reparse_point(&backup_metadata) || !backup_metadata.is_file() {
                return Err(format!("Refusing unsafe Apply backup: {}", backup.display()));
            }
            let target_metadata = fs::symlink_metadata(&target)
                .map_err(|error| io_error("Cannot inspect recovery target", error))?;
            if target_metadata.file_type().is_symlink() || metadata_is_reparse_point(&target_metadata) || !target_metadata.is_file() {
                return Err(format!("Refusing unsafe Apply recovery target: {}", target.display()));
            }
            let expected = journal.intended_fingerprints.get(raw).ok_or_else(|| format!(
                "Apply recovery for {raw} is ambiguous because this older journal has no intended-content fingerprint. Current file and backup were preserved."
            ))?;
            let current = fs::read(&target)
                .map_err(|error| io_error(&format!("Cannot inspect recovery target {raw}"), error))?;
            if apply_content_fingerprint(&current) != *expected {
                return Err(format!(
                    "Apply recovery refused to overwrite a newer external edit for {raw}. Current file and backup were preserved."
                ));
            }
        }
    }

    for raw in journal.files.iter().rev() {
        let target = recovery_target(root, raw)?;
        let backup = transaction_file(&target, journal.txn_id, "bak")?;
        if committed {
            remove_recovery_artifact(&backup)?;
            continue;
        }
        if !backup.exists() { continue; }
        let metadata = fs::symlink_metadata(&backup).map_err(|error| io_error("Cannot inspect Apply backup", error))?;
        if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || !metadata.is_file() {
            return Err(format!("Refusing unsafe Apply backup: {}", backup.display()));
        }
        if target.exists() {
            // Preflight above proved this is still Workbench's intended replacement.
            fs::remove_file(&target).map_err(|error| io_error(&format!("Cannot roll back {}", target.display()), error))?;
        }
        fs::rename(&backup, &target).map_err(|error| io_error(&format!("Cannot restore {}", target.display()), error))?;
    }

    clear_recovery_journal(app)?;
    Ok(())
}
`,
);

replaceBetween(
  'sync committed target without overwriting later writers',
  'fn verify_committed_apply_target(entry: &PreparedApplyFile) -> Result<(), String> {',
  '\nfn rollback_prepared(',
`fn sync_committed_apply_target(entry: &PreparedApplyFile) -> Result<(), String> {
    // The atomic rename installed Workbench's staged file. Do not compare content and
    // roll back here: a later external writer is newer authority and must be allowed to
    // win. The watcher will surface a differing post-Apply write.
    fs::File::open(&entry.target)
        .and_then(|file| file.sync_all())
        .map_err(|error| io_error(&format!("Cannot sync applied target: {}", entry.display), error))
}
`,
);

replaceBetween(
  'late-writer-safe in-process rollback',
  'fn rollback_prepared(prepared: &[PreparedApplyFile]) -> Result<(), String> {',
  '\nfn rollback_apply_failure(',
`fn rollback_prepared(prepared: &[PreparedApplyFile]) -> Result<(), String> {
    let mut failures = Vec::new();

    // Temp files are transaction-owned, so they may always be removed independently.
    for entry in prepared.iter().rev() {
        if entry.temp.exists() {
            if let Err(error) = fs::remove_file(&entry.temp) {
                failures.push(io_error(&format!("Cannot remove staged Apply file {}", entry.temp.display()), error));
            }
        }
    }

    // Before restoring any backup, prove every currently visible target is still the
    // replacement Workbench wrote. This prevents partial rollback and, critically,
    // prevents deleting a newer external edit that arrived after Workbench's rename.
    for entry in prepared.iter().rev() {
        if !entry.backup.exists() || !entry.target.exists() { continue; }
        let metadata = match fs::symlink_metadata(&entry.target) {
            Ok(metadata) => metadata,
            Err(error) => {
                failures.push(io_error(&format!("Cannot inspect partially committed Apply target {}", entry.target.display()), error));
                continue;
            }
        };
        if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) || !metadata.is_file() {
            failures.push(format!("Refusing to overwrite unsafe or newer Apply target {}", entry.target.display()));
            continue;
        }
        match fs::read_to_string(&entry.target) {
            Ok(current) if current == entry.text => {}
            Ok(_) => failures.push(format!(
                "Refusing to overwrite a newer external edit at {}; current file and backup were preserved.",
                entry.display
            )),
            Err(error) => failures.push(io_error(&format!("Cannot inspect partially committed Apply target {}", entry.target.display()), error)),
        }
    }
    if !failures.is_empty() { return Err(failures.join(" | ")); }

    for entry in prepared.iter().rev() {
        if !entry.backup.exists() { continue; }
        if entry.target.exists() {
            fs::remove_file(&entry.target)
                .map_err(|error| io_error(&format!("Cannot remove partially committed Apply target {}", entry.target.display()), error))?;
        }
        fs::rename(&entry.backup, &entry.target)
            .map_err(|error| io_error(&format!("Cannot restore Apply backup {}", entry.backup.display()), error))?;
    }
    Ok(())
}
`,
);

replaceOnce(
  'journal stores intended fingerprints',
`        files: resolved.iter().map(|(_, display, _, _)| display.clone()).collect(),
    };`,
`        files: resolved.iter().map(|(_, display, _, _)| display.clone()).collect(),
        intended_fingerprints: resolved.iter()
            .map(|(_, display, _, text)| (display.clone(), apply_content_fingerprint(text.as_bytes())))
            .collect(),
    };`,
);

replaceOnce(
  'sync committed target call',
`        if let Err(primary) = verify_committed_apply_target(entry) {`,
`        if let Err(primary) = sync_committed_apply_target(entry) {`,
);

replaceBetween(
  'replace unsafe post-commit verification fixture',
  '    #[test]\n    fn committed_apply_target_verification_detects_concurrent_rewrite() {',
  '\n    #[test]\n    fn rollback_prepared_surfaces_restore_failure_and_retains_backup() {',
`    #[test]
    fn rollback_preserves_newer_external_target_and_backup() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before UNIX epoch")
            .as_nanos();
        let base = std::env::temp_dir().join(format!("hgw-apply-late-writer-{unique}"));
        fs::create_dir_all(&base).expect("create late-writer fixture");
        let target = base.join("target.json");
        let temp = base.join("temp.json");
        let backup = base.join("backup.json");
        fs::write(&target, br#"{"value":4}"#).expect("write newer external target");
        fs::write(&temp, br#"{"value":3}"#).expect("write stale transaction temp");
        fs::write(&backup, br#"{"value":1}"#).expect("write original backup");
        let prepared = vec![PreparedApplyFile {
            target: target.clone(),
            temp: temp.clone(),
            backup: backup.clone(),
            display: "target.json".to_string(),
            expected: r#"{"value":1}"#.to_string(),
            text: r#"{"value":3}"#.to_string(),
        }];

        let error = rollback_prepared(&prepared).expect_err("newer external target must make rollback fail closed");
        assert!(error.contains("newer external edit"));
        assert_eq!(fs::read_to_string(&target).expect("newer target preserved"), r#"{"value":4}"#);
        assert_eq!(fs::read_to_string(&backup).expect("backup preserved"), r#"{"value":1}"#);
        assert!(!temp.exists(), "transaction-owned temp may still be cleaned");
        fs::remove_dir_all(&base).expect("clean late-writer fixture");
    }

    #[test]
    fn apply_content_fingerprint_is_stable_and_content_sensitive() {
        assert_eq!(apply_content_fingerprint(b"same"), apply_content_fingerprint(b"same"));
        assert_ne!(apply_content_fingerprint(b"same"), apply_content_fingerprint(b"different"));
    }
`,
);

fs.writeFileSync(path, source);
console.log('Hardened Track 09 against post-replace external writers and ambiguous crash recovery.');
