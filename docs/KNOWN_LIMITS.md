# Hytale Generator Workbench — Current Known Limits

**Applies to:** v0.11.35-r1.  
**Document type:** living documentation.

These are intentional current boundaries, not hidden guarantees.

## Project/native safety limits

The Rust desktop host currently enforces:

- maximum project inventory traversal: **100,000 files/directories**;
- maximum semantic JSON files: **50,000**;
- maximum individual semantic/Apply JSON size: **64 MiB**;
- maximum total semantic JSON bytes: **512 MiB**;
- maximum JSON nesting depth: **512**;
- maximum files in one Apply transaction: **10,000**;
- semantic discovery probes: **10,000 files**, **8 MiB per file**, **128 MiB total**;
- source-text preview: **4 MiB**;
- binary reads into the WebView: **256 MiB per file**; larger binary assets use native folder-copy output.

Crossing a safety boundary is an explicit error; the Workbench should not silently truncate a project into a misleading semantic model.

## WorldGen Performance

- polling interval: **60 seconds** while the view is mounted;
- no WorldGen file watcher;
- folder mode searches the **selected folder only**, not subfolders;
- folder mode selects one source: lexicographically newest regular top-level `.log` filename;
- single-file picker accepts `.log` and `.txt`; folder auto-selection only considers `.log`;
- reverse scanning uses **1 MiB chunks**; one malformed report candidate is capped at **8 MiB** while whole-file scanning remains unlimited;
- report candidates are additionally capped at **65,536 lines**; repeated markers on a malformed line do not trigger repeated full-line parsing;
- one native WorldGen scan runs at a time; changing/revoking the selection or exiting signals cooperative cancellation at read/seek boundaries. A replacement request can require retrying Refresh now while the previous worker finishes;
- there is **no artificial total-byte/line cutoff**, so a very large log with no performance report can require substantial disk I/O;
- the performance block is considered complete only when `Missed/Total Ratio:` has been reached;
- `Material (Sum)` is derived; other displayed report values are not recomputed/reconciled.

## UI/layout limits

- supported application UI Scale values: **80, 90, 100, 110, 125%**;
- Workbench sidebar width: **220–520 px**;
- split ratio: **25–75%**;
- split-enabled state itself is transient across restarts;
- Project Graph camera zoom is independent from application UI Scale.

## Persistence limits

ProjectSession persistence is convenience state, not project-content storage. Staged edits and Undo/Redo are lost after explicit discard/close/exit and are not restored on the next application start.

Recent-project/session data is sanitized on read and may fall back to defaults when old/corrupt values are invalid.

## Diagnostics limits

- in-memory runtime events: **500**;
- metric samples per metric: **96**;
- retained metric names: **256**, up to **120 characters** each; recently used names survive eviction, and the summary reports the eviction count;
- trace summaries: **20**;
- slow-operation list: **20**;
- persistent Workbench log: **2 MiB per file**, **4 retained files**;
- persistent batch: up to **100 entries / 1 MiB**, individual entry up to **16 KiB**.

Support reports do not include project contents. Project-relative path fields are opt-in in the report UI; persistent log paths are scrubbed.

## ZIP/output limits

The embedded frontend ZIP writer uses classic ZIP32/STORE records and does **not** implement Zip64. It rejects more than **65,534 entries**, filenames longer than **65,535 UTF-8 bytes**, and sizes/offsets requiring Zip64. A separate **512 MiB serialized-archive limit** includes headers and the central directory; this is not a guarantee that process memory stays below 512 MiB because the WebView/IPC may hold additional copies. Larger copies use native folder output. Absolute, traversal, Windows-device/stream and conflicting archive paths are rejected instead of silently rewritten.

Native project-copy output must be outside the source tree. Changed text is limited to **10,000 files**, **64 MiB per file** and **512 MiB total**; the complete output plan is limited to **100,000 files**. Overwriting requires the UI's explicit overwrite choice, which is carried to native authority. A destination appearing after preflight also fails if overwrite was not approved. Binary assets are copied without decoding and without the WebView binary-read limit.

Each folder-output or selected-save file is staged beside its destination and committed only after the write succeeds. Existing hard-linked files are replaced rather than truncated through their shared storage. A multi-file folder copy is **not an all-or-nothing transaction**: if a later file fails, earlier completed output files remain and the error reports their count. No automatic deletion of the user's existing output folder is attempted. A source modified externally during copying is not a supported consistent snapshot; detected size changes fail the current file. Filesystem/storage failure guarantees remain bounded by Windows and the underlying device.

ZIP success is reported after native save completion; cancelling the picker reports cancellation. ZIP import/extraction and the browser-only snapshot fallback are not exposed by the supported native desktop UI.

## Distribution / updater limits

v0.11.35 contains the native updater implementation and GitHub release pipeline, but the current source candidate is deliberately **not publicly deployable yet**. Publication remains blocked while the GitHub repository is not connected, `src-tauri/updater.pubkey` contains the `UNCONFIGURED` sentinel, `package-lock.json` or `src-tauri/Cargo.lock` is absent, or `updater.publication.publishable` is false. In that unconfigured state the native update check returns a local not-configured result without making a network request.

Installed NSIS builds are the automatic-update target once bootstrap is complete. Signed artifacts and updater manifests are required. A staged-change gate runs before download and native authority rechecks again after download/signature verification immediately before installation. Raw/development builds are not publication artifacts and set `HGW_DISTRIBUTION_KIND=development`, so native updater configuration is refused. Stable and Preview have separate rolling manifest endpoints, and prerelease publication is prevented from writing the Stable manifest; real endpoint behavior still cannot be claimed until repository/signing bootstrap and the Windows installed-update test are complete.
