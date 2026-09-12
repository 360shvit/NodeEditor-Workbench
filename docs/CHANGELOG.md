# Changelog

## 0.11.35 — GitHub / Updater Integration (unreleased)

- Added native Rust-controlled signed Tauri v2 updater support with separate Stable/Preview manifests and explicit install/restart UX.
- Kept updater authority out of the WebView and recheck pending project changes immediately before installation.
- Added a fail-closed GitHub release workflow that publishes only the allowlisted `release/public/` surface.
- Pinned Node/Rust toolchains and committed reproducible npm/Cargo dependency locks.
- Removed the retired portable packaging path and the unused Vite/browser development path.
- Hardened deterministic frontend bundling and Windows test/build portability.
- Cleaned the public repository surface by removing internal engineering-history and one-time bootstrap documents while retaining executable regression coverage.
- Public updater publication remains disabled until repository signing/public-key configuration is complete.

# v0.11.34-r2 — Repository / Release Surface Restructure

- Separated developer/source material from the allowlisted end-user release surface.
- Moved developer-only Windows dependency/tool bootstrap helpers under `tools/windows/`.
- Added an allowlist-based `release/public/` staging boundary that rejects unexpected files and explicitly excludes source, tests, fixtures and developer tooling.
- Aligned installer/portable public asset names with `release-spec/release-contract.json` and generate fresh SHA-256 sidecars at the publication boundary.
- Kept updater runtime disabled; real GitHub publishing, signing and application-side updater integration remain v0.11.35.

# v0.11.34-r1 — Release Integrity Hardening

- Added deterministic TypeScript AMD emission for the actually shipped `tauri-ui/app.js` plus byte-for-byte `bundle:check`; `release:sync` now regenerates the embedded bundle and `release:check` rejects any source↔bundle drift.
- Replaced hand-maintained emitted release identity with generated `release/releaseIdentity` / `support/releaseIdentity.generated` modules in the packaged bundle.
- Defined SemVer as the only updater/public ordering identity; internal `rN` labels cannot represent a second public release under the same SemVer.
- Generalized release synchronization across arbitrary SemVer/revision changes and added isolated repeated-sync/version-ordering regression coverage.
- Bounded one malformed WorldGen report candidate to 8 MiB while preserving unlimited reverse scanning of the complete log.
- Revalidated ZIP/support save-target parent authority and file type immediately before the final native write.
- Added v0.11.34 release-integrity, validation and owner-test documentation; updater runtime remains deliberately disabled until v0.11.35.

# v0.11.33-r1 — Updater Preparation

- Closed v0.11.32 after owner approval and the corrected Windows Native Safety Matrix.
- Added `release-spec/release-contract.json` as canonical release identity/updater-policy source plus `release:sync` / `release:check` drift tooling.
- Generated frontend release identity from the canonical contract and removed hard-coded current version/profile values from source UI/diagnostics.
- Defined stable/preview channel policy, NSIS-vs-portable update strategy, canonical asset names, HTTPS/signature/private-key policy and pending-change/offline/failure/restart behavior.
- Added a Tauri-v2-compatible static update-manifest schema/example for future GitHub publication.
- Kept updater runtime intentionally disabled: no updater plugin, endpoint, public key, updater artifacts, check/download/install/restart behavior.
- Added milestone-specific validation and owner test documentation.

# v0.11.32-r1 — Documentation Pass

- Closed v0.11.31 after owner visual/Windows acceptance.
- Reconciled the living repository documentation with current shipped Workbench behavior without changing product semantics.
- Replaced stale generic `BUILD_PLAN.md`/`VALIDATION.md` guidance with current living documents.
- Added current Product Guide, Architecture, Known Limits and Documentation Index entry points.
- Explicitly separated versioned historical milestone records from current guidance instead of rewriting historical evidence.
- Added a documentation-to-code regression contract covering version/profile synchronization, key native/UI limits and WorldGen behavior claims.

# v0.11.31-r1 — UX Consistency Pass

- Closed v0.11.30 after owner Windows smoke and a diagnostic report with zero Workbench runtime errors/warnings/slow operations.
- Reworked WorldGen Performance from a large dashboard/card presentation into the compact Layout/Graph/Inspector visual language.
- Kept Sample Count prominent and retained the requested nine KPI summary values while moving exact material rows into a normal collapsed detail section.
- Normalized all WorldGen detail areas onto one collapsed disclosure pattern and removed duplicate material rows from the non-material Data Transfer detail table.
- Replaced viewport-based WorldGen responsive rules with pane-local container queries so split-view panes reflow correctly.
- Normalized disabled-button hover behavior, select/textarea font inheritance, disclosure keyboard focus and reduced-motion handling across the Workbench.
- No ProjectSession, graph/layout algorithm, parser, write/recovery, filesystem authority or WorldGen polling/source semantics changed.

# v0.11.30-r1 — Project Cleanup & Hygiene

- Closed v0.11.29 after the Windows owner smoke reported no Workbench runtime errors/warnings.
- Removed proven dead private helpers (`rectChanged`, `requiredLeftShift`, `activeTabForPane`) from source and the committed desktop bundle.
- Removed unused `symbolKey`/`useEffect` imports and an unused App-level `reopenClosedFile` store subscription.
- Fixed the broken `npm run test:runtime-stability` target so it resolves the existing v0.11.28 rolling runtime-soak script.
- Added a cleanup inventory and milestone-specific integrity regression without changing product behavior.
- Retained historical docs, versioned regression scripts, developer audit/generation utilities and ambient declarations when their removal could not be proven safe.

# v0.11.29-r1 — Acceptance Hardening

- Replaced dot-joined JSON-path identities with structural `JSON.stringify` keys across ChangeSet, parser, search/refactor/reference, inspector and store identity paths; literal dotted keys and numeric-vs-string path segments no longer collide.
- Hardened native Apply rollback to surface restore/cleanup failures and retain recovery metadata/backups when automatic rollback cannot complete.
- Hardened recovery metadata ordering: a new journal clears stale commit markers first, and successful cleanup removes the journal before its commit marker.
- Added native JSON parsing at the final destructive Apply boundary before transaction preparation.
- Added a watcher reload generation guard so an older asynchronous reload cannot replace a newer project snapshot.
- Sanitized persisted ProjectSession filters, visual settings, navigation entries and explorer folder state before restoration.
- Removed the WorldGen folder 2000-entry cutoff; newest `.log` selection now scans the complete top-level directory with O(1) candidate memory.
- Added explicit WorldGen log/folder token revocation and defensive clearing on project authority changes.
- Updated runtime diagnostics to the `acceptance-hardening-v1` profile and added milestone-specific regression coverage for the acceptance findings.
- Added a project-persistent roadmap to v1.0 and a standing deep-acceptance protocol.

# v0.11.28-r1 — Runtime Stability Validation

- Added a 250-cycle packaged-runtime soak for Split Workview, pane-local tab ownership, shared/independent Project Graph instances, WorldGen tab lifecycle and project-close reset invariants.
- Hardened WorldGen Performance polling against overlapping reads for the same selected log.
- Ignore stale WorldGen read results after a log selection changes.
- Replaced the former 1000-line/1-MiB tail cutoff with an unlimited backwards search performed in fixed 1-MiB chunks, so old reports remain discoverable without loading whole logs into memory.
- Added log-folder selection: each refresh automatically resolves the newest top-level `.log` file and ignores `.log.lck` files; no oldest/server/client rule UI is required.
- Fixed the v0.11.27 native WorldGen compile collision by separating the internal `read_worldgen_performance_log` helper from the public `read_worldgen_performance` Tauri command, and added a regression guard for that exact naming error.
- Kept the v0.11.27 feature surface intact; this milestone is stability/hardening rather than a new product feature.
- GitHub/CI reproducibility, Cargo.lock/toolchain pinning, signing and updater work remain deferred until public distribution is relevant.

# v0.11.27-r1 — WorldGen Performance Monitor

- Added a dedicated WorldGen Performance workbench tab that opens with no log selected.
- Added explicit native `.log`/`.txt` selection with a session-local opaque token; the frontend never receives an absolute path or broad filesystem capability.
- Added native reverse log scanning in fixed-size chunks; later v0.11.28 removes the original total scan/line cutoff while retaining bounded memory usage.
- Added newest-to-oldest parsing of the latest complete `[HytaleGenerator] Performance Report`, including direct server logs and client logs that wrap server output.
- Added structured display of the complete HytaleGenerator report block: summary values, Access Initialization, generation-stage timings, every Data Transfer child timing, Memory Usage grids, Context Dependency output sizes, Buffer Cache values and normalized raw-report detail.
- Added immediate/manual refresh and 60-second polling while the view is active; no file watcher is used by the performance monitor.
- Incomplete reports are ignored until their final cache-ratio line arrives, so a half-written report does not replace the last complete result.
- ProjectSession, project-file watcher, Apply/export authority and existing Workbench log retention semantics remain unchanged.

# v0.11.26-r1 — Accessibility & Interaction Consistency

- Added semantic tablist/tab/tabpanel ownership and keyboard tab navigation.
- Added keyboard-operable tab context menus.
- Normalized modal focus trapping/restoration, Escape handling and dialog labelling across Settings, Rename, Review, Quick Open, Explorer selection and lifecycle guard surfaces.
- Kept ProjectSession, native filesystem authority, graph ownership and scaling contracts unchanged.

# v0.11.25-r1 — Workbench UX Consistency

- Explorer Open Editors now shows only file/source tabs referenced by the active pane.
- Shared global editors are marked with the other pane while remaining one global tab/document object.
- Explorer Open Editors select/close actions explicitly target the active pane.
- Project Graph rail state now remains active for explicit non-canonical graph instances.
- Empty pane copy now explains pane activation and shared global editor semantics.
- No ProjectSession, filesystem/write, Author Rebuild, UI Scale, Graph state, or native security contract changes.

## v0.11.23-r1 — Settings & Appearance

- Replaces the long mixed Settings scroll surface with Appearance, Workbench, Keyboard, Diagnostics and About categories.
- Adds global UI Scale preference at 80/90/100/110/125%, stored outside ProjectSession.
- Adds Ctrl/Cmd + Plus, Minus and 0 UI-scale controls.
- Uses Tauri WebView zoom on desktop through the single `core:webview:allow-set-webview-zoom` capability; native filesystem authority remains unchanged.
- Improves Settings readability, target sizing and responsive navigation.
- Keeps 150–200% scaling deferred to the v0.11.24 reflow-hardening milestone.

## v0.11.22-r1 — Author Rebuild Reliability

- Hardened Author Normalize group membership: full-bounds first, deterministic center fallback for near-edge nodes, and fail-closed ambiguity for non-nested sibling groups.
- Added a deterministic group-anchor rescue so proposal-induced group expansion can be corrected before it becomes a false whole-file block.
- Re-audits node and routed-edge safety after group rescue; unresolved group conflicts remain hard blocks.
- Added structured layout block reasons and user-facing "Why this file is blocked" diagnostics.
- Added focused regressions for safe rescue, center fallback, ambiguous group membership and incomplete group metadata.
- Kept Pane/Graph ownership, ProjectSession schema, native filesystem/write authority, installer and minimal capability boundary unchanged.

## v0.11.20-r1 — Windows Installer
- Added a first-class Tauri NSIS setup executable as the primary Windows distribution artifact.
- Added a pinned installer-tooling bootstrap and a dedicated installer build script.
- Uses current-user installation by default, English/German installer resources and WebView2 bootstrap download only when needed.
- Keeps the runtime, ProjectSession, filesystem authority and write-safety behavior unchanged.

## v0.11.19-r1 — RC Hardening / Lock Capture Candidate

- Entered absolute feature freeze; no new product feature added.
- Removed implicit Cargo.lock generation from ordinary Windows build and safety paths.
- Added one explicit `tools/windows/Freeze-Windows-Dependencies.cmd` workflow that creates/verifies the lock, runs `cargo check --locked`, and captures dependency evidence.
- Hardened GitHub Windows CI to require a checked Cargo.lock, run native tests with `--locked`, then build with `--locked`.
- Froze RC1 distribution as an explicitly supported Windows portable ZIP; `bundle.active=false` is intentional for RC1.
- Added portable package assembly with EXE/ZIP SHA-256 evidence, build id, third-party notices and Cargo.lock release evidence.
- Normalized explicit Node/Search disclosure controls onto the existing local Lucide right/down chevron language without changing collapse state semantics.
- Kept Store, ProjectSession, Graph, command registry, layout preferences, native filesystem/write logic, capabilities and persistent logging semantics frozen.
- r1 remains a lock-capture candidate until the exact verified Windows-generated `src-tauri/Cargo.lock` is returned and checked into the distributed source.

## v0.11.18-r1 — Persistent Structured Logging

- Kept the existing capped in-memory runtime diagnostics as the live-analysis/support-report sink.
- Added a native Tauri JSONL file sink behind the same structured runtime-event path.
- Added 200 ms / 50-event frontend batching so logging does not perform a native disk write for each runtime event.
- Added Rust-owned rotation: 2 MiB/file, four files total, fixed app-log directory, fixed filenames, and unsafe symlink/non-file target rejection.
- Persist warnings/errors and release-relevant lifecycle/write events by default; Detailed logging widens persistence to the full structured event stream.
- Persistent logs always redact absolute and project-relative paths and never include project contents or automatic upload.
- Added bounded failure handling, sink status in Support Reports, a Settings `Clear logs` action, and normal-exit queue flushing.

## 0.11.17 — Workbench UX Polish

- Added per-node Collapse/Expand without adding ProjectSession persistence.
- Focused-node navigation automatically expands its target card.
- Added user-defined global Workbench shortcuts on top of the existing command registry.
- Added conflict rejection, Unassign, per-command Reset and Reset all.
- Quick Open command mode now shows the effective shortcut.
- Reopened the pre-RC roadmap only for v0.11.17 UX polish and v0.11.18 persistent structured logging; v0.11.19 is the new absolute hardening freeze.

## 0.11.16 — RC Architecture Validation

- Froze feature development after the Windows-validated v0.11.15-r2 Split Workview build.
- Added the complete RC architecture validation matrix, canonical Windows validation run, and frozen v0.11.17 findings ledger.
- Added Diagnostic Report schema 7 `releaseValidation` metadata for the `rc1-canonical-v1` validation profile without claiming that a run has passed.
- Added an aggregate source regression runner plus a v0.11.16 architecture-contract gate.
- Classified Project Graph pane-local/multi-graph design, many-node collapse, configurable hotkeys and persistent logs as post-release/supportability decisions rather than unrelated RC feature work.
- Identified native dependency-lock reproducibility and the Windows distribution/install contract as the primary release-hardening findings before RC1.

## 0.11.15 — Split Workview

- Added one optional two-pane Workview while retaining the existing global tab collection.
- Added explicit primary/secondary pane active-tab ownership and active-pane routing for file/source/search/reference/tool/navigation opens.
- Added a 25%–75% accessible Workview splitter with globally persisted ratio and commit-only writes.
- Migrated global Workbench layout preferences from v1 to v2 while preserving the v0.11.14 committed sidebar width.
- Kept split mode transient so app/project restore remains single-view by default; collapsing a split promotes the active pane without deleting tabs.
- Scoped Workbench drawer hosts and Node DOM ids per pane to avoid cross-pane portal/focus collisions.
- Changed the Settings layout action label to `Reset` and made it restore both sidebar and split-ratio defaults.
- Bumped Diagnostic Report schema to 6 with split layout metadata; ProjectSession remains schema 1.
- Added hotkey-system/user-defined-shortcut and persistent structured-log decisions to the frozen v0.11.16 pre-RC validation findings.

## 0.11.14 — Workbench Layout Foundation

- Added one reusable accessible Workbench splitter primitive with pointer capture and keyboard resizing.
- Made the existing left Workbench Sidebar resizable between 220 and 520 px while preserving the 292 px default.
- Added versioned global sidebar-width persistence with commit-only writes, corruption fallback and Settings reset.
- Added Diagnostic Report schema 5 Workbench layout metadata and restore/persist/reset runtime events.
- Preserved ProjectSession/sidebar ownership, Filter/ALL, Graph, native Window State and filesystem/write-security contracts.
- Tracked long many-node tabs / per-node Collapse/Expand as a separate pre-RC finding.

## 0.11.13 — Unified Filter / ALL

- Added an always-visible global `ALL` filter with the shared meaning “no restriction in the normal user-facing filter dimensions”.
- Added consistent `All semantic`, `All locations`, existing `All workspaces`, and new `All values` dimension controls.
- Added additive `allValues` filter state so generic Property fields can be unrestricted without materializing every field name into persisted selection state.
- Preserved the existing hidden-empty policy, Search/Query filter ownership, Explorer Workspace separation, semantic model and filesystem/write contracts.
- Selecting a specific Property field from All Values deterministically returns to explicit value-field selection.
- Added v0.11.13 source/regression and Windows validation contracts; tracked Project Graph Back/Forward integration as a separate pre-RC finding.

## 0.11.12 — Graph Vector Viewport

- Froze the roadmap from v0.11.12 through v1.0.0-rc.1 with explicit feature-freeze and hardening gates.
- Replaced the CSS-scaled HTML Project Graph world with one SVG camera containing edges, node cards and labels.
- Preserved graph topology, layout coordinates, root/resource/depth controls, node navigation, pointer-anchored zoom, pan, Fit Graph, Reset 100% and persisted viewport state.
- Added keyboard activation for SVG graph nodes and vector precision/non-scaling stroke styling for sharp zoom.
- Corrected graph camera telemetry so pan/zoom measure update-to-commit latency while total gesture duration is reported separately.
- Kept ProjectSession, Workbench sidebar ownership, native window persistence, semantic/reference layers and filesystem/security boundaries unchanged.

## 0.11.9 — Explorer Descriptor Index & Initial Build Optimization

- Added a stable ProjectModel-scoped Explorer descriptor index reused across normal and selection-mode Explorer mounts.
- Added cache hit/miss/rebuild diagnostics and phase-level rebuild tracing.
- Replaced per-resource semantic-reference rescans during descriptor construction with one bulk Environment/Prefab reference-count index.
- Preserved exact Environment and exact-or-descendant Prefab reference semantics with per-reference interval merging.
- Kept Layout selection state, graph behavior, proposal/staging safety and native filesystem authority unchanged.

## 0.11.8 — Layout Tool Sidebar & Interaction Diagnostics

- Moves Layout scope, strategy, spacing/branch controls, advanced options and Generate proposal into a dedicated contextual Layout sidebar.
- Keeps Geometry Coverage, proposal safety/results and Stage/Replace actions in the main Layout tab.
- Retains the transactional Explorer-backed Layout file picker and existing proposal STALE/BLOCKED/change-set authority.
- Adds aggregate Project Graph camera pan/zoom/fit/reset/restore metrics and privacy-safe root index/kind context to graph build/layout traces.
- Adds Explorer descriptor, tree-build, selection-index and render-commit instrumentation before any virtualization/caching optimization.
- Preserves graph/layout algorithms, native filesystem authority and v0.11.7 camera behavior.

## 0.11.7 — Project Graph Camera Viewport

- Moves Project Graph flow settings, summary counters and notes into a dedicated contextual tool sidebar.
- Turns the main Project Graph tab into one fixed editor-style viewport; only the graph world is translated/scaled.
- Adds empty-space drag pan, pointer-anchored mouse-wheel zoom (15%–250%), Fit Graph and Reset 100% without recomputing graph layout.
- Keeps the Legend fixed bottom-left and file/reference click hint fixed bottom-right as non-scaling overlays.
- Persists sanitized camera state per project while keeping the tool-specific sidebar selection transient across restart.
- Preserves graph topology, node/edge coordinates and existing node navigation semantics.
- Documents a future Layout-tab split into persistent tool inputs in the sidebar and proposal/review output in the main tab; no Layout UI behavior changes in this release.

## 0.11.6 — Desktop Shell & Explorer Selection UX

- Removes the outer application scrollbar so header/footer/global rail controls remain visible while tab content scrolls independently.
- Keeps Explorer/Search sidebars internally scrollable inside the desktop shell.
- Replaces the Layout flat file list with a transactional Project Explorer selection mode with file/folder checkboxes and scope bulk actions.
- Keeps normal Explorer focus/scope state separate from the Layout picker draft selection.
- Makes Project Graph summary cards content-sized instead of stretched while deliberately leaving the graph canvas/layout unchanged.

## 0.11.5 — Performance Optimization III

- Enables the selective regular-file native inventory fast path for non-reparse files reached from canonicalized/root-contained directories.
- Retains canonicalize + containment fallback for reparse-backed regular files and canonicalized directory descent.
- Extends native tracing with `fastPathUsed` while keeping compatibility counters.
- Strengthens the Windows NTFS fixture to require both normal-file fast-path use and external-junction rejection.
- Retains the v0.11.4 Author Normalize acceleration and safety fallbacks unchanged.

## 0.11.4 — Performance Optimization II

- Added exact incremental Author Normalize safety-state updates for moved node/edge neighborhoods.
- Reuses stationary Tree routing geometry and spacing indexes across X-shift candidate searches.
- Fresh real-corpus source comparisons retain identical proposal hashes, patch counts and blocked state while improving representative cases by roughly 2–4.5x.
- Keeps per-file canonicalization enabled and adds native shadow counters for reparse entries, path changes, containment rejects and fast-path candidates.
- Added a Windows-only external NTFS junction containment test exposed through `Test-Windows-Safety.cmd`.

## 0.11.3 — Performance Optimization I

- Reused `DirEntry` metadata and removed redundant directory canonicalization in native inventory traversal.
- Added exact layout broad-phase filtering, duplicate-audit removal and routed-edge cache reuse.
- Preserved file canonicalization and layout safety boundaries.

## 0.10.6 — File State Model

- Added one derived runtime file-state model shared by Explorer, Open Editors and file/source tabs.
- Staged changes, diagnostic severity/count, external reloads and watcher-invalidated staged-change conflicts now use consistent markers.
- External conflict paths are captured before staged changes are cleared, so the UI can distinguish a conflict from an ordinary reload.
- File state remains session-only and is not persisted.
- No semantic detector, reference extractor or resource-loading behavior changed.

## 0.10.5 — Resource References

- Added versioned `biome-environment-v1` and `assignment-prefab-v1` semantic reference extractors.
- Resource resolution uses whole-project inventory metadata; resource contents remain inventory-only.
- Resource dependency problems are warnings, separate from generator-flow errors.
- Added optional Project Graph Environment overlay.
- Validated against the supplied Server asset snapshot: 71/71 Environment occurrences and 186/186 WeightedPrefabPath occurrences resolve.

## 0.10.4 — Load Profiles & Raw Source

- Added per-project semantic discovery profile management (add, re-scan, remove, reset).
- Added bounded read-only SOURCE tabs for inventory-only and semantic files.
- Added file-level Diagnostic → Source navigation.
- Source tab session persistence stores paths only, never file contents.
- Discovery root removal/reset is locked while staged changes exist.

## 0.10.3 — Semantic Reference Layer

- Added versioned `SemanticReferenceExtractorRegistry`.
- Added typed `ProjectModel.semanticReferences` with `resolved`, `unresolved` and `ambiguous` states.
- Added extractors for Instance → WorldStructure, WorldStructure → Biome, WorldStructure → Density, Biome → Density, generic symbol imports and `BlockMask.Import`.
- Project Graph now consumes semantic references instead of reimplementing flow parsing.
- Diagnostics now reports unresolved and ambiguous semantic references not already represented by the SymbolIndex.
- Legacy Density roots can resolve via workspace semantics even when old NodeEditor metadata leaves the generic symbol type as `Unknown`.
- Prefab/Environment resources remain deliberately outside the semantic graph in this milestone.

# Changelog

## 0.10.2 — Graph & Workspace Usability

- Project Graph now supports HytaleGenerator Instance entrypoints and explicit Instance -> WorldStructure flow.
- WorldStructure -> Biome matching uses explicit semantic fields; WorldStructure.Density is visualized.
- Added Recognized files / Inventory only Explorer scopes.
- Explorer folders default collapsed while preserving project session expansion state.
- Removed the unused Rust semantic-detector warning.

## 0.10.1 — Semantic Discovery

- replaces temporary path-only graph/support classification with versioned semantic detectors
- recognizes legacy and modern Hytale Generator NodeEditor workspace signatures
- classifies WorldStructures as flow orchestrators, HytaleGenerator instance.bson as flow entrypoints, and Settings as runtime config
- keeps all project files in inventory while limiting semantic loading to known candidates/detector matches
- adds native bounded per-folder Probe/Re-scan for inventory-only areas; only known detector matches are adopted
- persists custom discovery roots per project in native app-data so reload/FileWatcher discovery stays consistent
- preserves v0.9.5 security boundaries and v0.10.0 Command/Search/Tab workflows
- documents asset-derived reference findings and the next Reference Extractor / Load Profile direction

## v0.9.4-r2 — Embedded React compatibility hotfix

- Fixed packaged Tauri runtime crash caused by missing `useCallback` in the PreactLite-backed React compatibility layer.
- Added `useContext` support as well, including provider subscription.
- Added a regression test that compares all runtime React hook imports against the embedded compatibility API.

## 0.10.0 — Navigation & Project Awareness

- centralizes Workbench commands/hotkeys and adds Ctrl/Cmd+P Quick Open
- Search sidebar keeps its query, shows live Top 3 direct matches, records Recent searches, and reserves Enter for a full Search tab
- adds tab context actions without changing the existing tab model
- keeps Changes as the quick staged-change surface and moves the full read-only per-file diff to final Apply/Export review
- inventories the whole project for Explorer/export while semantically loading only candidate JSON
- treats Biome, Settings and WorldStructures as graph-flow support and keeps unknown JSON/non-JSON inventory-only
- adds an architectural seam and documented native plan for future per-project user loading rules and bounded raw-text handling
- preserves the v0.9.5 security, FileWatcher, lifecycle, Project/session, Layout and Project Graph boundaries


## 0.9.4 — Polish & Cleanup

- Removes confirmed dead UI components and orphan CSS from the pre-Activity-Bar shell.
- Removes the obsolete node-layout adapter after reconciliation with the active core Layout proposal pipeline.
- Removes retired portable-loopback token/header compatibility and its obsolete test.
- Adds fail-on-unreachable runtime source audit.
- Adds Escape + safe initial focus for lifecycle/settings dialogs and updates stale empty-state wording.
- Keeps ProjectModel/core behavior and session/change persistence boundaries unchanged.

## 0.9.3 — Project Lifecycle Safety

- guards project switching when the current session has staged changes
- adds Cancel / Review Changes / explicit Discard flows before destructive project transitions
- adds Close Project and returns cleanly to the Project Start Screen
- routes native Windows close requests through the same frontend safety boundary
- stops the native watcher and clears native runtime registrations when a project closes
- preserves staged changes when a guarded project picker is cancelled or a replacement scan fails
- adds an automated carry/dead-code reachability audit without mixing cleanup into the safety release
- records confirmed legacy UI/CSS carry for the planned v0.9.4 cleanup pass

## 0.9.0

- added persistent desktop Projects based on the opened canonical folder
- added Recent Projects with pin/reopen/remove
- restores file editors, Workspace/filter/Explorer state and navigation context
- added Back/Forward navigation and Open Editors + reopen-closed shortcut
- project session persistence explicitly excludes ChangeSet, Undo/Redo, Editing=On, old file content and applied-change snapshots
- recent projects are always rescanned from the current filesystem
- integrated the supplied new application icon and regenerated Tauri/Windows variants
- preserved Direct Apply external-change preflight and post-Apply change-history clearing

## 0.8.4
- r1 packaging polish: replaced the placeholder Tauri/Windows icon with the supplied Workbench crafting-table artwork and generated standard multi-resolution icon assets
- desktop terminology cleanup: Tauri shows Open Project only; browser fallback is Open Snapshot instead of Upload
- Review & Export replaces the older generic Review / Output wording
- safe output-first UX with three explicit actions: Export Changes ZIP, Export Project Copy, Apply to Project
- Export Changes ZIP is now the default whenever a project is opened and contains changed files only
- direct Apply remains conflict-protected and is no longer the default simply because the project is writable
- added persistent in-app Developer mode with runtime details; it does not start Node, Vite, hot reload, localhost or a TCP port
- updated Tauri desktop packaging/version markers to v0.8.4
- no intended layout-core behavior change

## 0.8.2 — Portable Desktop Bridge
- Adds an optional Windows portable distribution that runs the prebuilt Workbench UI without Node.js, npm or a Vite development server.
- Adds a small loopback-only PowerShell desktop bridge and native WinForms folder picker so projects below Windows AppData can be selected without Chromium File System Access sensitive-directory restrictions.
- Keeps browser/Vite development mode intact; the desktop bridge is additive and detected at runtime.
- Routes project scan/reload/read, direct conflict checks/writes and Other Folder output through the native bridge when the portable launcher is active.
- Protects the localhost filesystem API with a random per-launch token, root-relative path validation and source/output overlap guards.
- Keeps ZIP output available and keeps the normal staged-change / Review & Output safety flow.
- Ships the portable UI precompiled with the release; no runtime package download is required.
- Leaves `src/core` unchanged from v0.8.1 and preserves the frozen Normalize / Author Normalize / DAG golden proposal hashes.
- This release is intentionally a Windows packaging prototype rather than a signed executable; native startup and filesystem behavior still require an end-user Windows smoke test.

## 0.8.1 — Project Graph Prototype
- Adds a read-only Project Graph view rooted at detected WorldStructure assets.
- Resolves WorldStructure -> Biome conservatively through exact file-stem/top-level `Name` matches found in the WorldStructure JSON.
- Adds virtual Biome Density nodes and follows actual `Imported.Density.Name` -> `ExportAs` symbol relationships recursively, merging shared Density dependencies and keeping unresolved symbols visible.
- Adds a selectable Density recursion depth and integrates graph-node clicks with existing File and References navigation.
- Workspace discovery now prefers `$NodeEditorMetadata.$WorkspaceID`, normalizes native labels such as `HytaleGenerator - Biome`, and supports semantic workspace folders outside `HytaleGenerator`.
- Full-mod/folder loading recognizes `_Workspace.json` as the native workspace configuration marker; `WorkspaceName` becomes a hint while `_Workspace.json` itself stays out of the semantic generator-file model.
- As a final full-mod fallback, recognizable NodeEditor JSON assets may inherit the direct parent directory as a workspace, avoiding a hard dependency on the `HytaleGenerator` folder name.
- Keeps the complete layout golden baseline unchanged; no Author Normalize / Normalize / DAG placement rules are modified.

## 0.8.0 — Workbench UX
- UI-only product cleanup; no layout-core or placement-rule changes.
- Reduced the permanent top bar to project/open actions, search, editing state and compact diagnostic status.
- Moved Layout, Diagnostics and Changes into a dedicated Views section in the Project Explorer.
- Made normal node filters contextual to File/Query tabs and reduced adaptive quick values to three slots.
- Simplified Explorer file rows: diagnostics stay visible; import/export/relevance counts remain available as hover metadata.
- Rebuilt the Layout screen around Scope -> Layout -> Proposal with strategy cards and progressive disclosure.
- Kept spacing presets and DAG branch direction visible while moving numeric gaps, Connection Plane Tolerance, floaters and engine details under Advanced.
- Collapsed per-file scope and geometry coverage by default.
- Added aggregate proposal safety counters before per-file details; solver diagnostics remain collapsed.
- Simplified the bottom Changes bar and moved Active Rename Rules there from the top bar.
- Verified all v0.7.2 golden layout hashes remain identical for Normalize, Author Normalize Compact/Normal/Spacious and DAG Auto/Down/Up/Type.

## 0.7.3 — Layout Core Cleanup
- No intentional layout behavior changes; v0.7.2 proposals are the golden baseline.
- Added a shared layout strategy registry/proposal envelope for Normalize, Author Normalize and DAG Rebuild.
- Centralized DAG node/routing safety audits and the top-level block decision.
- Split connection-plane, visual-row and Author-Grid tolerance concepts into named helpers while preserving the exact formulas.
- Added internal placement reason codes for future explainability diagnostics.
- Centralized metric defaults and added a small stable quality summary surface.
- Added a reusable v0.7.2 golden-layout comparator. Compact Normalize/Author/DAG Auto/Down/Up/Type and Author Normal/Spacious match the prior canonical proposal hashes exactly on the dense real fixtures.

## 0.7.2 — Type-aware DAG Branching

- Added `Type` as a fourth DAG Branch direction option.
- Main child still stays exactly on Parent Y.
- Side branches with semantic `Density.Connection` are packed above the main lane.
- Material and every other side-branch domain are packed below the main lane.
- Each side subtree stays a rigid block on its selected side.
- Auto / Up / Down behavior and Author Normalize remain unchanged.

## 0.7.1 Chain-first / One-sided DAG

- DAG Rebuild now keeps one semantic/chain-preferred child on the exact parent Y lane.
- All additional children of a fork are packed on only one side of that lane.
- New DAG Branch direction setting: Auto, Down, Up. Auto chooses the smaller local subtree contour and deterministically breaks ties downward.
- Main-child selection prefers Flow over typed attachments, then the longest straight 1->1 continuation.
- Y placement uses a deterministic primary-parent forest while X depth still follows the complete DAG, avoiding duplicate placement of shared children.
- Normalize and Author Normalize behavior is unchanged.

## 0.7.0 Layout Strategies / DAG Rebuild

- Rename the v0.6.2 layout engine to **Author Normalize** without changing its packing/routing behavior.
- Redefine **Normalize** as a strict origin-only operation: root -> `(0,0)` and every existing positioned node, floater, group and comment receives the same rigid translation. Spacing, routing and author-grid settings are not consulted.
- Activate **DAG Rebuild** as a full Reader-v2-driven live-graph rebuild that ignores authored live-node X/Y as layout constraints.
- DAG depth determines X columns. All direct children of one parent share the same depth column; single-child chains advance one column and keep a straight visible row.
- Sibling subtrees are packed deterministically from semantic role / source order. Node geometry controls block height, so the rebuilt DAG is overlap-free by construction.
- Add a routing-safety loop for DAG Rebuild. Exact Flow and typed Attachment wire->foreign-node intersections expand the effective vertical sibling gap and block staging if they still remain after bounded retries.
- Existing author groups are rebuilt tightly around their original members in DAG mode; group overlaps are advisory because full DAG ignores author section geometry as a topology constraint.
- Strategy-specific UI now hides irrelevant controls and proposal metrics: Normalize shows the rigid offset, Author Normalize exposes the existing diagnostics, DAG Rebuild exposes depth columns, effective Y gap and routing passes.
- Keep **Author Normalize** as the default strategy so an upgrade does not silently change the established v0.6.2 workflow.
- Core regressions cover origin-only translation, unchanged Author Normalize behavior, and full DAG sibling-column placement/root/routing invariants.

## 0.6.2 Pixel Alignment Polish

- Freeze the v0.6.1 Normalize packing/routing baseline; no new structural layout strategy is introduced.
- Add a final Reader-v2-aware pixel polish for clearly horizontal typed attachment chains (for example Delimiter -> Constant -> Material).
- Add exact X-column polish for clearly vertical ordered leaf/value collections such as Manual.Curve Points and MultiMix Keys.
- Pixel moves use the current median row/column, remain bounded, and are rejected if they introduce node overlap, new edge/node conflicts, or unrelated crossings.
- Advanced diagnostics expose pixel rows/columns, before/after mismatches, accepted/blocked re-alignments, and maximum X/Y pixel shifts.
- Core regressions cover exact typed attachment rows and exact ordered CurvePoint columns.

## 0.6.1 Normalize Baseline / UX Cleanup

- Freezes the v0.6.0 Normalize engine for this release; no packing/routing heuristic is intentionally changed.
- Redefines the three user presets as Compact 10/10/100, Normal 50/50/100 and Spacious 100/100/100 (horizontal gap / vertical gap / connection-plane tolerance).
- Picking a preset now applies all three values; editing any one of the three values switches the preset to Custom.
- Reworks the Layout settings copy around user intent instead of Reader/Solver implementation details.
- Moves live/floating controls and the engine pipeline into a collapsed Advanced options section.
- Collapses geometry catalog coverage by default while keeping fallback counts visible in the card header.
- Reduces each Normalize proposal to outcome/safety metrics first: normalized nodes, X/Y changes and span, node overlap, Flow wire/node hits, unrelated crossings, Attachment routing audit, group overlap and floaters.
- Moves Reader v2, contour, routing, lane, Author Grid and cluster metrics into per-file Advanced diagnostics. Reader-v2 comparison notes are diagnostic-only instead of inflating the normal warning count.
- Proposal banners capture the actual preset/X/Y/plane values used to generate that proposal, making stale settings easier to understand before Replace staged layout.

## 0.6.0 Author Grid / Visual Groups

- Adds a final Author Grid layer above Reader v2 semantics: local same-domain Flow modules are split at long author trunk/bridge edges instead of treating the entire connected graph as one visual unit.
- Recovers exact connected Chain Rows from small authored node-top Y deltas (yellow-guide behavior).
- Recovers cross-module Author Row Guides between otherwise unconnected modules that share an authored Y line (pink-guide behavior).
- Recovers cross-module Author Column Guides from repeated authored module-anchor X positions (red-guide behavior).
- Cross-module guide moves translate the visual module with typed attachment satellites as a rigid unit; local Chain Row correction moves only the visible row node, not its downstream Flow subtree.
- Every Author Grid correction is bounded and safety-gated: no new node overlap, exact Flow/typed wire-node intersection, or unrelated connection crossing may be introduced or substituted for an existing conflict.
- Proposal metrics expose visual modules, Chain Rows, author row/column guides, exact/misaligned guide counts, accepted/blocked grid corrections, and maximum grid shifts/deviations.
- Keeps v0.5.9 two-axis spacing presets and Custom H/V staging regression coverage.

## 0.5.9 Spacing + Visual Row Normalize

- Spacing preset values now change both axes: Compact H10/V70, Normal H30/V100, Spacious H70/V140; Custom continues to pass the exact entered H/V values into the proposal.
- Added real-graph regressions that prove H and V changes survive proposal generation, replacement staging and rebuilt `$NodeEditorMetadata`, preventing a silent settings-to-output disconnect.
- Added a visual-row classifier for small authored node-top Y jitter (derived from alignment tolerance, capped at 24 px). Safe rows normalize to one exact stored Y value while larger port-driven offsets stay author-owned.
- Visual-row alignment is applied during forward placement and rechecked after contour/routing repairs; final relaxation is accepted only if node and wire safety remain non-worse.
- Proposal metrics now expose visual row candidates, original author jitter, remaining row mismatches and visual-row re-alignments.

## 0.5.8 Flow Lane Normalize

- Promotes author-inline same-domain Flow chains into explicit lane constraints instead of relying only on local snap heuristics.
- Single-child lanes target exact physical connector-plane alignment; the selected continuation of a multi-input fork preserves its authored small connector-plane offset.
- Adds a final safety-gated lane relaxation after contour, attachment and Edge Corridor repairs. The entire child subtree moves rigidly in Y, never the node alone.
- Rejects a lane relaxation if it creates node overlap, increases exact typed wire/node intersections, or adds unrelated wire crossings.
- Adds proposal diagnostics for lane count/edges, max+median connector-plane deviation before/after, accepted lane realignments, blocked realignments and maximum lane Y shift.
- Dense Cold regression: 75 lanes / 158 lane edges, 8 safe realignments, 0 node overlaps and 0 Flow wire/node intersections remain after Normalize.

## 0.5.7 Edge Corridor Audit & Repair

- Adds a routing-aware safety layer on top of Reader v2 and semantic Flow/Attachment packing. Node-only overlap freedom is no longer considered sufficient for a clean Normalize proposal.
- Reconstructs positioned connection geometry from the real left/right Hytale port centers and a monotone horizontal-tangent Bezier safety model; the shipped XAML exposes the pins but not the renderer implementation, so the curve is intentionally a conservative audit model rather than a claimed pixel-perfect clone.
- Exact same-domain Flow wire -> foreign-node intersections are hard failures. Normalize repairs them by moving the smallest viable divergent Flow branch/band in X; staging remains blocked if an exact Flow wire/node hit survives.
- The former ~942 px Cold-Dense deep-X separation is allowed again when routing geometry proves it is required. In the H10 regression the route-aware minimum is ~946 px, while the independent node-contour X rescue remains ~61 px.
- Adds padded Flow-corridor proximity as an advisory visual-cleanliness metric instead of using it as a hard repair target; aggressively repairing every near-wire case caused unnecessary large-scale shifts.
- Adds exact typed Attachment wire/node and unrelated wire-crossing audits. Attachment routing remains advisory in this first routing build because ordered/mixed attachment domains need their own route-aware family policy before they can safely become hard blockers.
- New proposal metrics: routed Flow wires, Flow wire/node hits before -> after, padded Flow-corridor intrusions, edge-corridor repairs / shifted nodes, maximum edge-corridor X shift, Attachment wire/node audit, and unrelated wire crossings.
- Cold Dense regression: Flow wire/node hits 21 -> 0 at H10, node overlaps remain 14 -> 0, and H10/H20/H40/H70 all stay overlap-free. Combined local Cold + partial Hot fixtures report 22 -> 0 Flow wire/node hits and 0 unrelated wire crossings.
- Adds a focused compact-fork regression where one Flow Bezier intentionally crosses a sibling node before routing repair and must end with 0 Flow wire/node hits without introducing node overlap or unrelated wire crossing.

## 0.5.6 Cross-Domain Repair Planner

- Flow collision repair no longer performs the old deep-author X rescue unconditionally. Candidate repairs are compared by displacement and affected-node count; the large deep-X move remains only as a fallback.
- Cross-domain attachment families can clear a collision locally in either X or Y. Exact forbidden-shift intervals are merged to find the smallest collision-free rigid-family translation instead of jumping the family to one side of the whole graph.
- Reader v2 can resolve field aliases by a unique catalog connection type. This maps the known `ThicknessFunctionXZ` relation to `DensityPin` and removes Cold Dense's last unresolved positioned semantic edge.
- Dense Cold regression stays at 14 -> 0 overlaps for H10/H20/H40/H70. At H10 the former ~942 px Flow X rescue falls to ~61 px, while the largest attachment-family repair stays below 500 px and fewer than 100 nodes move with Flow clusters.

## 0.5.5 Semantic Attachment Contours

- Keep Reader v2 same-domain flow forks as the solver topology; typed attachments no longer become flow branches.
- Attachment owner padding now respects the author sketch: if owner and attachment do not overlap in Y, their X offset is left untouched; when they do overlap, padding is applied on the authored left/right side instead of forcing every attachment to the right.
- Added a final attachment-family contour pass. Ordered attachment siblings move as a rigid family only when they still collide with a foreign contour after flow compaction.
- Added diagnostics for attachment contour rescues / shifted nodes / maximum contour shift.
- Dense Cold regression now covers H10/H20/H40/H70 and must remain overlap-free.

## 0.5.4 Semantic Reader A/B

- Reader v2 now drives Normalize flow-fork classification instead of being diagnostic-only.
- Typed attachments no longer form flow branch clusters; they preserve author offsets and receive only local owner-to-attachment X padding when current geometry would overlap.
- Added explicit semantic structural-fork and attachment-padding metrics.
- Fixed global app version label so the build visibly reports v0.5.4.
- Cold Dense regression: 14 -> 0 overlaps for H10/H20/H40 while semantic solver uses 54 flow forks vs 165 structural forks.

## 0.5.3 Reader v2 diagnostic
- adds a semantic layout reader that separates structural ownership from edge meaning before layout
- classifies catalog-backed relations into same-domain flow, typed attachment, ordered attachment, or unresolved structural relation
- uses the recovered Hytale visual catalog generically: a parent port whose connection type matches the parent output domain is flow; a typed domain switch is an attachment
- preserves author `$Position` only as sketch evidence (`authorDelta`), never as topology
- Normalize remains behaviorally unchanged in this diagnostic build; Reader v2 runs in parallel so A/B metrics cannot introduce new layout regressions
- proposal UI now compares legacy structural forks with Reader-v2 same-domain flow forks and reports flow edges, attachments, ordered attachments, mixed parents and unresolved semantic edges
- Reader-v2 regression covers `CurveMapper.Density`: `Inputs` is flow, `Curve` is attachment, and `Manual.Curve.Points` are ordered attachments
- Cold Dense audit: 165 legacy structural forks vs 54 same-domain flow forks, with 253 typed attachments, 206 ordered attachments and 38 mixed flow/attachment parents
- existing Cold Dense layout behavior remains unchanged: 14 -> 0 live overlaps for H10/H20/H40

## 0.5.2 Flow Normalize — accurate padding follow-up
- multi-input inline selection still uses the bounded geometry-aware fork range (up to +36px over the configured connection-plane tolerance), but a fork inline candidate is now **classified rather than hard-snapped**: its small author Y offset is preserved; exact connector-plane snapping remains a single-child behavior
- inline main branches are protected from later padding-only Y pushes: real overlap must still be resolved, but a global 70px branch gap may no longer destroy an otherwise clean multi-input center lane
- sibling subtree collision checks are now symmetric: sufficient vertical clearance above **or** below counts as clear, so interleaved author branches are no longer serialized just because a nominally lower subtree contains a high node
- near-touching sibling contours can use a bounded local **X padding rescue** before paying for a large Y translation: the proactive pass targets direct `Inputs` fork bands, while a real collision may move any same-field band (including `Points`/`Keys`) as a whole so its internal order/cadence stays untouched
- tiny existing fork X jitter (<=8px) is preserved when the author step is already geometry-correct, while requested X gaps still drive real spacing changes
- a regression fixture now covers the exact wide-leaf / inline-main / near-touching-next-band case and exposes `contourXRescues` in layout metrics
- comparison regression against the supplied desired 81-node layout reproduces all 81 target positions exactly after canonical root translation
- near-tie fork candidates still use a small author-depth/fallback bias so an almost-equally aligned deep branch does not accidentally steal the inline continuation; clearly straighter deep continuations remain valid
- replaces global/flat normalization with a structural primary tree derived from JSON nesting
- imports the useful legacy `Hytale-Node-Layout` idea as **local author intent** rather than porting its fixed 320px grid or point-collision solver
- node geometry now exposes derived physical left/right connector-center offsets from the bundled HytaleGenerator Java visual catalog
- single-child chains align matching parent-right / child-left connectors when the original edge was already near one connection plane
- multi-child forks preserve author Y order and select at most one near-plane child as the horizontal main continuation
- local fork **author-depth bands** preserve branch starts that were deliberately placed several X depths behind immediate children
- author-depth distance is compacted relative to the immediate step; collision repair can restore X depth before using a large Y displacement
- bottom-up branch contours still compare real node rectangles only where X ranges overlap; sibling cluster bounding boxes may interleave
- nested branch moves are attempted first only when they remain collision-safe; otherwise the entire sibling cluster moves to preserve its internal layout
- new metrics expose connection-plane aligns, port fallbacks, depth bands/deep starts, X-depth rescues, X/Y span and maximum X/Y repair shifts
- Groups remain authoritative passive containers; original membership and overlap relationships stay protected
- Floaters remain orthogonal with Ignore / Pack / Quarantine
- real regression: 11 graph files / 1,872 nodes / 0 geometry fallbacks / 27→0 live overlaps / canonical root 0,0 in all files
- Cold-Dense regression now explicitly guards the former deep `Sum` branch Y blow-up and requires the branch to remain visually deeper than the immediate `Max` branch

## 0.5.1 Normalize X v2 fix
- Replaced global author-column serialization with Y-aware minimum-gap constraints.
- Fixed the horizontal constraint adjacency graph so previously discovered reverse edges are not reset.
- Normalize now preserves deliberate larger author X whitespace and only pushes bands apart when real node bounds share Y space and violate the requested gap.
- Added X-overlap component/constraint metrics and a real-project regression guard against the previous 18,787 -> 58,486 span inflation.
- Floater Ignore / Pack / Quarantine remain active and independent from live Normalize.


## 0.5.1 gap/floater test R2
- strengthens the H10/H20/H40 regression: different horizontal settings must produce different node X targets and strictly different graph X spans
- proposal UI now reports X/Y normalized counts, requested X gap, author-band count and X span before → after so horizontal behavior can be verified before staging
- staging a new layout proposal now replaces older staged `layout` changes for the same file scope, preventing stale X/Y patches from a previous gap test
- Visual tab clearly warns when layout changes are already staged and changes the action to `Replace staged layout`
- Floater handling is now active: Ignore (origin shift only), Pack (compact in the existing floater area), Quarantine (compact below the live graph)
- floating nodes are kept out of live author-column normalization and out of Group membership inference; floater overlap metrics are tracked separately
- real-project regression verifies all three X gaps differ, Pack/Quarantine handle the 139 real floaters, and both leave 0 floater overlaps

## 0.5.1
- activates the first real layout strategy: **Normalize**
- canonical origin is now a global invariant: the positioned live root is permanently translated to `(0,0)` before every layout
- the root offset is applied to all positioned nodes, groups and comments; ignored floaters keep their relative position but receive the same translation
- EditorMetadata index now exposes Group/Comment positions and writer-safe `$width` / `$height` paths
- GroupSnapshot captures original direct node membership, nested group hierarchy, author padding and the original group-overlap graph
- Normalize aligns near-equal author X columns using configurable tolerance and enforces geometry-aware horizontal/vertical spacing
- group members are normalized independently from outside nodes; groups never shrink and only expand when members would leave their original section
- proposals that introduce a new group-overlap pair are blocked before staging
- Visual tab now has read-only proposal generation, per-file metrics, stale detection and explicit Stage Proposal
- staged layout numbers use the normal ChangeSet with `source: layout`, preserving Undo/Redo, diagnostics preflight and all v0.4 output targets
- agreed future modes renamed to **Author Rebuild** and **DAG Rebuild**; Hytale Auto Position is not used

## 0.5.0
- starts the Visual / Graph / Layout feature line without changing the v0.4 safe-output contract
- singleton `Visual / Layout` Workbench tab alongside File and Query tabs
- explicit file-level layout scope selection with All Graph Files / Explorer Scope / Clear helpers
- layout settings state for Author Bound / Normalize, Structured DAG and Rebuild DAG
- Compact / Normal / Spacious / Custom spacing plus Live/Floating, root-anchor, author-section and Floater policies
- independent `$NodeEditorMetadata` index with exact scalar `$Position.$x/$y` JSON paths
- generated visual catalog for all 341 shipped HytaleGenerator Java NodeEditor definitions
- Hytale Normal geometry profile derived from the shipped NodeEditor Noesis XAML
- geometry resolver keeps width confidence explicit and models fixed, derived and dynamic heights separately
- existing author positions/distances are explicitly forbidden as a node-size inference source
- visual-only compatibility aliases cover legacy NodeEditor IDs without changing parser semantics or JSON
- real Ps-Ancient-Worlds geometry regression resolves all 1,872 positioned nodes across 11 graph files with 0 fallback
- `layout` added as a Change source for the upcoming position-proposal staging layer
- v0.5.0 foundation deliberately does not stage/mutate `$Position` yet

## 0.4.0
- Safe Project Output closes the refactor workflow from staged changes to controlled output
- separates Output Target (Original Project / Other Folder / ZIP) from Output Scope (Full Project / Changed Files Only)
- Direct Apply intentionally writes changed files only and never rewrites unchanged source files
- Full Project exports preserve every selected source file, including binary/non-JSON assets
- uploaded folder paths are normalized relative to the selected root and the real root name is retained
- editable ZIP filenames with defaults `<Root>-Refactor.zip` and `<Root>-Changed-Files.zip`
- dependency-free ZIP STORE writer with UTF-8 paths and byte-preserving binary entries
- Other Folder output supports full-project or changed-only copies while preserving relative paths
- target-file collisions require explicit overwrite acknowledgement
- Direct Apply re-reads changed source files and blocks external content conflicts
- selecting the opened source folder as an alternate output redirects to protected Original Project mode
- Direct Apply reloads source state and clears ChangeSet/Undo/Redo after success
- ZIP and Other Folder exports leave source, ChangeSet and Undo/Redo untouched

## 0.3.5
- Query Intelligence closes the current Search/Query feature line before Graph/Layout work
- new `value:` operator searches effective field values and combines with `field:`
- new `is:` predicates: import, export, unresolved, changed, live, floating
- `is:unresolved` resolves current unresolved-import diagnostics back to node/field matches
- `is:changed` reads staged ChangeSet membership and highlights changed fields
- `value:` sees staged effective values before Apply
- query tokenizer now supports quoted terms and quoted operator values such as `value:"Main River"`
- unsupported `is:` values are surfaced as unknown operator/value warnings
- global Search bar provides lightweight project-driven suggestions for `is:`, `workspace:`, `field:`, `node:`/`type:` and `location:`
- virtual tabs receive compact SEARCH / REFS / DIAG / CHANGES type labels
- no separate Search filter UI was introduced; normal Workbench filters remain authoritative

## 0.3.4
- generalized tab model: File tabs plus reusable Query tabs
- Search remains a snapshot Query tab and keeps explicit stale/refresh behavior
- Reference drawer adds `Open all as tab` and creates `References: <symbol>` snapshots
- References Query tabs reuse normal Imports/Exports/Live/Floating/Workspace/Value filters
- diagnostic counters now open a live Diagnostics Query tab
- diagnostic overview groups Parse Errors, Unresolved Imports, Duplicate Exports, Cross-Type Collisions and Unused Exports
- diagnostic categories open affected nodes as filtered Query tabs with field highlighting
- file-level diagnostics remain visible as messages when no NodeCard can represent them
- bottom CHANGES status opens a live `Changes: Pending` Query tab
- Pending Changes updates immediately on stage / Undo / Redo / Discard / Apply
- Search/References use `refreshPolicy: snapshot`; Diagnostics/Changes use `refreshPolicy: live`
- adaptive Quick Values now derive their context from File, Search, References, Diagnostics or Changes tab membership
- no Query tab owns separate filter/edit/change state

## 0.3.3
- adaptive Quick Values v2: raw occurrence count is no longer the sole ranking signal
- field statistics now track filterable-node population, node-kind diversity, file coverage and dominant-node-kind share
- Quick panel selects up to 3 Broad Commons plus Context Commons for the remaining slots
- Broad ranking rewards fields distributed across different node kinds/files
- Context ranking still surfaces fields that are genuinely common in the active File/Search snapshot
- dominance penalty prevents 100× copies of one node type from evicting all broader useful fields
- scopes with no real diversity do not receive artificial file/type-coverage advantages
- full `+ Filter` Common group now uses the same relevance signals while still showing raw occurrence counts
- detailed field hover diagnostics expose population/diversity/score information for tuning
- new regression fixture verifies the 100× MaterialNode dominance case

## 0.3.2
- Editing ON/OFF redesigned as `Editing: [Off | On]` segment control
- Quick Filter panel with four permanent semantic/location shortcuts: Imports, Exports, Live, Floating
- six stable adaptive Quick Value slots derived from the active File/Search node set
- new `getFieldStatsForNodeRefs(...)` core helper for presence-driven stable tab contexts
- active filter buttons are highlighted and expose `×` removal semantics
- centralized `+ Filter` picker for Semantic, Location, Workspace and all discovered Node Values
- additional active filters (Seeds, Workspace, non-quick Values) remain visible as removable chips
- Explorer Workspace moved above the Project Tree and now affects navigation only
- View Workspace remains a separate optional filter available through `+ Filter`
- Search queries and Search snapshots are never implicitly limited by Explorer Workspace
- normal File/Search result count shown as `visible / context total`
- filter reset returns to the safe default filter state

## 0.3.1
- presence-driven `FieldIndex` for generic node values
- adaptive Values filter generated from fields actually present in the project
- Common/Other grouping derived from current workspace + live/floating scope counts
- `Type` is treated as node metadata rather than an editable generic Value
- unified `FileTab | SearchTab` tab model
- Enter in global search opens a temporary node-centric `Search: <query>` tab
- multiple Search tabs can exist in parallel
- Search tabs use the normal global Imports/Exports/Seeds/Values/Live/Floating/Workspace filters; no secondary search-filter state
- Discord-like query operators: `field:`, `workspace:`, `node:`/`type:`, `location:`
- AND semantics for free search terms
- matched fields/metadata are marked on Search NodeCards
- Search snapshots stay stable and become stale after project or staged-value changes
- Refresh re-runs search against effective staged values
- unknown query operators are surfaced as warnings

## 0.3.0
- Editing ON/OFF replaces Read/Refactor mode tabs
- Undo/Redo for staged changes; history intentionally clears after Apply
- explicit irreversible-Apply warning
- HytaleGenerator child folders become dynamic workspaces
- Settings and WorldStructures now detected as real workspaces
- future HytaleGenerator child folders are supported without parser changes
- compact Node Cards with technical NodeId/JSON-path copy helpers
- bidirectional symbol navigation (export -> refs, import -> definition/unresolved)
- selective symbol rename staging by definition/reference and live/floating scope
- active rename-rule panel
- indexed literal/property match suggestions
- Seed/property matches remain manual suggestions, never implicit propagation
- persistent project/change/diagnostic status bar
- grouped Change Review with per-change and per-file removal
- diagnostic preflight diff; Apply blocks newly introduced errors
- file tree badges for export/import/diagnostic counts

## 0.2.0
- Unknown-first parsing formalized
- Workspace metadata (`Density`, `Biome`, `Unknown`)
- selected-root workspace hints for direct Density/Biome folder opening
- project Folder Tree
- workspace badges/filter
- global project Search
- exact node navigation from Search/References
- collapsible Live/Floating sections
- relevance-aware node counts
- Common/All property detail levels
- folder-loading progress/error polish
- retained v0.1.1 Error Boundary and safe ChangeSet writer

## 0.1.1
- fixed Zustand/React snapshot loop in DiagnosticsSummary
- added UI Error Boundary

## 0.1.0
- initial project model, symbol index, refactor ChangeSet and inspector UI
