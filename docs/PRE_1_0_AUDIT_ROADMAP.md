# Hytale Generator Workbench — Pre-1.0 Full Audit Roadmap

**Baseline:** `v0.11.36-rc.3` / commit `8cda1880747b5f1358acc4f03dd2437c756afee8`  
**Purpose:** systematic release-readiness review before the project approaches `1.0`.  
**Policy:** every track must leave auditable evidence, distinguish blockers from accepted limits, and add a repeatable automated gate where that is practical. A green subset never waives a failed release-critical gate.

**Owner decision, 2026-10-02:** Stable and Preview remain the only release channels. No separate QA product, installation or repository will be introduced. An installed-client manipulation test remains a possible follow-up; its setup is undecided and must preserve the existing security gates and public update feeds.

## Status model

- **TODO** — not yet reviewed against the current source line.
- **IN REVIEW** — evidence collection or remediation is active.
- **PASS** — reviewed with no unresolved 1.0 blocker; follow-up debt may still be documented.
- **BLOCKED** — a release-blocking defect or missing proof remains.
- **N/A** — explicitly out of product scope, with rationale recorded.

## Audit tracks

| # | Track | Scope | Required evidence / exit condition | Status |
|---|---|---|---|---|
| 01 | UI, CSS & Workbench layout integrity | Global CSS, source/embedded parity, responsive behavior, DPI/UI Scale, pane container queries, sidebar/split layout, dialogs/overlays, focus visibility, reduced motion | Source audit + regression contract + review of existing layout/UX/accessibility tests; no unresolved clipping, overflow, focus or source/package divergence blocker | **PASS** |
| 02 | Generator layout engine & geometry correctness | `src/core/layout`, geometry resolver, normalization, author grid, edge corridors, tolerances, golden baselines | Self-contained representative fixtures, deterministic/golden comparison, mutation/edge cases, large graph cases, blocked-reason correctness | **PASS** |
| 03 | Accessibility & keyboard interaction | Tabs, menus, comboboxes, dialogs, focus trap/restore, splitter, labels, semantic roles, keyboard-only flows, contrast/high-contrast behavior | Automated semantic contracts plus manual keyboard/high-contrast smoke matrix | **PASS** |
| 04 | Frontend architecture & component boundaries | React component ownership, store coupling, render boundaries, command registry, feature/module boundaries, error boundaries | Dependency/coupling review, oversized-module risks, circular/hidden ownership checks, documented decisions | **PASS** |
| 05 | Application state, persistence & lifecycle | Zustand state, ProjectSession, recent projects, pane state, close/reopen/reset, stale/corrupt persistence | State ownership map, reset/close matrix, corrupt-state tests, no staged-edit resurrection or cross-project leakage | **PASS** |
| 06 | Core model, parsing, references & refactors | Parser, JSON path identity, project model, search/indexes, semantic refs, patcher, validation, rename/refactor | Representative correctness fixtures, adversarial JSON/path cases, roundtrip/refactor invariants | **PASS** |
| 07 | Native/Tauri authority boundary | Commands, capabilities, opaque tokens, canonicalization, containment, reparse points, file type/size/count/depth limits | Threat-oriented command review, least-privilege capabilities, traversal/symlink/reparse fixtures, denial paths | **PASS** |
| 08 | Security & threat model | Local file trust boundary, WebView surface, command injection, path traversal, updater trust, secrets, dependency/supply-chain risks | Written threat model, source checks, dependency review, no unresolved high-severity finding | **PASS** |
| 09 | Apply transaction, recovery & concurrency | Conflict detection, journal/temp/backup sequence, rollback, cleanup, watcher suppression, reload generation guards | Failure-injection matrix, interrupted apply/recovery cases, race/concurrency tests | **PASS** |
| 10 | I/O, ZIP, import/export & large-project safety | Folder loading, output policy, ZIP32 limits, binary copies, semantic discovery, previews | Boundary/overflow fixtures, explicit errors instead of silent truncation, representative large-project run | **PASS** |
| 11 | Performance, scalability & resource behavior | Search/indexing, graph/layout, rendering, diagnostics, WorldGen log scan, large project limits, memory/CPU/I/O | Measured representative profiles, regression budgets where stable, cancellation/bounded-memory review | **PASS** |
| 12 | Diagnostics, logging & privacy | Runtime diagnostics, structured logs, support reports, path scrubbing, rotation/bounds, opt-in fields | Privacy data-flow review, redaction tests, bounded storage proof, no project-content leakage | **PASS** |
| 13 | Error handling & resilience | React fatal boundary, native errors, offline/update failures, malformed files/logs, user-recoverable states | Error taxonomy, destructive-action review, retry/recovery UX, no silent corruption paths | **PASS** |
| 14 | Updater, signing & release pipeline | Stable/Preview isolation, signature enforcement, tag gates, immutable versions, release surface, installer/updater E2E | Signed installed-client E2E, bad-signature rejection, channel isolation, release-surface allowlist, fail-closed CI | **BLOCKED** |
| 15 | Build, CI & reproducibility | Node/Rust pins, lockfiles, deterministic embedded frontend, Windows runners, action pinning, RC/publish separation | Clean build from locks, reproducibility checks, CI permission review, no hidden local prerequisite | **PASS** |
| 16 | Dependencies, licenses & distribution compliance | npm/Cargo graphs, runtime distribution classification, notices, transitive license metadata | Inventory from locks, classification, generated notices, unresolved license exceptions = 0 | **IN REVIEW** |
| 17 | Repository hygiene, maintainability & documentation | Dead/unused carry, generated files, public-source hygiene, stale docs, large monoliths, naming/version drift | Hygiene gates, current docs, accepted debt register, no private/local artifacts | **PASS** |
| 18 | Final 1.0 acceptance & manual smoke | Real installer, representative projects, open/edit/search/graph/layout/apply/settings/restart/update/uninstall | Signed release candidate, complete manual acceptance matrix, all prior blockers closed, explicit known-limits sign-off | **BLOCKED** |
| 19 | Final GitHub cleanup | After Tracks 01–18: obsolete merged branches, superseded draft PRs/issues, labels/milestones, redundant Actions artifacts and stale repository links/settings | Reviewed keep/remove inventory, protected release/update assets and audit evidence retained, cleanup results recorded | TODO — inventory prepared |

## Track rules

1. A track is not complete because an older milestone once passed; it must be re-evaluated against the current source line.
2. Existing regression tests are evidence, not a substitute for reviewing what they do **not** cover.
3. Findings are classified as **blocker**, **must-fix before 1.0**, **hardening**, or **accepted/documented limit**.
4. Fixes should add the narrowest durable regression that proves the corrected invariant.
5. Expensive or environment-dependent checks belong in RC/manual gates when a cheap source invariant can protect normal PRs.
6. Source and committed `tauri-ui` behavior must remain synchronized because the packaged desktop app ships the committed embedded frontend.
7. Security/release checks remain fail-closed. Private signing material must never enter source, artifacts intended for end users, logs, or audit documents.

## Current progress

Track 01 is completed in `docs/audits/PRE_1_0_01_UI_CSS_LAYOUT.md` and is backed by `test:pre1-ui-css-layout`.

Track 02 is completed in `docs/audits/PRE_1_0_02_LAYOUT_GEOMETRY.md` and is backed by `test:pre1-layout-geometry`. The audit retained the external v0.7.2 Atlantis golden as manual evidence, added self-contained deterministic/safety coverage, and remediated two numeric trust-boundary findings: unbounded engine settings and unsafe editor-coordinate values/output patches.

Track 03 is completed in `docs/audits/PRE_1_0_03_ACCESSIBILITY_KEYBOARD.md` and is backed by `test:pre1-accessibility-keyboard`. The audit remediated missing Windows forced-colors coverage and separated Workbench rail navigation semantics from true toggle-button semantics.

Track 04 is completed in `docs/audits/PRE_1_0_04_FRONTEND_ARCHITECTURE.md` and is backed by `test:pre1-frontend-architecture`. The audit found no unresolved import-cycle or layer-direction blocker, retained the global React fatal boundary and command/store ownership split, and documented `store.ts` plus `App.tsx` as bounded hardening debt rather than forcing a risky pre-1.0 refactor.

Track 05 is completed in `docs/audits/PRE_1_0_05_STATE_PERSISTENCE_LIFECYCLE.md` and is backed by `test:pre1-state-persistence-lifecycle`. The audit remediated two cross-session/project-boundary findings: watcher debounce/error/notice state is now reset on `projectRoot` transitions, and project/recent persistence is bounded and normalized on both read and write paths. The gate executes the real persistence module against corrupt localStorage fixtures and verifies that staged edits/history/content are never serialized or resurrected.

Track 06 is completed in `docs/audits/PRE_1_0_06_CORE_MODEL_PARSING_REFACTORS.md` and is backed by `test:pre1-core-model-refactor`. The audit remediated collision-prone opaque symbol/field/refactor identities, made diagnostic diffs severity-aware, rejects blank rename targets in the core, and now fails closed on duplicate explicit `$NodeId` values within the same node location while preserving live/floating identity separation.

Track 07 is completed in `docs/audits/PRE_1_0_07_NATIVE_TAURI_AUTHORITY.md` and is backed by `test:pre1-native-authority-boundary` plus Windows-native junction fixtures in the locked Rust suite. The audit remediated native authority retargeting across project/output/WorldGen grants, hardened existing-output canonical containment and made WorldGen file/folder authority explicitly reparse-aware.

Track 08 is completed in `docs/audits/PRE_1_0_08_SECURITY_THREAT_MODEL.md` and is backed by `test:pre1-security-threat-model`. The audit formalized the renderer/native/updater/supply-chain threat boundaries, removed computed Tauri command dispatch in the save bridge, added tracked-secret and immutable-action checks, and guards the 2026 Tauri origin-confusion advisory with a locked-version floor of `>=2.11.1` (current lock: 2.11.5). Private Vulnerability Reporting or an equivalent private contact remains an explicit manual admin prerequisite for stable 1.0/public promotion because repository-admin state cannot be proven by source CI.

Track 09 is completed in `docs/audits/PRE_1_0_09_APPLY_TRANSACTION_RECOVERY.md` and is backed by `test:pre1-apply-transaction-recovery` plus locked Windows-native failure/race fixtures. The audit widened the transaction authority lock across Apply, project switch, reload/recovery, project close and application exit; made journal/commit metadata fail closed; and prevents rollback/recovery from overwriting newer external edits by persisting and validating intended-content fingerprints. The final Track 09 validation passed 18/18 native tests, release/embedded parity, the full registered regression matrix and zero unused source carry.

Track 10 is completed in `docs/audits/PRE_1_0_10_IO_ZIP_EXPORT.md`, with `test:pre1-io-zip-export` and eight Windows-native I/O fixtures. It remediated ZIP32 overflow/path ambiguity, unbounded actual reads after inventory, unsafe destination replacement and premature ZIP-save success. A synthetic 10,002-file project was scanned deterministically. Windows PR validation passed 83/83 registered suites, 250 soak cycles, 26/26 native tests, release/embedded parity and zero unused source carry.

Track 11 is completed in `docs/audits/PRE_1_0_11_PERFORMANCE_RESOURCES.md`, with `test:pre1-performance-resources` and four native fixtures. It remediated repeated global search/graph lookups, unbounded metric-name/request-duration retention and malformed-line WorldGen read amplification. Native WorldGen work is limited to one cancellable blocking scan. Representative profiles and deterministic work/retention budgets are recorded; installed-client peak memory and frame latency remain Track 18 acceptance work. Windows CI passed 84/84 suites, 250 soak cycles, 30/30 native tests, release/embedded parity and zero unused source carry.

Track 12 is completed in `docs/audits/PRE_1_0_12_DIAGNOSTICS_PRIVACY.md`, with `test:pre1-diagnostics-privacy` and four native fixtures. Remediation covers raw-error content leakage, path/metadata filtering, recursion and event-size limits, immutable snapshots, clear/write sequencing and native rotation/target checks. Windows PR CI passed 85/85 suites, 250 soak cycles, 34/34 native tests, release/embedded parity and zero unused source carry. Raw error text/stacks and arbitrary fields are deliberately omitted; old disk history and manual installed-client acceptance remain explicit limits.

Track 13 is completed in `docs/audits/PRE_1_0_13_ERROR_HANDLING_RESILIENCE.md`, backed by `test:pre1-error-resilience`. Remediation covers native error/cancellation confusion, premature diagnostic-save success, fatal reload confirmation, layout and lifecycle failure recovery, optional storage denial and stale update offers. Windows PR CI passed 86/86 suites, 250 soak cycles, 34/34 native tests, release/embedded parity and zero unused source carry. Fatal recovery cannot roll back in-progress writes; installed updater and manual UI acceptance remain explicit follow-up work.

Track 14 is reviewed in `docs/audits/PRE_1_0_14_UPDATER_RELEASE.md`, backed by `test:pre1-updater-release` and five native fixtures. Source remediation covers stale offers, concurrent install/Apply, premature signature-success reporting, immutable download targets, bounded network waits, cryptographic staged-artifact verification, monotonic channel publication and SemVer edge cases. Windows PR CI passed 87/87 suites, 250 soak cycles, 39/39 native tests, release/embedded parity and zero unused source carry; Dependency Approval also passed. The subsequent rc.4-to-rc.5 test is recorded in `docs/audits/UPDATER_E2E_RC5.md`: the owner confirmed pre-install staged-edit blocking, installation after discarding the test change, automatic restart and no newer offer on a repeat Preview check. Installed rc.5 identity/resources and public artifacts were independently verified. Standalone checks also rejected a modified installer and signature; installed-client manipulation, interruption, download-time concurrency and Stable/downgrade cases remain unverified. The earlier Settings audit verified the release reviewer/branch rules and both signing-secret names, and found administrator bypass enabled. Version-tag ruleset `24035029` was verified active with no bypass actors. Environment administrator bypass and version-asset governance remain open release controls. **This track is not PASS.**

Track 15 is completed in `docs/audits/PRE_1_0_15_BUILD_CI.md`, backed by `test:pre1-build-ci`. PRs #33 and #34 fixed swallowed Git-fetch failure, Windows bootstrap return control, stale installer selection, divergent local verification and inexact CLI identity checks. Fresh local bootstrap/raw build passed with unchanged locks. Required PR CI and protected non-publishing candidate [37120425666](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/37120425666) passed on merged packaging commit `d9640c5268008c89abe835c0c769e9276b9e9346`: 88 suites, 250 soak cycles, 39 native tests, 19 shell cases, repeated embedded emission, deep release-integrity mutations and signed NSIS packaging. The downloaded artifact's digest, six-file surface, lock/notices parity and updater signature were independently verified on 2026-10-04. Native bit-for-bit reproduction is not claimed. This same-version rc.5 candidate was not published or installed; it neither repeats the successful installed update nor closes Track 14.

Track 16 is in review in `docs/audits/PRE_1_0_16_DEPENDENCIES_NOTICES.md`, backed by `test:pre1-dependency-notices` and `test:bundled-materials`. PR #36 merged the `rustls 0.23.45` fix. PR #38 validation passed 91 suites, 250 soak cycles and 39 native tests, including byte-verified Microsoft SDK loader and TypeScript helper notices (247 entries/160 legal texts). Preact's 10.5.13 code relationship was verified by complete binding-aware comparison and export parity; runtime bytes are unchanged. Installer plug-in distribution provenance and a fresh signed final candidate remain open; this track is not PASS.

Track 17 is completed in `docs/audits/PRE_1_0_17_REPOSITORY_HYGIENE.md`, backed by `test:pre1-repository-hygiene`. It corrects stale living-document version/updater claims, validates tracked public-source paths and relative Markdown links, and records bounded monolith/type-cycle maintenance debt. Windows PR validation passed the actual hygiene and secret gates, 91 suites and 39 native tests; follow-up changes remain subject to exact-head CI before merge.

Track 18 has a concrete acceptance matrix in `docs/audits/PRE_1_0_18_FINAL_ACCEPTANCE.md`. Existing rc.5 update evidence is retained; final-candidate manual smoke, signature manipulation, interruption/concurrency, channel/downgrade and uninstall cases remain individually unverified. The matrix is prepared, not passed.

Track 19's read-only inventory is in `docs/audits/PRE_1_0_19_GITHUB_CLEANUP.md`: nine merged branch candidates, six unresolved temporary branches, four active dependency PRs, protected release assets and two provenance artifacts. No cleanup deletion is performed before acceptance.

**Current release blockers:** Track 14 installed-client E2E/repository controls, Track 16 installer distribution provenance/final signed candidate and Track 18 final acceptance. Track 17 source/doc hygiene is complete; Track 19 cleanup execution waits for acceptance.

## Final roadmap item — GitHub cleanup

Track 19 is the final roadmap item, after the audits and acceptance work. Scheduling it does not authorize deletion now.

- Inventory merged/obsolete branches, superseded draft PRs and issues, labels/milestones, Actions artifacts and stale links or repository metadata; distinguish active work and needed evidence from removable leftovers.
- Record the concrete keep/remove list before making changes. Unmerged work and required audit/build provenance must be retained.
- Preserve published version tags/releases, installer/signature/hash/notices assets, rolling Stable/Preview manifests and the URLs used by installed clients. Release-history deletion or updater-feed changes are outside routine cleanup.
- Retain lockfiles, Windows build helpers, pinned Actions, branch/tag protection and signing-environment controls. Cleanup must not weaken release gates or restore deliberately removed historical/internal files.
- Finish with a concise cleanup record and verify that repository links, required checks and existing release/update downloads still work.
