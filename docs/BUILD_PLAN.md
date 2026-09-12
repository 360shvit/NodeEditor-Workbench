# Build and release model

**Applies to:** v0.11.35-r10.  
**Document type:** living documentation.

## Source build

The project pins Node and Rust toolchains. `package-lock.json` and `src-tauri/Cargo.lock` are committed and normal builds must use the locked graphs.

- `npm ci` installs the exact frontend/tooling dependency set.
- `npm run build` performs strict TypeScript checking and regenerates the deterministic embedded frontend.
- `cargo check/test/build --locked` prevents implicit Rust dependency resolution.
- `Build-Windows.cmd` produces a raw development/test executable.
- `Build-Windows-Installer.cmd` produces the supported NSIS installer.

`tools/windows/` contains reproducibility and signing-setup helpers. In particular, `tools/windows/Freeze-Windows-Dependencies.cmd` captures/verifies dependency locks, `tools/windows/Install-Windows-Installer-Tooling.cmd` prepares installer tooling, and `tools/windows/Generate-Updater-Signing-Key.cmd` creates the updater signing identity while keeping the private key outside the repository. These helpers are part of the public source because they document and enforce reproducible build inputs; private keys and passwords are deliberately stored outside the repository.

## Repository boundary

The public source repository contains source, tests, fixtures, CI configuration, release specifications and reproducible build tooling. It excludes internal engineering-history notes, private signing material, local environment files, generated build output, local logs and user project data.

## End-user publication boundary

`release/public/` is the only supported end-user publication surface. `npm run release:surface` stages an allowlisted set containing the signed NSIS installer/signature, SHA-256 evidence, third-party notices and channel-appropriate updater manifest(s). `npm run release:surface:check` rejects unknown files or directories.

Source ZIPs, tests, fixtures and developer tooling are never copied into the end-user release surface.

## Installer and updater

NSIS is the supported Windows end-user format. Raw `Build-Windows.cmd` output is development/test-only and automatic updates are disabled for non-installed builds.

Public updater publication remains blocked until all of the following are true:

- the real GitHub repository slug is configured;
- `src-tauri/updater.pubkey` contains the real public verification key;
- the protected release environment contains the private signing key/password;
- locked dependency validation and Windows native tests pass;
- `updater.publication.publishable=true` is set only for the final public candidate.

The private signing key must never be committed, packaged or logged.
