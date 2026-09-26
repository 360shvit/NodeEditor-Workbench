# Pre-1.0 Audit 14 — Updater, signing & release pipeline

**Status:** BLOCKED — source remediation is implemented; installed-client E2E and repository-admin confirmation remain open. PR CI pending.
**Reviewed baseline:** PR #25 after Track 13, `3618efb4aa6f77882e3776c64c0ceb9bbec39218`.
**Review date:** 2026-09-25.

This track must not be marked PASS from source tests alone. The owner confirmed that there are no reliable recorded installed-client positive-update / negative-signature results. No release, tag, merge, signing-key generation, secret change or installed update was performed during this audit.

## Trust boundaries and findings

| Boundary / finding | Remediation and proof |
|---|---|
| Failed or out-of-order native update checks | **Must-fix — remediated.** Every check first revokes the old offer. Generation checks prevent an older completion from overwriting or clearing a newer offer. Three native session fixtures exercise failure, supersession, validation rejection and lease cleanup. |
| Duplicate installation / Apply overlap | **Must-fix — remediated.** A native install lease excludes duplicate installs and new checks throughout download/install, releasing on error or cancelled futures. Immediately before the final staged-change check and installer launch, native code acquires the same transaction lock as Apply/project transitions. Active transactions block installation rather than allowing restart mid-write. A native lock fixture exercises both exclusion directions. |
| Premature signature-success progress | **Must-fix — remediated.** In locked `tauri-plugin-updater 2.11.0`, `on_download_finish` precedes `verify_signature`. The app now emits its signature-verified progress only after `download().await` succeeds. A source integration assertion protects this ordering. |
| Channel and download authority | **Hardening — remediated.** Check and install both require a supported channel and the exact HTTPS versioned installer URL in the compiled repository. Stable rejects prerelease identifiers while allowing hyphens in build metadata. Raw/development builds refuse install as well as check. Native fixtures reject wrong repository, HTTP, different version, query-bearing and unrelated targets. |
| Network failure recovery | **Hardening — remediated.** Checks have a 30-second request timeout and artifact downloads a 600-second timeout. Existing nonfatal UI catches permit retry; no verified result is announced after a signature/download error. OS installer execution is outside those HTTP timeouts. |
| Signature evidence before publication | **Must-fix — remediated.** Surface checks previously required only a nonempty signature plus internally consistent hashes. RC and publish workflows now additionally run `verify-updater-signature.mjs` against the actual staged installer and committed public key. Node's Ed25519/BLAKE2b primitives verify payload, key ID and trusted-comment signature for Tauri's base64-wrapped Minisign format. Public upstream vectors cover legacy/prehashed success, modified payload/comment, wrong key and malformed encoding. No private test key is generated or committed. |
| Concurrent/older tag publication | **Must-fix — remediated.** All publication tags now share one workflow concurrency group. Read-only preflight rejects existing version releases, channel rollback/equal-version replacement, malformed targets and API/network failure. Only an actual 404 permits channel bootstrap. A stable hotfix preserves an already newer Preview manifest. The version release requires an existing tag via `--verify-tag`. |
| SemVer edge cases | **Hardening — remediated.** Numeric prerelease identifiers with leading zeroes are rejected; large numeric prerelease values are compared without floating-point rounding. Unsafe numeric core values fail closed. Surface staging and workflow classification exclude build metadata before deciding whether a version is a prerelease. |
| Multi-command PowerShell gates | **Must-fix — remediated.** Staging, surface validation and signature verification now each check their own exit code. A later successful command cannot hide a failed earlier gate. Rolling-release creation errors also stop before upload. |

Native update authority remains unavailable to renderer plugin calls (`updater:default` is not granted). The installed NSIS distribution class, fixed Windows runner, full Action SHA pins, locked dependency builds, main ancestry/tag/version/bootstrap checks, protected release environment, staged-change checks and `release/public/` allowlist remain in place. The RC workflow remains read-only and non-publishing.

## Repeatable validation

- `test:pre1-updater-release` executes public signature fixtures, real SemVer/publication-planning functions, HTTP error/404 and token-forwarding fixtures, plus native/workflow integration assertions. It does not access a network, signing key or installed application.
- Five native tests execute the new session, channel/URL and transaction-lock boundaries; the complete locked local Rust suite passed **39/39**.
- The local registered matrix passed **79/87** suites; eight existing subprocess-dependent suites hit this host's `EPERM` restriction. Full normal Windows PR CI is still required. Later targeted runs covered the final timeout and SemVer classification changes.
- The pinned Tauri updater source was reviewed to confirm that signature verification precedes the successful return of `download()`, and that Windows `install()` launches the installer and exits. The additional pipeline verifier supplements this native enforcement; it does not replace it. See the [Tauri updater documentation](https://v2.tauri.app/plugin/updater/).

## Repository and release gate snapshot

| Gate | Observed status |
|---|---|
| Public source + release repository | `360shvit/NodeEditor-Workbench`; PR #25 remains the audit branch, separate from protected main. |
| Version identity | `0.11.36-rc.3` is already published. This audit branch requires a new SemVer before it can become a release target; no identity bump is made here. |
| Lockfiles | `package-lock.json` and `src-tauri/Cargo.lock` remain committed and unchanged. No dependency addition. |
| Main protection | Active ruleset `23139129`: no deletion/force push, linear history, PR requirement and strict `validate` / `dependency-approval` checks; no bypass actors. |
| Version-tag protection | A `v*` tag ruleset was prepared with update/deletion/force-push restrictions and no bypass actors. GitHub requested Confirm access at save; owner confirmation is pending, so the new rule is **not yet verified active**. Rolling `updater-*` tags are outside its scope. |
| GitHub release immutability | Disabled in repository Settings; the existing version release reports `immutable:false`. The workflow prevents version replacement, but that is not a provider-enforced asset immutability guarantee. Do not blindly enable repository-wide immutability: newly created rolling updater releases must remain mutable. Resolve the version-asset governance policy before stable promotion. |
| Actions | Normal PR validation pending for this change. Signing/build/publication steps remain confined to protected workflows; the current audit does not dispatch them. |
| Release environment | Both signed workflows reference `environment: release`. Its current reviewer and deployment restrictions have not been reverified in this audit. |
| Signing key / public key | Existing public key is configured and matches the installer config. Public-key file SHA-256: `33374e88c5b4f66546b789e0b20ea568b695364b4a1c84ab64bb25a585b1cc62`. Private key was neither read nor changed. |
| Required secrets | `TAURI_SIGNING_PRIVATE_KEY`, and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if the key is password protected. Current secret availability was not reverified. No secret values belong in audit evidence. |
| License / notices | Existing MIT license retained; no license decision or dependency change. Existing notice generation/classification gates remain required. Full dependency/compliance review is Track 16. |
| Prior installer/updater build | The existing [rc.3 release workflow](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/35151183129) succeeded on main `8cda1880`, including signed NSIS build, surface staging and publication. The public release contains installer, signature, hash sidecar, Preview manifest, surface inventory and notices. This proves the older build path, not this audit branch or installed-client behavior. |
| Current installer/updater E2E | **NOT VERIFIED.** No signed build of these changes or installed-client positive/negative test has been run. The owner confirmed that reliable prior E2E evidence is absent. |

## Required installed-client evidence before PASS / public promotion

Run on an isolated Windows test machine using an approved, newly versioned signed candidate from the protected non-publishing RC workflow. Record source commit, artifact SHA-256, public-key fingerprint, starting/target installed versions, channel, actual result and relevant screenshots/sanitized diagnostics. Keep signed test fixtures and tampered copies outside public release surfaces. Do not alter production rolling manifests for negative tests.

| Scenario | Required result | Status |
|---|---|---|
| Valid signed update | Installed older version checks, downloads, verifies, installs and restarts at the candidate version; installed license/notices present. | NOT RUN |
| Tampered installer / wrong signature or key | Verification fails before installer launch; current app remains usable; retry is possible. | NOT RUN |
| Offline / HTTP error / interrupted download | No install or restart, useful error, retry succeeds after connectivity returns. | NOT RUN |
| Stable versus Preview | Stable refuses a prerelease; Preview accepts a newer approved prerelease; neither downgrades/equal-version reinstalls. | NOT RUN |
| Staged edits before/during download | Installation is blocked, staged edits retained; resolving them and checking again permits the approved update. | NOT RUN |
| Apply overlapping the final install boundary | Installer does not launch while Apply owns the transaction lock; no interrupted project transaction. | NOT RUN |
| Development/raw build | No updater network configuration or install authority. | NOT RUN on installed test host; source/native boundary reviewed |

A controlled test feed or test build must preserve production channel/signature checks. Any fixture routing or special test packaging needs a concrete reviewed test plan; these changes do not introduce a production bypass. Protected-main integration, a fresh identity and approved signing execution are prerequisites, not actions authorized by green PR CI alone.

## Remaining limits

GitHub publication is not an atomic transaction across version release and two rolling releases. An API/upload failure can leave a version release published with one or both channels still pointing to an older version. Same-version retries remain blocked; recovery needs an explicit operator review of existing assets/hashes/signatures. Concurrency/preflight protects workflow writers, not a repository administrator manually mutating assets or settings.

The install lease prevents concurrent native requests and releases on failure; it does not make OS installation reversible. The final staged-change check uses the native pending-count mirror and cannot turn a hostile renderer into a trusted editor. Installed distribution eligibility remains the compiled build classification, not Windows registry attestation against copying an installed binary elsewhere. HTTP timeout bounds are not download-size or total process-memory bounds; the pinned updater buffers the artifact before verification. Those limits must be considered in real-client acceptance.

Track 14 remains **BLOCKED** until the installed E2E matrix and repository release controls are resolved. Tracks 15–17 can be audited independently; their completion cannot waive this gate.
