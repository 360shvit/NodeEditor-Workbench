# Pre-1.0 Audit 04 — Frontend Architecture & Component Boundaries

**Status:** PASS  
**Baseline:** audit branch derived from `v0.11.36-rc.3`  
**Gate:** `npm run test:pre1-frontend-architecture`

## Scope

This track reviews the React/application-layer dependency graph, composition-root ownership, Zustand/store coupling, feature/component layering, command-registry ownership, error-boundary placement, import cycles, hidden ownership, and oversized-module risk.

## Architecture observed

The frontend has a recognizable layering model rather than an undifferentiated component tree. `src/core` owns application-independent model/search/layout logic; `src/io`, `src/projects`, `src/support`, and `src/workbench` provide application services; `src/store.ts` coordinates mutable application state; `src/components` and `src/features` render product surfaces; `src/App.tsx` composes those surfaces and desktop/runtime orchestration; and `src/main.tsx` owns process-level React bootstrap and the fatal error boundary.

The command registry remains metadata/shortcut focused and does not own Zustand or UI components. `App` is the command execution composition point, which keeps the registry reusable and avoids a command module becoming a hidden service locator.

## Dependency/cycle review

The Track-04 gate walks all committed TypeScript/TSX sources under `src`, resolves relative imports, builds an import graph, and fails on cycles. It also enforces the following directionality invariants:

- `src/core/**` may not depend on application/UI source outside `src/core`;
- `src/commands/**` may not acquire store or UI ownership;
- `src/store.ts` may not import presentation/feature components;
- `src/App.tsx` remains a composition root and may only be imported by `src/main.tsx`;
- the root bootstrap must retain the global `AppErrorBoundary` around the project lifecycle provider and app.

No unresolved cycle or layer-direction blocker was found on the audited source line.

## Finding 04-A — Store is an oversized shared coordination module

**Classification:** hardening / maintainability debt — accepted for the 1.0 line with an anti-growth guard.

`src/store.ts` is roughly 83 KB and owns a broad set of workbench tab, navigation, filter, graph, layout and project-state actions/types. That makes it an important coupling hotspot and increases the cost of future changes, even though its current dependency direction remains sane: the store depends on core/application services rather than React presentation modules.

A forced store split during a release-readiness audit would create a large behavioral migration with little direct user benefit. Track 04 therefore records the monolith explicitly and adds a temporary 100 KB anti-growth ceiling. Future architecture work should peel cohesive state domains behind stable selectors/actions instead of allowing the root store to grow indefinitely. This is not a 1.0 blocker because the existing strict TypeScript, state regressions, project lifecycle tests and zero-unused-source gate already exercise the current implementation.

## Finding 04-B — App is a broad orchestration composition root

**Classification:** hardening / maintainability debt — accepted for the 1.0 line with an anti-growth guard.

`src/App.tsx` is about 21 KB and combines root composition with command dispatch, split/sidebar layout persistence, UI scale orchestration and desktop file-watcher reload handling. Those responsibilities are coherent at the application shell level but represent a future pressure point if more services are added directly to `App`.

Track 04 keeps `App` as the explicit composition root instead of extracting behavior purely to satisfy a size metric. The gate prevents other modules from importing `App` and applies a temporary 32 KB anti-growth ceiling. Future growth should move desktop watcher coordination or shell-preference controllers into dedicated hooks/services while keeping dependency injection at the root.

## Error-boundary ownership

`src/main.tsx` wraps the lifecycle provider and `App` in `AppErrorBoundary`. The boundary records the React component stack into runtime diagnostics and offers reload plus a diagnostic-report action. That process-level placement is appropriate for the fatal boundary; feature-specific recoverable error UX is reviewed separately under Track 13.

## Command ownership

`src/commands/commandRegistry.ts` owns command identifiers, labels, shortcuts, preference persistence and key-event matching. It does not import Zustand, components or feature modules. Command execution remains supplied by the application composition layer. This avoids circular command/store ownership and keeps Quick Open/settings consumers dependent on command metadata rather than on the whole application shell.

## Self-contained Pre-1.0 gate

`test:pre1-frontend-architecture` protects:

- the relative TypeScript/TSX import graph against cycles;
- core isolation from application/UI layers;
- command-registry independence from store/components/features;
- presentation independence of the root Zustand store;
- `App` composition-root ownership;
- fatal React error-boundary placement and runtime-error reporting;
- temporary anti-growth ceilings for the two known orchestration monoliths;
- roadmap/audit status for this track.

## Conclusion

No unresolved Track-04 frontend-architecture blocker remains. The two largest coupling hotspots are explicitly documented as hardening debt and now have durable anti-regression boundaries, without introducing a risky behavior-preserving refactor solely for pre-1.0 cosmetics.
