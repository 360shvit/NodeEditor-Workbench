# Installed editor acceptance — rc.8 supplemental test

Performed by direct desktop UI interaction on 2026-11-08 and 2026-11-09; recorded 2026-11-10. Installed application: `0.11.36-rc.8`, Windows Apply Persistence. This supplements, and does not replace, the owner-reported acceptance.

## Scope and results

Only isolated copies were used: four synthetic JSON files and a representative 196-file project (16 semantic inputs, 1,955 nodes).

Passed observed scenarios:
- Editing Off protection; number/boolean staging using Enter and blur.
- Undo, Redo, Discard, and focus/blur after Discard without restaging.
- Multi-file staging; close-project Cancel preserves pending changes.
- Semantic preflight; Apply of three fields in two files; empty staging/history afterwards.
- Applied hashes and semantic comparison match exactly the intended fields; the other two files stay unchanged.
- Close/reopen preserves applied values; reference navigation, split resizing and closed-tab reopening.
- An externally changed staged file is reloaded, with a visible warning and affected staging cleared; the external value is preserved. This does not test an in-flight native write race.
- Representative-project opening/search; graph wheel zoom, pan and Fit.
- Normalize preview for 11 graph files while Editing Off; changed file selection followed by Cancel preserves the previous selection and preview.
- Diagnostic JSON saving with project paths disabled. The continuation session records zero runtime errors/warnings. All 196 representative files remain byte-identical.

The representative project's existing content diagnostics (11 errors, 2 warnings, 26 information entries) are distinct from runtime errors.

## Open defect: clipped change-review actions

At 125% UI scale and an approximately 1769 x 1004 window, two expanded file diffs can push the Apply warning and footer outside the visible modal. Scrolling over the diffs does not expose the footer; collapsing one diff does. Apply succeeded through that workaround, with exact file verification.

The correction replaces positional content rows with a scrollable review body between the header and footer. Semantic validation, conflict gates, explicit Apply selection and execution behavior are unchanged.

Local checks: strict application TypeScript; seven existing layout/accessibility/NodeCard/lifecycle/Apply suites; deterministic bundle parity; release-contract synchronization. All pass. **The corrected installed build has not yet been visually verified.** An attempted isolated browser fixture could not reach the local test server and is not counted as evidence.

Required installed retest: at 125% scale, keep at least two file diffs expanded; verify the warning and all diff contents are reachable and Cancel/Apply stay visible. Repeat with and without diagnostic differences, all three output modes, and keyboard traversal. Use disposable project copies.

## Remaining limits

A post-Apply external-change notification was observed without data mismatch; whether own writes unnecessarily trigger it remains unconfirmed. Rename/batch refactoring, invalid-value handling, ZIP/project-copy export, crash recovery and updater/installer acceptance were not rerun here. No release authorization follows from this report.

