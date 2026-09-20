# Pre-1.0 Audit 10 — I/O, ZIP, Import/Export & Large-Project Safety

**Status:** PASS — reviewed and remediated; complete Windows PR validation passed.

**Baseline:** `audit/pre-1.0-full-review` at `4f6cea62110bacd01cbfd8134e5fea8d538fcb43`  
**Release identity:** `v0.11.36-rc.3` remains an audit baseline, not a new release target.  
**Durable gate:** `npm run test:pre1-io-zip-export`, plus `cargo test --locked --manifest-path src-tauri/Cargo.toml`.

## Scope and ownership

The supported path is the native Tauri desktop: `FolderOpenButton` → `folderLoader`/`desktopBridge` → `tauri-runtime.js` → native commands. Rust owns project inventory, semantic discovery, source previews, directory export and picker-authorized file saves. `src/io/zip.ts` writes the embedded frontend's STORE archives; `ChangePanel` exposes changed-files ZIP output and native full-project directory copies.

ZIP **import/extraction is N/A**: there is no archive extraction command or supported import UI. Browser directory/snapshot compatibility helpers remain in source but the native UI hides the snapshot entry point; this audit does not introduce or certify a standalone browser distribution.

## Findings and remediation

### 10-A — ZIP32 overflow and ambiguous archive paths

**Classification:** must-fix before 1.0 — remediated.

The baseline wrote 65,536 supplied entries with an encoded end-record count of zero. It also accepted `..`, absolute/drive paths, alternate-stream names and dot-segment aliases. This was reproduced against the baseline writer.

The writer now validates count, UTF-8 name lengths, payload sizes, offsets and central-directory arithmetic before encoding their fields. It reserves the Zip64 sentinel values, rejects conflicting/case-alias/file-directory names, and preserves binary bytes. Text sizing precedes encoding; source entries are fetched lazily and a 512 MiB archive budget stops oversized in-memory exports. Unit fixtures cover exact boundaries through checked metadata arithmetic without allocating multi-gigabyte payloads.

Format reference: [PKWARE APPNOTE, sections 4.4.1, 4.4.17 and 4.4.21–24](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT).

### 10-B — Inventory metadata was not an actual read bound

**Classification:** must-fix before 1.0 — remediated.

A native baseline regression supplied the earlier inventory size of one byte for a file that had grown past 8 MiB. Discovery accepted the full content and charged only the stale size. That test failed before the fix and passes after it.

Semantic/probe reads now use a bounded reader with a one-byte overflow sentinel; probe and semantic budgets charge bytes actually consumed. Source previews retain their text/binary/too-large result and actual read bound. Binary IPC reads have a 256 MiB per-file cap, while native directory copying streams assets directly. Directory enumeration enforces the remaining entry budget while collecting entries, rather than after unbounded collection. Unresolvable directories and non-UTF-8 filenames fail explicitly rather than produce a lossy inventory.

### 10-C — Directory export could bypass source protection and damage existing targets

**Classification:** must-fix before 1.0 — remediated.

The source-folder redirection to Apply previously existed only in `ChangePanel`; the native export command would accept that same output grant and write without Apply's conflict/recovery boundary. Native export also wrote/truncated existing targets directly, including hard links, and had no native overwrite-choice input.

Native export now serializes with Apply/project lifecycle operations, refuses the source root and both ancestor/descendant output roots, validates the complete changed-file/path plan before mutation, and requires an explicit overwrite flag. Each output is written to a newly created sibling staging file, synchronized and then committed. On Windows, `MoveFileExW` uses replacement only when approved; an unapproved late collision fails atomically. Regression fixtures verify source-hard-link preservation, exact binary copies, preflight rejection, injected write failure and late collision preservation. The selected ZIP/support save target uses the same staged-write primitive.

API reference: [Microsoft MoveFileExW flags and replacement semantics](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw).

### 10-D — ZIP success preceded the native save result

**Classification:** must-fix before 1.0 — remediated.

The UI previously reported export success immediately after dispatching an anchor click while the native picker/write continued asynchronously. The ZIP path now awaits a dedicated bridge request through picker selection and native write completion. Cancellation and write errors propagate back to `ChangePanel`; invalid binary IPC responses are errors instead of empty files. The shipped bridge is executed against controlled native responses in the gate, including delayed completion, cancellation and write failure.

## Evidence

- Baseline local locked Windows suite: 18/18 PASS.
- Baseline ZIP-count/path reproduction and failing native stale-size probe test recorded during this audit.
- Focused JavaScript gate: PASS, including a 65,534-entry archive and binary/Unicode/CRC32 roundtrips.
- Focused Windows I/O fixtures: 8/8 PASS.
- Representative synthetic project: 10,002 inventory files, 5,001 semantic inputs; two scans returned identical inventories and retained malformed semantic input for diagnostics. The first focused local run measured 22.27 seconds for both scans; this is an observation, not a performance budget or a real-project acceptance claim.
- Strict application TypeScript: PASS.
- Final local locked Windows suite: 26/26 PASS (18 existing + 8 I/O fixtures).
- Local registered regression matrix: 75/83 passed. Eight checks could not complete because this execution environment rejects piped Node/Git child processes with `EPERM`; these are not counted as passes. The canonical embedded-bundle check has the same local limitation. The bundle was regenerated with the script's compiler arguments and sorted source list; canonical parity and the complete matrix require the normal Windows PR CI.
- Windows PR CI on implementation commit `b8bc67d4ff4ee1792cad01279707156680c5711a`: [Validate Tauri Windows #190](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/35525558733) PASS. This includes 83/83 registered regression suites, 250 packaged-bundle soak cycles, 26/26 locked native tests, strict application TypeScript, release/embedded-bundle parity, transitive third-party metadata/distribution/notices checks and zero unused source carry.
- [Dependency Approval](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/35525557672): PASS. Both dependency locks remain unchanged.

## Limits and follow-up ownership

- ZIP64, compressed ZIP output and archive extraction remain unsupported; over-limit ZIPs fail explicitly and direct users to folder output.
- Folder copies commit per file. Later failures report completed output count; they do not roll back or delete earlier output files. This differs from source Apply's transaction and is documented in `KNOWN_LIMITS.md`.
- A project edited concurrently by another process is not an atomic source snapshot. Streaming copy detects size changes, but same-size edits and hostile filesystem retargeting between checks are not newly claimed to be eliminated. Multi-process ownership and storage/power-loss guarantees remain the limits recorded in Track 09.
- Performance budgets, cancellation/responsiveness and peak memory profiling belong to Track 11. The archive byte cap is not an RSS ceiling.
- The 10,002-file fixture is synthetic. Real installed-client picker/UX smoke, representative user projects and interrupted-device scenarios remain part of Track 18.
- No dependency, license choice, signing key, updater channel, release identity, workflow runner or publication gate was changed.

## Exit decision

Track 10 is complete. ZIP overflow/path ambiguity, stale-size read bounds, unsafe output replacement and premature ZIP success are remediated with durable behavioral regression coverage. No unresolved blocker remains within this track's reviewed scope; the accepted limits and manual acceptance ownership above still apply.

**Next:** Track 11 — performance, scalability & resource behavior.
