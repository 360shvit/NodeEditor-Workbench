# Pre-1.0 Audit 03 — Accessibility & Keyboard Interaction

**Status:** PASS  
**Baseline:** audit branch derived from `v0.11.36-rc.3`  
**Gate:** `npm run test:pre1-accessibility-keyboard`

## Scope

This track reviews keyboard-only and assistive-technology semantics across the Workbench: tabs and tab panels, tab context menus, the Workbench rail, Quick Open combobox/listbox behavior, modal focus trapping and restoration, splitters, icon-only controls, visible focus, reduced motion, and Windows High Contrast / forced-colors behavior.

## Existing evidence

The existing `test:accessibility-interaction` contract already protects roving tab focus, tab/menu roles, context-menu keyboard navigation, modal focus traps, Escape handling, focus restoration, labelled dialogs, Quick Open combobox/listbox/option semantics, and packaged embedded equivalents. Track 01 additionally protects global focus-visible and reduced-motion CSS, while the shared WorkbenchSplitter exposes separator value semantics and Arrow/Home/End keyboard control.

## Finding 03-A — no Windows forced-colors contract

**Classification:** must-fix before 1.0 — remediated.

The application had explicit author colors and focus styling but no `@media (forced-colors: active)` adaptation. In Windows High Contrast mode, active/selected states that relied on backgrounds or box shadows could therefore lose a reliable visual distinction.

Remediation adds a focused forced-colors layer that keeps browser/system color adaptation enabled, renders focus and selected/current/toggle states with the system `Highlight` color, preserves splitter affordance with system colors, and keeps badges visibly bounded. Source and packaged CSS remain byte-identical.

## Finding 03-B — Workbench rail exposed navigation as toggle buttons

**Classification:** must-fix before 1.0 — remediated.

`RailButton` previously derived `aria-pressed` from the generic visual `active` state. That caused non-toggle actions and navigation targets such as Diagnostics, Changes, Layout, Project Graph and Settings to be exposed with toggle-button semantics.

Remediation separates visual state from accessibility state: actual toggles (sidebar visibility and Editing) explicitly use `aria-pressed`; active tool destinations use `aria-current="page"`; ordinary actions such as Settings expose neither toggle nor current-page semantics.

## Self-contained Pre-1.0 gate

`test:pre1-accessibility-keyboard` protects:

- source/package CSS parity and the forced-colors safety block;
- correct rail toggle versus navigation semantics;
- tablist/tab/tabpanel relationships and roving Arrow/Home/End navigation;
- keyboard-operable tab menus with Escape focus restoration;
- modal Tab trapping, Escape handling and previous-focus restoration;
- Quick Open combobox/listbox/option relationships and keyboard selection;
- splitter separator value semantics plus Arrow/Home/End operation;
- global focus-visible and reduced-motion coverage;
- roadmap/audit status for this track.

## CI evidence

The final preparation run `35224012465` passed the Track-03 gate, strict application TypeScript, release-contract/embedded parity, generated Windows runtime notices, and the complete registered regression matrix before committing the audited source/bundle state. The follow-up normal PR validation run `35224402028` (Validate Tauri Windows #117) then passed on commit `5b6e7225c16795d2de2a077666d1d65d6f03e6a2`, including the complete regression matrix, zero-unused-source gate, and locked native tests.

## Remaining manual acceptance

Static/source contracts cannot prove the exact narration produced by Windows Narrator or the final appearance of every WebView control under every user High Contrast palette. Track 18 must therefore include a short installed-build keyboard-only smoke plus Windows Narrator and High Contrast verification. This is manual acceptance evidence, not an unresolved source blocker.

## Conclusion

No unresolved Track-03 accessibility or keyboard blocker remains after the forced-colors and Workbench-rail semantic remediations.
