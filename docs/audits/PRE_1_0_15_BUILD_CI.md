# Pre-1.0 Audit 15 — Build, CI & reproducibility

**Status:** PASS — source remediation, required PR CI, fresh local bootstrap/raw build and protected signed candidate verification completed. Native bit-for-bit reproducibility is not claimed; Track 14 release blockers remain open.
**Baseline:** `21e1977c2ac4672e952ebd12ab56d233a3a4a9c2` after PR #32.
**Validated packaging commit:** `d9640c5268008c89abe835c0c769e9276b9e9346` after PR #34.
**Review dates:** 2026-10-02–04.

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

Initial direct local execution passed all **seven** Windows command-flow fixtures, the Track 14 release regression, validation-script link checks and `git diff --check`. The host reports the pinned Node `24.21.0` and Rust `1.98.1` versions. Launching PowerShell from Node was blocked by this host with `EPERM`; therefore the full new Node-orchestrated suite is not claimed as a local pass. Required Windows PR CI subsequently executed that suite, both embedded emissions and the full regression/native matrix before integration.

[PR #33](https://github.com/360shvit/NodeEditor-Workbench/pull/33) subsequently passed [Windows validation](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/37055043650) on `8f0d254259e23355685d18279074b6d444da996a`: **88/88** suites, **250** soak cycles, **39/39** native tests, both embedded emissions and all seven original shell fixtures. Dependency Approval passed in [run 37055043561](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/37055043561). It merged as `91882a408403d50794dcb5ec5e98a3e4a270b79d`.

On 2026-10-03, a fresh clone of that merged commit started without `node_modules` and used a new empty Cargo target directory and npm cache. The corrected `Freeze-Windows-Dependencies.cmd` completed successfully: 11 npm packages installed, `cargo check --locked`, dependency-tree/metadata capture and Cargo-lock copy/hash. Existing Cargo registry downloads/toolchains were reused; this is not an offline or empty-registry rebuild. The actual `Build-Windows.cmd` then completed a fresh optimized raw executable in 4m 14s; it was not launched. MSVC setup was explicit via the installed Visual Studio developer environment.

| Local evidence | SHA-256 |
|---|---|
| npm lock, unchanged before/after | `71c8678215961370536a93331ea39553d42a5abfa825d68971ad27b7eaa8e773` |
| Cargo lock and captured copy, unchanged before/after | `b606d4df2827b9d9fec0a32f9491057eda3578f3a62c5b7a38ccf4cb44a46fd8` |
| Fresh raw development executable, metadata `0.11.36-rc.5` | `633ce17f8defcdf85af1f234d3b417a1cb77ed88bcf8e61228093b0284ed83eb` |

The follow-up passed all **19** shell fixtures, four direct installer-source cases, the reproduced stale-output case after correction, strict application TypeScript, installer/updater source contracts and validation links locally. The changed staging/check/signature commands also passed against the already published rc.5 installer, preserving SHA-256 `8af5f5e9e09bc3e5ec30850a36e1a1e87bcd9e0c56c0f523000fd4b2d3945eb4` and key ID `6fee5e670300baef`. These were local copies; public assets/feeds were untouched. This is not a new NSIS build. The deep release-sync suite could not launch its Node subprocess on this host and remains unverified locally; it passed in the protected candidate below.

[PR #34](https://github.com/360shvit/NodeEditor-Workbench/pull/34) passed [Windows validation](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/37120110003) and [Dependency Approval](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/37120109994) on `a0616a485cd4ff7efbf1662be8fad33fa6544960`. Validation covered **88/88** suites, **250** soak cycles, **39/39** native tests, all **19** shell cases and both embedded emissions. It merged as `d9640c5268008c89abe835c0c769e9276b9e9346`; tree `7d3ac13e4c73c1657f6b904fd515d4b7280198dc` matched the tested tree.

## Protected candidate and independent artifact verification

[Candidate run 37120425666](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/37120425666), job `111195296888`, completed successfully on 2026-10-03 at 13:34 UTC on the exact merged packaging commit above. It ran through the protected `release` environment with read-only repository permission. Logs confirm **88/88** suites, **250** soak cycles, **39/39** native tests, all **19** shell cases, repeated embedded emission, the **deep release-integrity mutation contract**, a fresh signed NSIS build, exact-version staging, release-surface validation and cryptographic updater-signature verification.

On 2026-10-04, artifact `11275391568` (`release-candidate-d9640c5268008c89abe835c0c769e9276b9e9346`) was downloaded independently. Its 3,051,089-byte ZIP matched GitHub's SHA-256 digest. The six-file public allowlist, all six recorded file hashes, surface sizes/hashes, installer hash sidecar, manifest version/platform/URL/signature and both lockfile hashes matched. The installer signature verified against the committed public key, key ID `6fee5e670300baef`; the public-key file hash remained `33374e88c5b4f66546b789e0b20ea568b695364b4a1c84ab64bb25a585b1cc62`.

| Candidate evidence | SHA-256 |
|---|---|
| Artifact ZIP | `73dcc8989a37a3dd990fc4a32d9ff194d01c6ecf2fd74f2380353ad254417930` |
| Installer | `4891063f223f67b2fdd5df9698ef5ba2a0f40e35d0c54f14e94ebaded085c944` |
| Installer `.sig` | `29c6b68c2fab38c97088ba571a5c33f8c6f1e633c86dbe5b21a147dd8ed5cf43` |
| Installer `.sha256` | `a2d378279d9cce34c1e425d250029a8b6821d4dd0289df4579f63e203bd8772e` |
| `RELEASE_SURFACE.json` | `2181242be8f507da336065e6997ec2592fb2c523a4a1f4f13384e9ce5ead8d41` |
| Candidate `latest-preview.json` | `1a213d120cffef9f4463d2f9e77f56a5ef638dcbd7062de63fbed35d25e2ec3c` |
| `THIRD_PARTY_NOTICES.txt` | `ba8840f1084877171688061508e7b70ca16521ec389cb185e4a40384b1ffd210` |

Root and public notices were byte-identical and matched their evidence hash, with 245 runtime packages and 156 distinct legal texts. This verifies generated build evidence; the separate Track 16 dependency/license review is still TODO. In-memory mutations of the downloaded installer and signature were each rejected by the standalone verifier. This is **not** evidence of rejection inside the installed client.

This is a non-published rebuild of the existing `0.11.36-rc.5` source identity, not a new update offer. Its candidate manifest must not replace the live Preview manifest: the existing version URL serves the earlier published installer, whose hash differs from this rebuild. No release, tag or feed was changed, and the downloaded executable was not run or installed. The successful rc.4-to-rc.5 installed-client test remains in [the rc.5 evidence](UPDATER_E2E_RC5.md); it need not be repeated to close this build audit. GitHub candidate artifacts have seven-day retention; the provenance, results and hashes above remain committed after artifact expiry.

## Reproduction boundary

- Local evidence used Node `24.21.0`, npm `11.19.0`, Rust/Cargo `1.98.1`, Visual Studio 2022, MSVC tools `14.44.35207` and Windows SDK `10.0.26100.0`.
- PR #33 ran on image `windows-2025-vs2026`, revision `20260925.250.1`. Its [image inventory](https://github.com/actions/runner-images/blob/win25-vs2026/20260925.250/images/windows/Windows2025-VS2026-Readme.md) reports Visual Studio Enterprise 2026 `18.10.12217.157` and SDK `10.0.26100.0`. The required `windows-2025` label remains unchanged; it selects a maintained image, not immutable VM bytes.
- The final protected candidate used the same `windows-2025-vs2026` image revision `20260925.250.1`, locked CLI `2.11.0` and NSIS `3.11`. It proves the changed packaging path on the recorded runner, not bit-identical native output across machines or rebuilds.
- The prior [rc.5 candidate](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/36611543925) used image `20260922.246.2`. Its logs record locked CLI `2.11.0`, bundler `2.9.0`, NSIS `3.11`, NSIS utility `0.5.3` and the exact product/version/x64 output name now required by staging.
- `downloadBootstrapper` retains the configured WebView2 prerequisite behavior. Runtime/bootstrap availability, SDK/linker/image revisions, native build paths and signature metadata remain external inputs. Dependency locks and deterministic frontend emission do not establish byte-identical Windows executables/installers across environments. Compare and retain hashes of the actual candidate and actual published artifact separately.
- The raw build evidence above predates only packaging/helper/test/documentation edits in this follow-up; application Rust/frontend and both dependency graphs are unchanged. Native execution, signing and installed-client acceptance remain separate evidence categories.

## Track 15 conclusion and remaining release gates

The clean bootstrap/raw build, required PR checks, protected signed NSIS candidate and independent artifact verification close this track's changed build and packaging paths. Reproduction limits remain explicit above. Track 16 is the next independent source audit; no license selection or change is implied by this result.

Track 14 remains independently BLOCKED on its outstanding installed-client cases and release controls. The successful rc.4-to-rc.5 update is retained; no repeat is required by this audit. GitHub cleanup remains the final Track 19 item.
