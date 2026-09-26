# Pre-1.0 Audit 01 — UI, CSS & Workbench Layout Integrity

**Baseline:** `v0.11.36-rc.3` / `8cda1880747b5f1358acc4f03dd2437c756afee8`  
**Result:** **PASS — no unresolved 1.0 blocker found in this track**  
**Scope:** global stylesheet, packaged stylesheet parity, Workbench shell, sidebar/split layout, UI Scale/DPI reflow, pane-responsive content, dialogs/overlays, keyboard-visible focus, reduced motion, and the source contracts that protect them.

## Evidence reviewed

- `src/styles.css` and committed `tauri-ui/styles.css`.
- `src/App.tsx`, `src/components/WorkbenchSplitter.tsx`, `src/workbench/workbenchLayoutPreferences.ts`.
- Modal/focus users covered by `src/workbench/modalFocus.ts` and the current dialog components.
- Existing regression contracts: `test:workbench-layout`, `test:split-workview`, `test:settings-appearance`, `test:ux-scaling-reflow`, `test:workbench-ux-consistency`, `test:accessibility-interaction`, `test:ux-consistency-pass`, and embedded-bundle parity.
- Current known UI limits: UI Scale 80/90/100/110/125%, sidebar 220–520 px and split ratio 25–75%.

## Findings

### 1. Source/package stylesheet parity is fail-closed — PASS

The installed desktop frontend ships committed `tauri-ui/styles.css`, not an independently rebuilt CSS asset at runtime. Existing tests require byte-for-byte equality with `src/styles.css`, and the new Pre-1.0 contract keeps that requirement explicit. This prevents a source-only UI fix from silently missing the packaged app.

### 2. Legacy desktop minimum-width clipping is neutralized late in the cascade — PASS

The stylesheet still contains historical desktop-first rules such as the early `body` minimum width. The current hardening block deliberately overrides this with `html, body, #root { min-width: 0; }` / `body { min-width: 0; }` after the legacy rule. This matters at Windows DPI scaling and Workbench UI Scale 125%, where a fixed CSS-pixel minimum would otherwise create avoidable clipping.

### 3. Main Workbench layout preserves shrinkable work areas — PASS

The current shell uses `minmax(0, 1fr)` for the content region and clamps the persisted sidebar width against the effective viewport. The collapsed-sidebar path removes the unused sidebar/splitter columns. These patterns protect against the common CSS-grid failure where long child content forces the entire desktop shell wider than the WebView.

### 4. Split panes and feature content use pane/container reflow — PASS

The current CSS uses named inline-size containers for Workbench panes. Inspector/field content and WorldGen Performance have pane-based breakpoints rather than relying only on global viewport width. This is necessary because either side of split view can become narrow while the outer application window remains large.

### 5. Sidebar and splitters have bounded, keyboard-operable geometry — PASS

Sidebar width is clamped to the documented 220–520 px range. Split ratios are bounded. `WorkbenchSplitter` exposes separator semantics, current/min/max values, keyboard arrows plus Home/End, and pointer capture. Persistence happens on commit rather than every drag sample.

### 6. Focus visibility, modal focus management and reduced motion are present — PASS

Interactive controls have `:focus-visible` treatment, modal surfaces use the shared focus trap/restore helper, and the stylesheet includes `prefers-reduced-motion: reduce` behavior. Existing accessibility regression coverage protects tabs, menus, quick-open combobox behavior and modal semantics.

### 7. Packaged UI still needs stronger computed/visual evidence — HARDENING

Most current UI regressions are deterministic source-contract assertions. They are good at proving that required selectors, roles and responsive rules still exist, but they do not prove final **computed** layout after the full cascade in a real WebView. There is currently no self-contained screenshot/computed-layout golden matrix covering representative window sizes, DPI/UI Scale combinations and split-pane widths.

This is **not** classified as a blocker because the installed rc.3 path has already been exercised and the source contracts are broad, but final 1.0 acceptance should include a real-render matrix. That evidence belongs in the final acceptance track unless a reliable headless WebView harness is introduced earlier.

### 8. The global stylesheet is a maintainability risk, not a current functional blocker — HARDENING

`src/styles.css` is a large, historical, append-oriented stylesheet (about 159 KiB on this baseline) with multiple milestone override sections. The late-override strategy is intentional and currently tested, but it increases cascade/order risk and makes broad cleanup dangerous.

Do **not** split/refactor the stylesheet merely for aesthetics before stronger computed/visual regression coverage exists. If modularization is done before 1.0, preserve emitted ordering exactly and prove packaged parity plus representative rendered states.

### 9. Generator layout algorithm is intentionally out of this track

The visual Workbench shell and CSS layout are distinct from the generator layout/geometry engine in `src/core/layout`. The repository already contains `scripts/compare-layout-baseline.mjs`, but it requires an external fixture root and is excluded from the normal regression matrix. That is the primary subject of Audit Track 02.

## Durable gate added

`test:pre1-ui-css-layout` consolidates the 1.0-critical invariants for this track. It is intentionally a `test:*` script so the existing regression matrix auto-discovers it. It does not replace the older milestone tests; it gives the Pre-1.0 review one stable top-level contract while the historical tests continue protecting their narrower regressions.

## Exit decision

Track 01 is **PASS**. No CSS/layout remediation is required before moving to Track 02. The two hardening items above remain visible in the roadmap and final acceptance criteria rather than being silently treated as solved.
