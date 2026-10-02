# Pre-1.0 Audit 15 — Build, CI & reproducibility

**Status:** IN REVIEW — first source/command-failure review completed; the remaining build-provenance work below is not waived.
**Baseline:** `21e1977c2ac4672e952ebd12ab56d233a3a4a9c2` after PR #32.
**Review date:** 2026-10-02.

## Reproduced findings and remediation

| Finding | Before / after and evidence |
|---|---|
| Failed refresh of protected main could be ignored | The release ancestry step ran `git fetch` followed by `git merge-base`, checking only the latter exit code. A command double returned fetch failure and ancestry success; the old step continued. It now checks the fetch result immediately, before consulting ancestry. The executable fixture covers fetch failure, ancestry failure and successful ancestry, including whether the second command ran. |
| Windows dependency bootstrap silently stopped after npm | Calling the Windows `npm.cmd` shim from another batch file without `call` transfers control instead of returning. A local successful npm stub reproduced the missing continuation. Both bootstrap npm invocations now use `call`; executable fixtures verify successful continuation and failure stopping for each invocation. The Cargo-lock evidence copy also checks its own result. |

`scripts/test-build-failure-paths.ps1` extracts the actual workflow and bootstrap command blocks. Its seven cases use local command doubles, without network requests, dependency installation, signing material or publication. They test command flow; they are not a complete execution of the bootstrap helper against downloaded dependencies.

`test:pre1-build-ci` is registered in the normal regression matrix. It checks exact Node/Rust/CLI pins and alignment, npm root-lock consistency and integrity, the fixed Windows runner, locked builds, Action SHA pins, cache-write restrictions and non-publishing candidate permissions. On Windows it runs the shell fixtures. It also emits the embedded JavaScript twice into distinct output files and compares each byte-for-byte with the committed frontend, plus CSS parity. This proves repeatable frontend emission from the current installed dependency set; it does not claim a reproducible native executable or installer.

## Build boundaries reviewed

- Node is pinned by `.nvmrc`; Rust and the Windows MSVC target by `rust-toolchain.toml`. All three Windows workflows use `windows-2025` and the same Rust version. CLI installation uses an exact version with `--locked`.
- `package-lock.json` and `src-tauri/Cargo.lock` remain committed. CI uses `npm ci --ignore-scripts` and Cargo `--locked`; no dependency resolution or lock update was introduced.
- PR validation is read-only and does not receive signing secrets. Only protected main pushes can save the Rust cache. The dependency-approval `pull_request_target` workflow consumes GitHub metadata without checking out or running PR code.
- Candidate validation requires protected main and the `release` environment, has read-only repository permission and uploads only candidate evidence. Public publication remains a separate protected tag workflow. The ancestry fix strengthens its existing gate.
- The committed embedded frontend remains the desktop distribution. No browser/Vite path, portable packaging, QA variant or third release channel is introduced.

## Validation and limits of this pass

Direct local execution passed all **seven** Windows command-flow fixtures, the Track 14 release regression, validation-script link checks and `git diff --check`. The host reports the pinned Node `24.21.0` and Rust `1.98.1` versions. Launching PowerShell from Node was blocked by this host with `EPERM`; therefore the full new Node-orchestrated suite is not claimed as a local pass. Required Windows PR CI must execute that suite, both embedded emissions and the full regression/native matrix before integration.

This change does not build or publish a new signed installer. The independently verified rc.5 candidate/publication and installed-client results remain in [the rc.5 evidence](UPDATER_E2E_RC5.md); they are prior build evidence, not an execution of the newly changed bootstrap helper.

## Remaining Track 15 work

1. Verify a clean checkout/dependency bootstrap through the local Windows helper, beyond the isolated command-flow cases; record lock hashes before and after. Inspect exact CLI-version recognition and local installer/hash-output selection, especially with older artifacts in the shared Cargo output directory.
2. Record the complete external build inputs and reproduction boundary: Windows image revision, MSVC/SDK, Tauri/NSIS tooling, WebView bootstrap behavior and build-path/environment inputs. A fixed runner label and locked dependencies do not guarantee byte-identical native installers.
3. Complete the clean-build/reproduction evidence and resolve any findings from those checks before marking Track 15 PASS. No additional signing execution is authorized or needed merely because this source PR is green.

Track 14 remains independently BLOCKED on its outstanding installed-client cases and release controls. The successful rc.4-to-rc.5 update is retained; no repeat is required by this audit. GitHub cleanup remains the final Track 19 item.
