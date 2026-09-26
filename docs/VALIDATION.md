# Validation

**Applies to:** the current release contract.  
**Document type:** living documentation.

Validation is fail-closed: a green subset never waives a failed release-critical gate.

## Validation tiers

Normal pull-request and `main` validation is the fast feedback tier. It checks release-contract synchronization and embedded-bundle parity, updater/GitHub integration contracts, validation-script link integrity, strict application TypeScript, third-party/license metadata and notices, all registered self-contained regression suites, unused source carry, and native Rust tests.

The regression matrix is intentionally broad but lightweight. It auto-discovers the registered `test:*` package scripts except the explicit external layout-baseline command and the matrix itself. Historical source/runtime regressions remain in the normal tier because, after shared core compilation was introduced, the complete 73-suite matrix measured about 29 seconds on the pinned Windows runner. Removing individual sub-second historical regressions would save little while weakening coverage.

Release-candidate validation is the deep build tier. In addition to the normal release-critical gates it executes the isolated release-integrity mutation/roundtrip suite, builds third-party evidence, runs native tests, installs the pinned Tauri CLI, builds the signed installed NSIS distribution, stages `release/public/`, records hashes, and uploads short-lived candidate evidence. The expensive isolated release-sync mutation suite deliberately does **not** run in normal PR validation.

Publication validation retains the same deep release-integrity boundary and adds tag/publication/channel checks. Publication remains a separate explicit action; a successful source or RC validation does not publish anything by itself.

## Regression-suite policy

The validation audit established these maintenance rules:

- Historical tests protect the behavior or fix baseline they introduced; they must not require the current release to equal an old exact SemVer. Minimum fix baselines and invariant comparisons are preferred.
- Active test-to-test references are checked so moving or deleting a referenced regression cannot silently leave a stale contract behind. Negative assertions that deliberately name retired files are not treated as active dependencies.
- The matrix builds `tsconfig.core.json` once and reuses `.core-build` for suites that consume the same emitted core. Standalone `npm run test:*` commands remain self-contained for local use.
- The small set of npm wrappers bypassed by the shared-core optimization is checked fail-closed. If one gains additional work, validation fails until the matrix contract is reviewed.
- Expensive mutation/build/install behavior belongs to RC/publish gates when an equivalent fast invariant can protect normal PRs. Cheap source/runtime regressions stay in the normal tier unless a concrete redundancy is demonstrated.
- Timing remains visible in the matrix output so gate placement decisions can be based on measured cost rather than assumptions.

The registered suites fall into five retained coverage families: core/runtime behavior; desktop shell, UX and source contracts; performance/indexing/logging regressions; security/updater/installer/release contracts; and repository hygiene plus historical CI/build regressions. Some families intentionally overlap at boundaries—for example updater integration also checks release workflow permissions and action pinning—but these checks are cheap and protect different failure modes, so overlap alone is not a reason to delete them.

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

Tauri updater signatures are cryptographically enforced by the installed updater client. RC/publish workflows additionally run `node scripts/verify-updater-signature.mjs` against the staged installer, signature and committed public key, verifying the payload and trusted-comment signatures. This uses Node's cryptographic primitives and public Minisign verification fixtures without creating a private key. The final candidate still requires installed-client positive signature and negative bad-signature tests before public publication; pipeline verification does not prove installer launch/restart behavior. The current Track 14 evidence and unrun matrix are in `docs/audits/PRE_1_0_14_UPDATER_RELEASE.md`.

## Updater publication gates

The updater remains non-deployed while the committed public key is unconfigured or `publication.publishable=false`. A public update candidate additionally requires protected signing secrets, the real repository slug, channel-correct manifests, an immutable version tag and verification that staged changes appearing during download block the final install boundary.

## Third-party/license gate

`scripts/audit-third-party-inventory.mjs` derives the dependency inventory from the committed `package-lock.json` and `src-tauri/Cargo.lock`/`cargo metadata --locked` graph and fails when a resolved third-party package lacks declared license metadata. Distribution classification and notice generation add the Windows-runtime legal-material checks used for the installer. These compliance gates are retained; optimization should reuse already-derived dependency evidence rather than weaken or skip the checks.

## Privacy/security expectations

Validation must not commit or emit private signing keys, tokens, local environment secrets, absolute personal paths, user project contents or generated build directories into the repository. Diagnostic/support behavior remains local-only unless explicitly changed by a future reviewed feature.
