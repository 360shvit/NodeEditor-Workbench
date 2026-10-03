# Pre-1.0 Audit 15 — Build, CI & reproducibility

**Status:** IN REVIEW — source remediation and fresh local bootstrap/raw build completed; final PR CI and a protected non-publishing candidate of the changed packaging path remain required.
**Baseline:** `21e1977c2ac4672e952ebd12ab56d233a3a4a9c2` after PR #32.
**Review dates:** 2026-10-02–03.

## Reproduced findings and remediation

| Finding | Before / after and evidence |
|---|---|
| Failed refresh of protected main could be ignored | The release ancestry step ran `git fetch` followed by `git merge-base`, checking only the latter exit code. A command double returned fetch failure and ancestry success; the old step continued. It now checks the fetch result immediately, before consulting ancestry. The executable fixture covers fetch failure, ancestry failure and successful ancestry, including whether the second command ran. |
| Windows dependency bootstrap silently stopped after npm | Calling the Windows `npm.cmd` shim from another batch file without `call` transfers control instead of returning. A local successful npm stub reproduced the missing continuation. Both bootstrap npm invocations now use `call`; executable fixtures verify successful continuation and failure stopping for each invocation. The Cargo-lock evidence copy also checks its own result. |
| Stale installer relabeled as the current version | A fixture containing current and older installers, with a newer timestamp on the older file, reproduced successful staging of the wrong bytes under the current release name. Staging now requires Tauri's exact product/version/x64 filename and a regular file. The regression covers competing stale artifacts, missing current output, directory substitution and path ambiguity. Filename selection is not a substitute for signature verification or native build provenance. |
| Local installer diverged from CI staging/verification | The batch helper selected the newest file independently and parsed localized `certutil` output without a reliable hash-command failure gate. It now uses the shared canonical surface staging, surface check and cryptographic signature verification, checking each result before reporting success. Final local assets are under `release/public/`. |
| CLI pin accepted substrings or inherited state | The three Windows tooling helpers previously searched for the pin as a substring. They now clear inherited version state and compare the complete `tauri-cli <exact-version>` identity. Twelve executable shell fixtures cover exact, longer, prerelease-suffixed and missing versions. The signing helper was edited but never executed; no key was generated. |

`scripts/test-build-failure-paths.ps1` extracts the actual workflow, bootstrap and CLI identity command blocks. Its nineteen cases use local command doubles, without network requests, dependency installation, signing material or publication. They test command flow; the separate complete bootstrap execution is recorded below.

`test:pre1-build-ci` is registered in the normal regression matrix. It checks exact Node/Rust/CLI pins and alignment, npm root-lock consistency and integrity, the fixed Windows runner, locked builds, Action SHA pins, cache-write restrictions and non-publishing candidate permissions. On Windows it runs the shell fixtures. It also emits the embedded JavaScript twice into distinct output files and compares each byte-for-byte with the committed frontend, plus CSS parity. This proves repeatable frontend emission from the current installed dependency set; it does not claim a reproducible native executable or installer.

## Build boundaries reviewed

- Node is pinned by `.nvmrc`; Rust and the Windows MSVC target by `rust-toolchain.toml`. All three Windows workflows use `windows-2025` and the same Rust version. CLI installation uses an exact version with `--locked`.
- `package-lock.json` and `src-tauri/Cargo.lock` remain committed. CI uses `npm ci --ignore-scripts` and Cargo `--locked`; no dependency resolution or lock update was introduced.
- PR validation is read-only and does not receive signing secrets. Only protected main pushes can save the Rust cache. The dependency-approval `pull_request_target` workflow consumes GitHub metadata without checking out or running PR code.
- Candidate validation requires protected main and the `release` environment, has read-only repository permission and uploads only candidate evidence. Public publication remains a separate protected tag workflow. The ancestry fix strengthens its existing gate.
- The committed embedded frontend remains the desktop distribution. No browser/Vite path, portable packaging, QA variant or third release channel is introduced.

## Validation and limits of this pass

Direct local execution passed all **seven** Windows command-flow fixtures, the Track 14 release regression, validation-script link checks and `git diff --check`. The host reports the pinned Node `24.21.0` and Rust `1.98.1` versions. Launching PowerShell from Node was blocked by this host with `EPERM`; therefore the full new Node-orchestrated suite is not claimed as a local pass. Required Windows PR CI must execute that suite, both embedded emissions and the full regression/native matrix before integration.

[PR #33](https://github.com/360shvit/NodeEditor-Workbench/pull/33) subsequently passed [Windows validation](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/37055043650) on `8f0d254259e23355685d18279074b6d444da996a`: **88/88** suites, **250** soak cycles, **39/39** native tests, both embedded emissions and all seven original shell fixtures. Dependency Approval passed in [run 37055043561](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/37055043561). It merged as `91882a408403d50794dcb5ec5e98a3e4a270b79d`.

On 2026-10-03, a fresh clone of that merged commit started without `node_modules` and used a new empty Cargo target directory and npm cache. The corrected `Freeze-Windows-Dependencies.cmd` completed successfully: 11 npm packages installed, `cargo check --locked`, dependency-tree/metadata capture and Cargo-lock copy/hash. Existing Cargo registry downloads/toolchains were reused; this is not an offline or empty-registry rebuild. The actual `Build-Windows.cmd` then completed a fresh optimized raw executable in 4m 14s; it was not launched. MSVC setup was explicit via the installed Visual Studio developer environment.

| Local evidence | SHA-256 |
|---|---|
| npm lock, unchanged before/after | `71c8678215961370536a93331ea39553d42a5abfa825d68971ad27b7eaa8e773` |
| Cargo lock and captured copy, unchanged before/after | `b606d4df2827b9d9fec0a32f9491057eda3578f3a62c5b7a38ccf4cb44a46fd8` |
| Fresh raw development executable, metadata `0.11.36-rc.5` | `633ce17f8defcdf85af1f234d3b417a1cb77ed88bcf8e61228093b0284ed83eb` |

The follow-up passed all **19** shell fixtures, four direct installer-source cases, the reproduced stale-output case after correction, strict application TypeScript, installer/updater source contracts and validation links locally. The changed staging/check/signature commands also passed against the already published rc.5 installer, preserving SHA-256 `8af5f5e9e09bc3e5ec30850a36e1a1e87bcd9e0c56c0f523000fd4b2d3945eb4` and key ID `6fee5e670300baef`. These were local copies; public assets/feeds were untouched. This is not a new NSIS build. The deep release-sync suite could not launch its Node subprocess on this host and remains unverified locally; the protected candidate must cover it.

This change does not build or publish a new signed installer. The independently verified rc.5 candidate/publication and installed-client results remain in [the rc.5 evidence](UPDATER_E2E_RC5.md); they are prior build evidence, not an execution of the newly changed bootstrap helper.

## Reproduction boundary

- Local evidence used Node `24.21.0`, npm `11.19.0`, Rust/Cargo `1.98.1`, Visual Studio 2022, MSVC tools `14.44.35207` and Windows SDK `10.0.26100.0`.
- PR #33 ran on image `windows-2025-vs2026`, revision `20260925.250.1`. Its [image inventory](https://github.com/actions/runner-images/blob/win25-vs2026/20260925.250/images/windows/Windows2025-VS2026-Readme.md) reports Visual Studio Enterprise 2026 `18.10.12217.157` and SDK `10.0.26100.0`. The required `windows-2025` label remains unchanged; it selects a maintained image, not immutable VM bytes.
- The prior [rc.5 candidate](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/36611543925) used image `20260922.246.2`. Its logs record locked CLI `2.11.0`, bundler `2.9.0`, NSIS `3.11`, NSIS utility `0.5.3` and the exact product/version/x64 output name now required by staging.
- `downloadBootstrapper` retains the configured WebView2 prerequisite behavior. Runtime/bootstrap availability, SDK/linker/image revisions, native build paths and signature metadata remain external inputs. Dependency locks and deterministic frontend emission do not establish byte-identical Windows executables/installers across environments. Compare and retain hashes of the actual candidate and actual published artifact separately.
- The raw build evidence above predates only packaging/helper/test/documentation edits in this follow-up; application Rust/frontend and both dependency graphs are unchanged. Native execution, signing and installed-client acceptance remain separate evidence categories.

## Remaining Track 15 work

Integrate the packaging follow-up only after its required Windows PR checks pass. Then validate the exact merged commit with the protected, non-publishing candidate workflow: deep release-sync mutation tests, signed NSIS build, exact current-installer staging, surface/signature checks and artifact hashes. The existing release-environment review must be honored. A candidate run may validate the current source identity without publishing or overwriting any existing release/tag/feed. Only that evidence closes this track's changed packaging path; green source CI alone does not.

Track 14 remains independently BLOCKED on its outstanding installed-client cases and release controls. The successful rc.4-to-rc.5 update is retained; no repeat is required by this audit. GitHub cleanup remains the final Track 19 item.
