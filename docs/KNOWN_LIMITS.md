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
- source-text preview: **4 MiB**.

Crossing a safety boundary is an explicit error; the Workbench should not silently truncate a project into a misleading semantic model.

## WorldGen Performance

- polling interval: **60 seconds** while the view is mounted;
- no WorldGen file watcher;
- folder mode searches the **selected folder only**, not subfolders;
- folder mode selects one source: lexicographically newest regular top-level `.log` filename;
- single-file picker accepts `.log` and `.txt`; folder auto-selection only considers `.log`;
- reverse scanning uses **1 MiB chunks**; one malformed report candidate is capped at **8 MiB** while whole-file scanning remains unlimited;
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
- trace summaries: **20**;
- slow-operation list: **20**;
- persistent Workbench log: **2 MiB per file**, **4 retained files**;
- persistent batch: up to **100 entries / 1 MiB**, individual entry up to **16 KiB**.

Support reports do not include project contents. Project-relative path fields are opt-in in the report UI; persistent log paths are scrubbed.

## ZIP/output limits

The internal browser-side ZIP writer uses classic ZIP32/STORE records and does **not** implement Zip64. Therefore archives at or beyond classic ZIP limits (for example more than 65,535 entries, individual stored sizes/offsets around 4 GiB, or equivalent central-directory overflow) are unsupported. The current project safety envelope is normally far below the entry-count ceiling, but very large binary project copies can still approach ZIP32 size/offset limits. Release/large-project workflows should be validated against representative project sizes.

## Distribution / updater limits

v0.11.35 contains the native updater implementation and GitHub release pipeline, but the current source candidate is deliberately **not publicly deployable yet**. Publication remains blocked while the GitHub repository is not connected, `src-tauri/updater.pubkey` contains the `UNCONFIGURED` sentinel, `package-lock.json` or `src-tauri/Cargo.lock` is absent, or `updater.publication.publishable` is false. In that unconfigured state the native update check returns a local not-configured result without making a network request.

Installed NSIS builds are the automatic-update target once bootstrap is complete. Signed artifacts and updater manifests are required. A staged-change gate runs before download and native authority rechecks again after download/signature verification immediately before installation. Raw/development builds are not publication artifacts and set `HGW_DISTRIBUTION_KIND=development`, so native updater configuration is refused. Stable and Preview have separate rolling manifest endpoints, and prerelease publication is prevented from writing the Stable manifest; real endpoint behavior still cannot be claimed until repository/signing bootstrap and the Windows installed-update test are complete.
