# Build and release model

**Applies to:** the current release contract.
**Document type:** living documentation.

## Source build

The project pins Node and Rust toolchains. `package-lock.json` and `src-tauri/Cargo.lock` are committed and normal builds must use the locked graphs.

- `npm ci --ignore-scripts` installs the exact frontend/tooling dependency set.
- `npm run build` performs strict TypeScript checking and regenerates the deterministic embedded frontend.
- `cargo check/test/build --locked` prevents implicit Rust dependency resolution.
- `Build-Windows.cmd` produces a raw development/test executable.
- `Build-Windows-Installer.cmd` produces the supported NSIS installer.

Local Windows builds require the pinned Node/Rust tools plus Visual Studio C++ build tools and a Windows SDK. Use an x64 Visual Studio developer environment when these tools are not already available to Cargo. The dependency bootstrap's npm batch calls must return to the helper before Cargo validation and evidence capture can run.

Native builds embed committed `tauri-ui/`; after frontend source edits, run `npm run build` and `npm run release:check` before packaging. The local installer helper generates notices, builds with the exact Tauri CLI, stages only the expected product/version/x64 installer, validates the allowlisted surface and verifies its updater signature. Its final output is `release/public/`, shared with CI; arbitrary newest-file selection and a separate local hash-generation path are not used.

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

## Reproducibility evidence

CI checks repeatable embedded JavaScript emission and exact CSS parity. Locked dependencies and pinned Node/Rust/CLI versions support rebuilding from known inputs. The `windows-2025` runner image is maintained over time; MSVC/SDK, NSIS tooling, WebView bootstrap behavior, paths and signature metadata also affect native outputs. Byte-identical Windows installers across different environments are not currently guaranteed. Record the source commit, runner image revision and actual artifact hashes for each candidate/publication; see `docs/audits/PRE_1_0_15_BUILD_CI.md` for measured evidence and the remaining gate.
