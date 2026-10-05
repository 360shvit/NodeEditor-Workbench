# Pre-1.0 Audit 17 — Repository hygiene and documentation

**Status:** IN REVIEW — source review complete; final required Windows CI pending.
**Baseline:** `c350ca6817aac94a21d4b999f79b9e097c7d84ca` after PR #36.
**Review date:** 2026-10-04.

## Findings and changes

Living product/architecture/known-limits documents still declared the v0.11.35 line, described the updater as unconfigured or treated the successful installed update as unverified. They now apply to the current release contract, describe the active Preview path and link the recorded rc.5 evidence. Successful installation is distinguished from the unrun manipulation test. Historical changelog and audit baselines remain historical evidence.

The `rN` label is described as an internal artifact/source revision; it does not introduce a third product/channel. Stable and Preview remain the only channels. Existing `publication.publishable=true` does not authorize another publication of rc.5 or a Stable release.

The new hygiene gate uses Git's tracked-file index to reject build output, logs, local settings, secret-like file paths and deliberately removed historical content. Ignored local build directories are not public-source violations. It validates relative Markdown file links and keeps living-document applicability tied to the release contract. Mutation fixtures demonstrate rejection of generated files, missing links and links escaping the source tree.

## Retained source and maintenance debt

- Both dependency locks, embedded `tauri-ui` output, Windows helpers and current public audit evidence remain required source. Embedded emission/parity gates continue to protect the committed frontend.
- Existing historical regression files protect retained invariants; their old filenames are not dead code or restored internal reports. The registered matrix and cross-test link audit continue to cover them.
- Unused carry is zero across 105 TypeScript/TSX files. Local Track 04 review finds 192 runtime edges, no runtime cycle or layer violation, and the one documented type-only persistence/store cycle.
- `src/store.ts` (82,796 bytes) and `src/App.tsx` (21,863 bytes) remain within existing 100/32 KB guards. Their bounded refactoring debt is documented in [Track 04](PRE_1_0_04_FRONTEND_ARCHITECTURE.md).
- `src-tauri/src/main.rs` is a large authority/transaction module (176,378 bytes, including native tests). Future extraction must preserve shared locks, opaque grants, transaction recovery and updater authority; a cosmetic pre-release split is not justified by the size alone.
- UNIC maintenance advisories, unknown Preact lineage and outstanding installer component notices remain [Track 16](PRE_1_0_16_DEPENDENCIES_NOTICES.md) work, not hidden hygiene exceptions.

## Validation boundary

Local unused-carry and architecture audits passed. Local hygiene/security scripts reached an environment restriction when Node tried to start Git (`spawnSync git EPERM`); that is not reported as a pass. Windows CI must run the new hygiene gate, existing tracked-secret scan, release/embedded parity, full registered matrix and locked native tests on this PR before integration.

No project/runtime behavior, version, signing key, runner, action pin, public release asset or local user project is changed by the documentation/hygiene audit. GitHub deletion remains deferred to Track 19 after acceptance.
