# Hytale Generator Workbench — Pre-1.0 Full Audit Roadmap

**Baseline:** `v0.11.36-rc.3` / commit `8cda1880747b5f1358acc4f03dd2437c756afee8`  
**Purpose:** systematic release-readiness review before the project approaches `1.0`.  
**Policy:** every track must leave auditable evidence, distinguish blockers from accepted limits, and add a repeatable automated gate where that is practical. A green subset never waives a failed release-critical gate.

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
| 08 | Security & threat model | Local file trust boundary, WebView surface, command injection, path traversal, updater trust, secrets, dependency/supply-chain risks | Written threat model, source checks, dependency review, no unresolved high-severity finding | **IN REVIEW** |
| 09 | Apply transaction, recovery & concurrency | Conflict detection, journal/temp/backup sequence, rollback, cleanup, watcher suppression, reload generation guards | Failure-injection matrix, interrupted apply/recovery cases, race/concurrency tests | TODO |
| 10 | I/O, ZIP, import/export & large-project safety | Folder loading, output policy, ZIP32 limits, binary copies, semantic discovery, previews | Boundary/overflow fixtures, explicit errors instead of silent truncation, representative large-project run | TODO |
| 11 | Performance, scalability & resource behavior | Search/indexing, graph/layout, rendering, diagnostics, WorldGen log scan, large project limits, memory/CPU/I/O | Measured representative profiles, regression budgets where stable, cancellation/bounded-memory review | TODO |
| 12 | Diagnostics, logging & privacy | Runtime diagnostics, structured logs, support reports, path scrubbing, rotation/bounds, opt-in fields | Privacy data-flow review, redaction tests, bounded storage proof, no project-content leakage | TODO |
| 13 | Error handling & resilience | React fatal boundary, native errors, offline/update failures, malformed files/logs, user-recoverable states | Error taxonomy, destructive-action review, retry/recovery UX, no silent corruption paths | TODO |
| 14 | Updater, signing & release pipeline | Stable/Preview isolation, signature enforcement, tag gates, immutable versions, release surface, installer/updater E2E | Signed installed-client E2E, bad-signature rejection, channel isolation, release-surface allowlist, fail-closed CI | TODO |
| 15 | Build, CI & reproducibility | Node/Rust pins, lockfiles, deterministic embedded frontend, Windows runners, action pinning, RC/publish separation | Clean build from locks, reproducibility checks, CI permission review, no hidden local prerequisite | TODO |
| 16 | Dependencies, licenses & distribution compliance | npm/Cargo graphs, runtime distribution classification, notices, transitive license metadata | Inventory from locks, classification, generated notices, unresolved license exceptions = 0 | TODO |
| 17 | Repository hygiene, maintainability & documentation | Dead/unused carry, generated files, public-source hygiene, stale docs, large monoliths, naming/version drift | Hygiene gates, current docs, accepted debt register, no private/local artifacts | TODO |
| 18 | Final 1.0 acceptance & manual smoke | Real installer, representative projects, open/edit/search/graph/layout/apply/settings/restart/update/uninstall | Signed release candidate, complete manual acceptance matrix, all prior blockers closed, explicit known-limits sign-off | TODO |

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

Track 08 is now in review: **Security & threat model**.
