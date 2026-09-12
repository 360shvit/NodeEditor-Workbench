# Hytale Generator Workbench — Current Architecture

**Applies to:** v0.11.35-r1.  
**Document type:** living documentation.

## Product layers

1. **Native Tauri host (`src-tauri`)** — owns desktop filesystem authority, pickers, project inventory/read boundary, watcher, transactional Apply/recovery, native export/save targets, WorldGen source authority and persistent log files.
2. **Desktop runtime bridge (`tauri-ui/tauri-runtime.js`)** — adapts the frontend's `/api/...` requests to Tauri commands. The packaged desktop app does not require a localhost HTTP server.
3. **Core (`src/core`)** — parser, shared project model, indexes, search/reference/refactor logic, ChangeSet, patcher, validation, graph/layout/geometry and output policy. Core has no React dependency.
4. **Application state (`src/store.ts`, `src/projects`)** — project/session state, tabs/panes, ChangeSet history, graph/layout/performance tab state and lifecycle guards.
5. **React UI (`src/components`, `src/features`)** — Explorer, Inspector, Search, Changes, Layout, Project Graph, WorldGen Performance, Settings and dialogs.
6. **Deterministic packaged frontend (`tauri-ui`)** — `tauri.conf.json` points `frontendDist` here. Therefore source checks alone are insufficient; release validation checks the committed bundle too.

## Project model and identity

Hytale JSON files are parsed into one project model. Unknown node kinds remain represented instead of being discarded. Symbols/references/indexes are derived from that model. JSON paths use structural keys (`JSON.stringify(path)`) for identity/deduplication, preserving the difference between dotted literal keys, nested keys, string indices and numeric array indices.

The filesystem remains authoritative. Persistence is intentionally UI/navigation-oriented rather than a hidden document database.

## Desktop authority boundary

Frontend code receives opaque native tokens/relative project information instead of unrestricted filesystem paths for privileged actions. The Rust host canonicalizes roots/targets and rejects unsafe file types or containment escapes. Project scanning has explicit count/size/nesting limits. Source preview and semantic probing have separate limits.

WorldGen file/folder tokens are transient and revocable. Changing source replaces the previous registration; closing the relevant lifecycle revokes authority.

## Apply transaction

The in-place Apply boundary follows this sequence:

1. validate transaction/file-count and JSON size/nesting constraints;
2. verify expected current source content to detect external conflicts;
3. validate final text as JSON;
4. create the recovery journal and prepared temp/backup paths;
5. commit the complete prepared transaction;
6. on error, rollback every prepared item;
7. retain journal/backups if rollback is incomplete;
8. after a successful commit, clean temp/backups and then clear recovery metadata only when cleanup is safe.

Project watcher suppression recognizes successful own writes for a short window so the application does not treat its own commit as an external modification.

## Reload concurrency

External-change reloads use a generation guard. A slower, older reload is not allowed to replace a newer reload result for the same active project.

## Persistence boundaries

Global Workbench preferences include UI Scale, sidebar/split dimensions, hotkeys and diagnostics preferences. ProjectSession snapshots include navigation/UI state and sanitized Graph/Layout/filter state. They exclude ChangeSet, Undo/Redo and previous source content.

Window size/position/maximized state is handled by the Tauri window-state plugin.

## Diagnostics architecture

Runtime events are bounded in memory and optionally flushed to local structured JSONL. Performance tracing aggregates recent samples and trace summaries. Persistent log entry/batch sizes and rotation are bounded natively. Absolute paths are scrubbed before persistence; support-report path inclusion remains opt-in.

## Distribution boundary

Current distribution uses the committed deterministic `tauri-ui` frontend, Rust/Tauri desktop host, NSIS as the supported Windows distribution route. `release-spec/release-contract.json` remains the canonical release identity/policy source; `release:sync` updates generated mirrors and regenerates `tauri-ui/app.js`, while `release:check` requires byte-for-byte bundle parity. v0.11.35 adds the Tauri v2 updater plugin under native Rust authority: the WebView can request only the Workbench's narrow native check/install commands. The signed package is downloaded and signature-verified first; native authority then rechecks staged project changes immediately before `install()`, closing the download-time race before restart. Installed NSIS builds use signed updater artifacts. Stable and Preview endpoints are separate GitHub rolling-manifest releases. Public network deployment remains fail-closed until the real repository slug, committed updater public key, checked JS/Rust locks and CI signing secrets are configured; non-installed/raw development builds remain updater-disabled.
