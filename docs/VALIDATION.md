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
- public-repository hygiene checks.

Run `npm ci`, `npm run build`, `npm run release:check`, `npm run bundle:check`, the registered regression matrix, and relevant release-surface tests before treating a source snapshot as a release candidate.

## Native Windows gates

On the pinned Windows owner toolchain, release candidates additionally require:

- `cargo check --locked`;
- `cargo test --locked`;
- raw release EXE build and manual application smoke;
- signed NSIS build for a real distribution candidate;
- release-surface staging/check;
- signature and SHA-256 evidence verification.

Manual smoke should cover project open/reopen, Explorer/Search, Project Graph, Layout/Visual tooling, staged-change review/discard, Settings, session/window persistence and normal close/restart behavior.

## Updater publication gates

The updater remains non-deployed while the committed public key is unconfigured or `publication.publishable=false`. A public update candidate additionally requires protected signing secrets, the real repository slug, channel-correct manifests, an immutable version tag and verification that staged changes appearing during download block the final install boundary.

## Privacy/security expectations

Validation must not commit or emit private signing keys, tokens, local environment secrets, absolute personal paths, user project contents or generated build directories into the repository. Diagnostic/support behavior remains local-only unless explicitly changed by a future reviewed feature.
