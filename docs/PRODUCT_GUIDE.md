# Hytale Generator Workbench — Current Product Guide

**Applies to:** v0.11.35 source line.
**Document type:** living documentation.

## 1. Opening and navigating a project

The desktop Workbench opens a local project directory through the native picker and builds a project inventory plus semantic Hytale Generator inputs. Recent-project entries can reopen previously authorized project roots; stale/revoked recent roots are rejected rather than silently substituted.

The Explorer represents the whole project inventory while semantic tools operate on the detected project JSON inputs. Opening a file creates a Workview tab. Back/Forward navigate recorded file/node locations. Quick Open and global command shortcuts provide alternate navigation.

ProjectSession persistence restores navigation/UI context such as open files, Explorer state, Search context, selected Layout files and Project Graph view settings. Staged edits, ChangeSet history, Undo/Redo and old file contents are deliberately not persisted.

## 2. Inspector, Search, references and Diagnostics

The Inspector uses the shared parsed project model rather than reparsing isolated UI fragments. Unknown Hytale node shapes remain inspectable. Search/field matches, semantic references and diagnostics use shared indexes. JSON-path identities are structural, so a literal key containing `.` does not collide with a nested path.

Diagnostics shown for a loaded Hytale project are **project diagnostics** and must not be confused with Workbench runtime errors/warnings from the support report.

## 3. Staged editing and Change review

Supported edits are staged into the ChangeSet first. Changes can be reviewed and undone/redone without immediately touching source files. Project switch, project close and application exit are guarded while staged changes exist, offering review or explicit discard.

`Review & Export` presents a read-only final diff. The safe default is a non-destructive export:

- **Export Changes ZIP** — writes only changed relative paths into a ZIP;
- **Export Project Copy** — writes a full modified copy into a selected folder, with collision confirmation when required;
- **Apply to Opened Project** — explicitly modifies the opened project and is never the implicit/default action.

## 4. Native Apply and recovery

For in-place Apply, the desktop boundary verifies the expected current source content before writing. The final payload is validated as JSON and subject to safety limits. The native commit prepares temp files and backups, writes a recovery journal, commits replacements and then cleans up.

If a commit fails, rollback is attempted for the entire prepared transaction. If rollback itself is incomplete, the recovery journal/backups are retained and the error tells the user to reopen the project so recovery can be retried. Successful own writes are temporarily suppressed from the external-change watcher to avoid self-invalidating the ChangeSet.

External disk changes trigger a project reload. If an externally changed file intersects pending work or history, affected staged state is cleared rather than silently applied against stale content.

## 5. Split Workview and tabs

The Workview can be split into primary and secondary panes. File/source/query/layout/graph/performance tabs keep global identities while pane references decide where a tab is shown. Split mode itself is transient; the current sidebar width and split ratio are global Workbench preferences.

Project Graph supports one canonical/shared graph plus independent graph instances. Each graph tab keeps its own root/settings/camera state. Pan, zoom and Fit are graph-camera operations and are independent from application UI Scale.

## 6. Layout

Layout operates on the shared project model and stages scalar layout changes through the same ChangeSet rather than writing files directly. Geometry is derived from the Hytale visual catalog/renderer rules rather than treating current author spacing as node geometry.

Layout strategies and their historical evolution are documented in versioned milestone files. For current use, treat Layout output as a proposal until it is staged/reviewed through the normal change workflow.

## 7. WorldGen Performance

Opening WorldGen Performance starts with no source selected. You can choose one local log file or a log folder.

**Single file:** that exact registered file is used.  
**Folder:** on every refresh the native host enumerates the selected folder and picks the lexicographically newest regular top-level `.log` filename; this is intended for timestamp-prefixed `YYYY-MM-DD_HH-MM-SS_*.log` names. Subfolders are not searched. Symlinks/junction-style sources are rejected and `.log.lck` is not a `.log`, so it is ignored.

The selected log is searched backwards in fixed 1 MiB chunks until the newest **complete** performance block is found or the file start is reached. There is no artificial total-byte/line scan cutoff and the complete log is not loaded into memory at once. An incomplete newest report is skipped in favor of the previous complete report.

Refresh happens immediately after selection, with `Refresh now`, and every 60 seconds while the view is mounted. There is no file watcher for WorldGen.

The compact view keeps Sample Count and the requested KPI set visible. Original HytaleGenerator values are displayed as reported; `Material (Sum)` is the intentionally derived summary from all `Materials Section ...` values. Exact stage/data-transfer/memory/context/cache/raw details are collapsed by default.

## 8. Settings and accessibility

Settings are application preferences and do not modify the Hytale project. Supported UI scales are **80%, 90%, 100%, 110%, 125%**. Keyboard shortcuts can be reassigned/unassigned. Focus trapping/return is implemented for modal surfaces, tabs use keyboard semantics, and reduced-motion preference suppresses non-essential transitions.

Workbench sidebar width is constrained to 220–520 px. Split ratio is constrained to 25–75%. These values are persisted; split-enabled state is transient.

## 9. Diagnostics and support reports

Runtime diagnostics record bounded in-memory events/metrics/traces and can persist structured Workbench JSONL logs locally. Persistent logs rotate at 2 MiB per file with four retained generations. Paths in persistent logs are scrubbed; support reports include project-relative paths only when explicitly enabled.

Support reports are not uploaded automatically. Recent Workbench logs and performance summaries are optional report sections. Project content itself is not embedded in the support report.


## 10. Updates and distribution

The About section exposes an update channel selector plus explicit **Check for updates** and **Install & restart** actions. Update checks and installation are implemented by native Rust commands; the WebView does not receive direct updater capability. Installation is refused while staged ChangeSet edits are pending.

Installed NSIS builds are the automatic-update target. Update artifacts must be signed and are verified against the committed public updater key. Stable and preview use separate rolling GitHub manifest endpoints. Raw/development builds are not supported distribution artifacts and do not self-update.

The current v0.11.35 source candidate intentionally reports updater deployment as unavailable until the real GitHub repository, public verification key, checked dependency locks and CI signing secrets are configured. In that state, checking for updates performs no network request.
