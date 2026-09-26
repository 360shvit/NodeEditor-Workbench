# Hytale Generator Workbench

Current source line: **v0.11.36-rc.4-r1 — Audited Updater Preview**.

Hytale Generator Workbench is a local-first Windows desktop workbench for Hytale generator JSON projects. The native Rust host owns privileged filesystem and updater operations; the React/Core layer provides Explorer, Inspector, Search, staged ChangeSet review, Layout, Project Graph, WorldGen Performance, diagnostics and project-session UX.

## Documentation

- `docs/PRODUCT_GUIDE.md` — current workflows and behavior
- `docs/ARCHITECTURE.md` — architecture and authority boundaries
- `docs/KNOWN_LIMITS.md` — explicit current limits
- `docs/BUILD_PLAN.md` — local build and release model
- `docs/VALIDATION.md` — validation strategy and release gates
- `docs/CHANGELOG.md` — product/source-line change history
- `release-spec/README.md` — canonical release/updater contract

The public repository intentionally contains the source, tests, CI configuration and reproducible build/release helpers required to verify the project. It intentionally excludes private signing material, local environment files, generated build output, logs, local project data and internal engineering-history documents.

## Deterministic shipped frontend

Tauri ships the committed `tauri-ui/app.js`. The artifact is generated deterministically from current TS/TSX source:

- `npm run bundle:embedded` regenerates the embedded application bundle and synchronizes CSS;
- `npm run bundle:check` independently re-emits and requires byte-for-byte equality;
- `npm run release:sync` synchronizes release identity and regenerates the embedded bundle;
- `npm run release:check` validates all release mirrors and bundle parity without mutation.

Hand-patching `tauri-ui/app.js` is not a supported release step.

## Windows builds

The repository pins Node and Rust toolchains and commits `package-lock.json` plus `src-tauri/Cargo.lock`. Normal validation uses `npm ci` and Cargo `--locked`.

- `Build-Windows.cmd` builds a raw development/test executable.
- `Build-Windows-Installer.cmd` builds the supported Windows Installer (NSIS) for end users.
- `Test-Windows-Safety.cmd` runs native safety tests.
- `tools/windows/` contains reproducibility/signing-setup helpers; these scripts contain no private signing material.

Generated output such as `node_modules/`, Cargo targets, `build/`, `release/` and local signing secrets must not be committed.

## Release identity and updater

`release-spec/release-contract.json` is the canonical release identity and publication-policy source. `version.semver` is the public updater ordering identity; the `rN` suffix is an internal QA/source-snapshot label.

The v0.11.35 line contains the native Tauri v2 updater integration. Update checks and installation authority stay in Rust, Stable and Preview use separate manifests, signed packages are verified before install, and pending project changes are rechecked immediately before installation. Raw/development builds do not self-update.

Public publication remains fail-closed until the real GitHub repository slug, updater public key, protected signing secrets and `publication.publishable=true` are configured. The private updater signing key must never enter the repository.

## Repository vs end-user release surface

The source repository is intentionally broader than the end-user payload. `npm run release:surface` creates the allowlisted `release/public/` distribution set. GitHub release publication is permitted to upload only that generated surface, not source, tests, fixtures or developer tooling.

NSIS is the supported Windows end-user artifact. The former portable packaging path and browser/Vite development path are intentionally absent.
