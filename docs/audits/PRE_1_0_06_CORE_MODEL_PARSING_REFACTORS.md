# Pre-1.0 Audit 06 — Core Model, Parsing, References & Refactors

**Status:** PASS  
**Scope:** parser, JSON-path identity, project model, symbol/search/reference indexes, scalar patching, validation diffs and rename/refactor invariants.

## Exit decision

Track 06 has no unresolved 1.0 blocker. The audit found and remediated four trust-boundary issues in internal identity/refactor handling, then exercised the corrected behavior through the normal registered regression matrix.

The durable gate is `test:pre1-core-model-refactor` (`npm run typecheck:core && node scripts/test-pre1-core-model-refactor.mjs`). It is a normal `test:*` script and is therefore discovered by the existing RC regression-matrix runner.

Final focused validator evidence: GitHub Actions run `35238861123` completed successfully. Its Track 06 core gate, committed embedded-frontend synchronization, release-contract parity, notice prerequisite and complete registered regression matrix all passed before the temporary validator removed itself.

## Reviewed invariants

- JSON-path identity must distinguish object keys from nested segments and array indices, including punctuation, quotes, backslashes and Unicode.
- Scalar patching must update only the exact indexed JSON path, preserve surrounding source formatting where possible and reject stale-source changes before apply.
- Symbol identity must remain collision-free even when `symbolType` or symbol names contain delimiter characters.
- Refactor-rule and generic field-match identities must not alias when user/model strings contain punctuation used by historical string concatenation.
- Rename must update the intended definition/references only and must not allow an empty/whitespace-only target that can disappear from rebuilt indexes.
- Diagnostic diffs must treat a severity escalation such as warning -> error as a newly introduced error.
- Malformed files must remain isolated, emit explicit parse diagnostics and must not poison valid files in the same project model.
- Duplicate explicit `$NodeId` values inside the same node location (`live` or `floating`) are ambiguous for indexes/refactors and must fail closed instead of silently dropping one node. The same raw ID once in `live` and once in `floating` remains a valid distinct identity.

## Findings and remediation

### Finding 06-A — delimiter-based symbol/field/refactor identities

**Classification:** must-fix before 1.0 — remediated.

Several opaque internal identities were built with delimiter concatenation. Because node-kind suffixes, field names and symbol names are not constrained to exclude those delimiters, distinct tuples could alias.

Remediation:

- symbol keys now serialize the structural tuple `[symbolType, name]`;
- generic field-match keys use structural tuple serialization for literal/field identity;
- symbol rename rule IDs use structural tuple serialization rather than delimiter concatenation.

The regression constructs adversarial pairs such as `("A::B", "C")` vs `("A", "B::C")`, verifies independent definitions/references and performs independent rename roundtrips.

### Finding 06-B — validation diff ignored severity

**Classification:** must-fix before 1.0 — remediated.

The diagnostic comparison key did not include `severity` and was delimiter-based. A diagnostic that escalated from warning/info to error could therefore be classified as unchanged, undermining the refactor safety result.

Remediation: diagnostic identity is now a structural serialized tuple including code, severity, file/node identity, optional symbol tuple and message. The gate proves warning -> error yields an added error and that delimiter-bearing diagnostic fields cannot alias.

### Finding 06-C — blank symbol rename target

**Classification:** must-fix before 1.0 — remediated.

Core rename accepted whitespace-only target names. Since symbol extraction intentionally ignores empty names, a refactor could patch definition/references and then make the renamed symbol disappear from the rebuilt index without a reliable semantic failure.

Remediation: `renameSymbol` rejects targets whose trimmed value is empty. This check lives in the core rather than relying on UI validation.

### Finding 06-D — duplicate `$NodeId` silently deduplicated

**Classification:** must-fix before 1.0 — remediated.

The parser previously used a `seen` set and silently kept the first node when the same explicit `$NodeId` occurred twice in the same location. That could make symbol/reference/refactor indexes present an incomplete model as if it were unambiguous.

Remediation: a repeated node identity within the same location now makes that file fail closed with an explicit parse/model error. The ambiguous file contributes no nodes/symbols. The location remains part of identity, so the same raw ID may still occur once in `live` and once in `floating`.

## Existing protections revalidated

The audit also revalidated protections that were already structurally sound: `jsonPathKey` uses structural serialization; scalar spans are path-keyed; stale expected values cause patch rejection; malformed JSON is isolated per file; semantic-reference resolution is rebuilt from the resulting project model rather than blindly trusting raw strings.

## Accepted limits / follow-up

This track does not attempt to redefine Hytale's semantic schema or decide which future node kinds are valid. Unknown-but-well-formed scalar fields remain intentionally representable. Native filesystem authority, symlink/reparse containment and command authorization are not owned by this track and continue in Track 07.

## Result

**PASS.** The core now has collision-safe opaque identities, severity-aware validation diffs, fail-closed ambiguous node handling and a repeatable adversarial parser/refactor roundtrip gate. No unresolved Track 06 blocker remains.
