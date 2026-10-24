# Pre-1.0 Audit 09 — Apply Transaction, Recovery & Concurrency

**Status:** PASS — Windows Apply persistence correction verified by native regressions and installed rc.8 Apply/reopen acceptance on 2026-10-24.
**Branch:** `audit/pre-1.0-full-review`  
**Baseline release identity:** `v0.11.36-rc.3`  
**Durable gate:** `npm run test:pre1-apply-transaction-recovery`

## Scope

This track reviews the native Apply transaction boundary end to end: conflict detection, recovery journal and commit-marker handling, temp/backup sequencing, rollback behavior, watcher suppression, project lifecycle concurrency, and failure/race recovery. The review treats the native Tauri layer as the authority for project-file mutation and requires recovery to fail closed when transaction ownership is ambiguous.

## Result

The original source audit passed. Installed rc.7 acceptance on 2026-10-22 exposed the additional 09-D blocker below. Its correction subsequently passed native regression tests and the signed rc.8 installed Apply/reopen retest; the evidence and scope are recorded below.

The audit found three concrete hardening gaps and remediated all three with durable source contracts plus Windows-native failure/race tests. The final Track 09 validation run passed the Track 09 gate, all 18 locked native Rust tests, release/embedded parity, the complete registered regression matrix, and the zero-unused-source audit.

## Findings and remediation

### 09-A — Transaction lock scope was narrower than the transaction authority boundary

**Classification:** must-fix before 1.0 — remediated.

The existing `apply_transaction_lock` serialized Apply against Apply, but project switch, reload/recovery, project close, and application exit could still cross the same project/recovery filesystem state while an Apply transaction was active.

Remediation:

- `set_active_project` now serializes against the Apply transaction lock.
- `reload_project` takes the same lock before recovery/rescan work.
- `close_project` takes the same lock before clearing the active project.
- `exit_application` takes the same lock before exiting.
- `apply_project_files` remains protected by the same lock.

The old v0.11.11 native-window regression was updated from pinning the exact historical one-argument `exit_application` signature to asserting the stronger lifecycle invariant: application exit remains guarded and is serialized against Apply.

### 09-B — Recovery metadata could be ambiguous or unreadable without a sufficiently strict failure boundary

**Classification:** must-fix before 1.0 — remediated.

Recovery metadata is now handled fail-closed:

- optional recovery files distinguish `NotFound` from other read failures;
- unreadable journal/commit metadata rejects Apply/recovery rather than being treated as absent;
- the commit marker must parse as a transaction id and exactly match the journal transaction id;
- mismatched or malformed commit markers refuse recovery;
- the recovery journal persists intended-content fingerprints with backward-compatible defaulting for older journals.

This prevents ambiguous metadata from being silently interpreted as a clean transaction state.

### 09-C — Rollback/recovery needed protection against a newer external writer

**Classification:** must-fix before 1.0 — remediated.

A post-replace external writer must not be mistaken for Workbench-owned rollback material. The hardened path now distinguishes transaction-owned content from a newer external edit and refuses to overwrite ambiguous/newer targets.

Remediation:

- intended-content fingerprints are recorded in the recovery journal;
- recovery compares the current target against the transaction fingerprint before deciding ownership;
- rollback verifies that an existing target is still the content written by the current Apply transaction before replacing it with the backup;
- a newer or unsafe target is preserved together with the backup and produces an explicit fail-closed error;
- target sync no longer classifies a later external writer as rollback material merely because verification happened after replacement.

## Transaction ordering reviewed

The durable gate protects the expected sequence:

1. write recovery journal;
2. stage transaction temp files;
3. secure/revalidate originals into backups;
4. replace targets from staged files;
5. sync committed targets;
6. write the matching commit marker;
7. install watcher suppression for known Workbench writes;
8. clear recovery metadata only after the transaction is safely resolved.

Conflict and failure exits are required to rollback safely or retain recovery metadata/backups when automatic restoration cannot be proven safe.

## Automated evidence

`test:pre1-apply-transaction-recovery` verifies the source-level transaction contract, including journal fingerprints, strict metadata reads, exact commit-marker identity, lock coverage across Apply/project switch/reload/close/exit, rollback ownership checks, transaction ordering, watcher suppression, and registration of the native failure/race fixtures.

The locked Windows Rust suite includes dedicated Track 09 cases for:

- unreadable optional recovery metadata failing closed;
- exact commit-marker transaction identity;
- late Apply conflict preserving an external change for rollback;
- rollback preserving a newer external target and backup;
- stable/content-sensitive Apply fingerprints;
- rollback restore failures surfacing while retaining the backup.

The final temporary validation harness proved the complete candidate state before committing it: Track 09 gate PASS, **18/18 native tests PASS**, release/embedded contract PASS, full registered regression matrix PASS, and zero unused source carry PASS. The temporary preparation workflows/scripts were then removed from the branch, leaving only the permanent product changes and durable regression gate.

## Accepted limits / follow-up ownership

- Filesystem durability across abrupt OS/power failure ultimately depends on Windows/NTFS and underlying storage semantics; the application can enforce ordering and `sync_all` boundaries but cannot provide hardware-level guarantees.
- The lock is an in-process authority boundary. Cross-process coordination between multiple independent HGW processes targeting the same project is not claimed by this track and should be treated explicitly if multi-process project ownership becomes supported.
- Large transaction CPU/I/O behavior belongs to Track 11 (performance/scalability).
- ZIP, import/export, output-copy and large-project I/O boundaries belong to Track 10.

## Exit decision

Track 09 is complete. The reviewed Apply path now fails closed on ambiguous recovery state, serializes lifecycle operations against active Apply/recovery work, preserves newer external edits instead of overwriting them during rollback, and has repeatable regression coverage for the corrected invariants.

**Next:** Track 10 — I/O, ZIP, import/export & large-project safety.

## 09-D — Windows file synchronization used read-only handles

**Classification:** must-fix before 1.0 — remediated; native regressions and installed rc.8 retest passed.

The rc.7 installed test failed before staging project bytes: recovery-journal persistence returned Windows OS error 5. `sync_write` closed the write handle, reopened the journal read-only and attempted `sync_all`. The staged and committed file paths repeated that pattern. Windows requires write access for `FlushFileBuffers`.

The correction keeps a writable handle through write/sync for journal, marker and staged files, and opens the committed target writable without creating or truncating it. All synchronization failures remain fatal. Transaction ordering, rollback and late-writer protection are unchanged. New native tests cover journal create/shorter overwrite, stage/replace/sync, nontruncating committed sync, missing targets, non-file paths and read-only file rejection. Three tests reproduced error 5 before remediation; all four passed afterward in an isolated Windows harness using the production helpers. Required PR CI and protected rc.8 candidate run `39997158411` passed 93 suites, 250 soak cycles and 43 native tests, including all four new fixtures.

See the [rc.7 installed failure record](RC7_INSTALLED_ACCEPTANCE.md) for exact candidate identity and owner versus direct observations.

**Installed closure, 2026-10-24:** the owner confirmed successful Apply and reopening on signed rc.8. Independent inspection matched installed application/resources to the candidate and proved that only the intended `SmokeSource.json` Value changed from 1 to 2; the other three fixture files were unchanged. [The rc.8 acceptance record](RC8_INSTALLED_ACCEPTANCE.md) distinguishes the owner-reported UI sequence from direct file verification. Track 09 is PASS again. Representative-project and remaining installed updater/concurrency cases stay in Track 18; no broader acceptance or publication is implied.
