# Validation

**Applies to:** v0.11.35-r10.  
**Document type:** living documentation.

Validation is fail-closed: a green subset never waives a failed release-critical gate.

## Automated source gates

At minimum, current source validation covers:

- strict application TypeScript build;
- deterministic embedded-bundle parity;
- core/support typechecks;
- registered source/runtime regression suites;
- release-contract synchronization;
- release-surface allowlist checks;
- updater least-privilege and Stable/Preview publication contracts;
- transitive npm/Cargo dependency license-metadata inventory from the committed lockfiles;
- public-repository hygiene checks.

Run `npm ci`, `npm run build`, `npm run release:check`, `npm run bundle:check`, `npm run audit:third-party`, the registered regression matrix, and relevant release-surface tests before treating a source snapshot as a release candidate.

## Native Windows gates

On the pinned Windows owner toolchain, release candidates additionally require:

- `cargo check --locked`;
- `cargo test --locked`;
- raw release EXE build and manual application smoke;
- signed NSIS build for a real distribution candidate;
- release-surface staging/check;
- signature and SHA-256 evidence verification.

Manual smoke should cover project open/reopen, Explorer/Search, Project Graph, Layout/Visual tooling, staged-change review/discard, Settings, session/window persistence and normal close/restart behavior.

## Non-publishing release-candidate workflow

`.github/workflows/validate-release-candidate.yml` is a manually dispatched, protected-environment validation path. It is intentionally restricted to `main`, uses read-only repository permissions, requires the configured updater public key and protected updater signing secret, reruns the release-critical source/native gates, builds the installed NSIS distribution, stages `release/public/`, writes SHA-256 evidence and a full dependency/license metadata inventory, and uploads only a short-lived GitHub Actions artifact.

This workflow must never create or modify a GitHub Release, tag or rolling updater manifest. Its purpose is to prove the exact candidate build path before publication. The Actions artifact is validation evidence, not a public distribution channel.

Tauri updater signatures are cryptographically enforced by the installed updater client. Because the pinned Tauri CLI does not provide a standalone updater-signature verification command, the final candidate additionally requires an installed-client positive signature test and negative bad-signature test before public publication.

## Updater publication gates

The updater remains non-deployed while the committed public key is unconfigured or `publication.publishable=false`. A public update candidate additionally requires protected signing secrets, the real repository slug, channel-correct manifests, an immutable version tag and verification that staged changes appearing during download block the final install boundary.

## Third-party/license gate

`scripts/audit-third-party-inventory.mjs` derives the dependency inventory from the committed `package-lock.json` and `src-tauri/Cargo.lock`/`cargo metadata --locked` graph and fails when a resolved third-party package lacks declared license metadata. The generated inventory is evidence for review; it does not choose the project's own license and does not by itself prove that every license obligation or notice text has been satisfied. Final notice/policy review remains required before public release.

## Privacy/security expectations

Validation must not commit or emit private signing keys, tokens, local environment secrets, absolute personal paths, user project contents or generated build directories into the repository. Diagnostic/support behavior remains local-only unless explicitly changed by a future reviewed feature.
