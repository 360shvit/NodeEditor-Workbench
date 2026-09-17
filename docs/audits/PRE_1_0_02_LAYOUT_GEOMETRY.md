# Pre-1.0 Audit 02 — Generator Layout Engine & Geometry

**Status:** PASS  
**Baseline:** audit branch derived from `v0.11.36-rc.3`  
**Gate:** `npm run test:pre1-layout-geometry`

## Scope

This track reviews the generator layout engine as a correctness subsystem rather than only its UI. The reviewed surface includes geometry primitives, metadata snapshotting, strategy dispatch, Author Normalize, DAG Rebuild, Author Grid, edge-corridor safety, floater handling, block reasons, staging/apply behavior, deterministic output, numeric bounds, and the historical real-project golden baseline.

Primary implementation areas:

- `src/core/layout/geometry.ts`
- `src/core/layout/snapshot.ts`
- `src/core/layout/readerV2.ts`
- `src/core/layout/normalize.ts`
- `src/core/layout/treeNormalize.ts`
- `src/core/layout/authorGrid.ts`
- `src/core/layout/edgeCorridor.ts`
- `src/core/layout/safety.ts`
- `src/core/layout/stage.ts`
- `src/core/layout/strategy.ts`
- editor metadata consumed by layout generation
- the Layout sidebar settings boundary

## Existing evidence

The project already had substantial layout evidence before this audit. `test:core` exercises layout parsing, geometry resolution, Normalize, Author Normalize, DAG Rebuild branch directions, groups/comments, gap propagation, Reader v2 semantic edge classification, routing/overlap safety, staging/apply and several author-grid/corridor invariants. `scripts/test-real-layout.mjs` additionally contains strong real-project assertions for spacing effects, floaters, Atlantis Dense routing, overlap removal and persisted staged metadata.

The historical `test:layout-baseline` is a true golden-output check, but it is intentionally external: `compare-layout-baseline.mjs` requires a fixture-root argument and the repository only stores SHA-256 identities plus expected proposal hashes for two Atlantis fixtures. The two source fixture files are not committed. That makes the baseline useful manual/acceptance evidence, but not a self-contained normal CI gate.

## Finding 02-A — unbounded numeric layout settings

**Classification:** must-fix before 1.0 — remediated.

The Layout UI rejected negative/non-finite direct input but had no upper bound. The core API also trusted `horizontalGap`, `verticalGap` and `alignmentTolerance`. Several layout passes round through `Math.round(value * 1000) / 1000`; an extremely large but still finite input can therefore overflow during arithmetic and eventually become a non-finite patch value. Serializing such a number to JSON can silently turn it into `null`.

Remediation:

- `MAX_LAYOUT_SETTING` provides a deliberately generous ceiling far above normal presets.
- `validateLayoutEngineSettings` runs in the shared strategy envelope, so direct/core callers cannot bypass the UI.
- the three numeric sidebar controls expose the same ceiling and clamp interactive input.
- the shared proposal envelope checks every numeric old/new patch scalar before a proposal can leave the engine.

The core rejects invalid values rather than silently changing an out-of-contract API request.

## Finding 02-B — editor metadata accepted unsafe node coordinates

**Classification:** must-fix before 1.0 — remediated.

Group/comment metadata already required finite numeric values, but node `$Position` previously accepted any JavaScript number. JSON such as an extreme exponent can parse to a non-finite number, and very large finite coordinates can make later relative geometry unsafe.

Remediation:

- editor-layout scalars now pass through one bounded finite-number helper.
- node positions and group/comment position/size metadata use the same safe scalar boundary.
- out-of-range metadata is treated as unsupported/unpositioned rather than entering geometry arithmetic.
- a second output boundary rejects translated results that leave the safe editor range even when both original endpoints were individually valid.

## Self-contained Pre-1.0 gate

`test:pre1-layout-geometry` adds current-source evidence without requiring proprietary or local fixture data. It verifies:

- rectangle containment/overlap/union and canonical pair behavior, including negative coordinates and touching edges;
- stable safety block reasons;
- deterministic proposal content for Normalize, Author Normalize and DAG Rebuild, excluding only the intentional `createdAt` timestamp;
- zero live-node overlaps on a representative synthetic fork fixture;
- finite/bounded generated numeric patch values;
- Normalize root-to-origin persistence through stage/apply;
- DAG spacing settings affecting actual node targets;
- rejection of negative, non-finite and over-limit engine settings;
- rejection of unsafe persisted editor positions;
- fail-closed rejection when a translation would generate an out-of-range patch;
- preservation of the two-fixture/eight-case historical v0.7.2 golden manifest and its explicitly external runner contract;
- UI numeric controls remaining tied to the core setting ceiling.

## Remaining limits / follow-up

The real Atlantis golden and `test-real-layout.mjs` still require an external HytaleGenerator fixture root. They should remain manual/RC evidence unless redistributable sanitized fixtures are deliberately created; this audit does not copy third-party/private project data into the public repository.

`overlapPairs` is intentionally straightforward pairwise geometry. Its large-N CPU behavior belongs to Track 11 (Performance & scalability), not this correctness track. Likewise, visual presentation of layout results is covered by Track 01/03 while this track focuses on geometry and safe proposal generation.

## Conclusion

No unresolved Track-02 correctness blocker remains after the numeric-boundary remediation. The layout engine now has a self-contained current-source gate in addition to its older extensive core tests and external real-project/golden evidence.
