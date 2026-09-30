# Installed updater validation — 0.11.36-rc.5 Preview

**Updated:** 2026-09-30. **Status:** POSITIVE UPDATE CONFIRMED — owner-reported rc.4-to-rc.5 installation/restart, pre-install staged-edit blocking and repeat check; installed rc.5 identity/resources independently verified. Track 14 remains BLOCKED on the other cases below.

## Scope and baseline

The rc.5 Preview release provides a newer signed target for the updater shipped in rc.4. The owner authorized continued Preview testing on the existing Windows PC. It is not Stable/1.0 acceptance. Track 14 remains BLOCKED.

The rc.4 publication and owner-confirmed installation are recorded in [the rc.4 evidence](UPDATER_E2E_RC4.md). Starting installed version: `0.11.36-rc.4`; executable SHA-256: `d9bcd5babc6b63b3484b2889351a36ca7554dd8914ffd23ef7fe07553774279a`. Windows registration and executable metadata agree. A repeat Preview check returned no newer version (owner report).

rc.5 changes release identity and documentation only. Native/renderer updater behavior, production endpoints, public key, signing-secret references, locked dependency resolutions, installer configuration, fixed Windows runner and full Action SHA pins remain unchanged. npm and Cargo lockfiles change only the root application version.

## Publication and artifact evidence

- [PR #30](https://github.com/360shvit/NodeEditor-Workbench/pull/30) merged as `e6bd3d3af946c40aaa77fab9cfa0f5695bd77ec3`; tag `v0.11.36-rc.5` points to that commit. Its tree `eec9ab7967405af32e05621276cc163bf92f7612` exactly matches the tested PR tree.
- [Windows PR validation](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/36611008006) and [Dependency Approval](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/36611008441) passed.
- Protected [signed candidate run 36611543925](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/36611543925) passed after owner approval. Artifact `11054373077` archive SHA-256: `ab9e8c0863a77959dcac88fd3624700dd59cab6d7f1bd0fb6d0c85b15e506e11`. Candidate installer SHA-256: `3c5319eb99251795a44e0bb8e4cac89ef54b641e1f002b5cd35e4912f8746e93`.
- Protected [publish run 36744213075](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/36744213075) passed on the same commit. [Public rc.5 Preview](https://github.com/360shvit/NodeEditor-Workbench/releases/tag/v0.11.36-rc.5) was published at `2026-09-30T16:53:45Z`, with `prerelease:true` and `draft:false`.
- Candidate and publication-validation logs each record **87/87** regression suites, **250** soak cycles and **39/39** native tests. The candidate and publication build both verify the actual staged updater signature before exposing artifacts.
- At `2026-09-30T16:55:42Z`, all six actual public assets were independently downloaded. GitHub asset digests/sizes, release-surface inventory, installer hash sidecar, manifest version/URL/signature, cryptographic updater signature and notices parity passed. The rolling Preview manifest was byte-identical to the versioned rc.5 manifest.

| Evidence | SHA-256 |
|---|---|
| Actual public rc.5 installer | `8af5f5e9e09bc3e5ec30850a36e1a1e87bcd9e0c56c0f523000fd4b2d3945eb4` |
| Versioned / rolling Preview manifest | `82445389f36466ee9fa28bb56cfb369e898320902ab2840dcc8aa303b06d8145` |
| Committed public-key file | `33374e88c5b4f66546b789e0b20ea568b695364b4a1c84ab64bb25a585b1cc62` |
| Installed rc.5 executable | `2df801761e0f18152ce18288f262a0c4cb1394570538a948f26de61418786a4a` |
| Installed / public third-party notices | `ba8840f1084877171688061508e7b70ca16521ec389cb185e4a40384b1ffd210` |
| Installed / source license | `7991b28025bc6b9ed3ea49f189f36a3de7c8b31e83714c52d0d57099928456f2` |

Signature verification used the committed key, ID `6fee5e670300baef`. The public installer differs from the candidate because the publication workflow rebuilt it; the public hash above is the one relevant to the actual update. Notice generation reports 245 runtime packages and 156 distinct legal texts. No private signing material was read or changed.

One-byte payload and signature mutations were rejected by the standalone verifier. These checks are pipeline evidence, **not installed-client signature-negative E2E**.

## Publication sequence used

1. Pass required PR validation and integrate through protected main.
2. Run the protected, non-publishing signed candidate workflow on that main commit.
3. Verify candidate installer/signature, hashes, release inventory and notices.
4. Create the new exact tag `v0.11.36-rc.5` at that tested commit. Let the normal publishing workflow independently validate, obtain the release-environment approval, sign and publish the Preview release.
5. Independently verify the actual published bytes and rolling Preview manifest. The publishing workflow rebuilds the installer; do not substitute the earlier candidate hash.
6. Keep the client on rc.4 until the applicable pre-install checks below are recorded. The public offer also reaches other Preview users and must remain a valid genuine update.

No tag rewriting, same-version republishing, production endpoint overrides, signature/TLS bypasses, signing-key generation or unreviewed secret changes are part of this plan.

## Installed-client observations

On 2026-09-30, the owner explicitly confirmed all four requested outcomes: installation was blocked with the staged test change, installation succeeded after discarding it, the app restarted automatically, and a repeat Preview check found no newer update. This is an owner-reported manual test, not an agent-observed recording of the download/verification/installer/restart sequence.

Before installation, the agent directly observed installed rc.4 with an expendable one-file project, staged one export rename, and saw the update-installation blocking message. The file on disk retained its baseline hash. A Preview check before publication completed with `You are up to date on the preview channel.` The owner then performed the test against the published rc.5 offer.

After the owner's test, executable product/file metadata and the Windows uninstall registration independently reported `0.11.36-rc.5`; the installed executable was running as a new process. Installed license/notices matched the verified source/public files. The disposable project file still matched its pre-test hash, consistent with discarding the staged rename. Process end-state evidence corroborates the installed result but does not independently prove the automatic restart sequence.

Use an expendable project fixture for editing cases, never the owner's real project data. Record which assertions were directly observed and which were reported by the owner. A successful process/version check alone does not prove every intermediate UI step.

| Scenario | Expected observation | Evidence status |
|---|---|---|
| rc.4 Preview before publication | No newer offer | PASS, directly observed before rc.5 publication |
| rc.4 Preview after publication | Exactly rc.5 and the versioned installer URL | PASS: owner confirmed the instructed rc.5 offer/test; versioned installer URL independently checked in the public manifest, not captured from the client |
| Pending edits before installation | Install is blocked; fixture edits remain intact | Owner confirmed the install control remained blocked with the staged change. Agent observed the pending rename and blocking notice before publication; disk bytes remained unchanged before/after. No continuous capture of the in-memory edit during the owner's test. |
| Edits or Apply while download is finishing | Native final gate prevents installation during pending edits/transaction | NOT RUN; deterministic scheduling is still needed, not a timing guess |
| Valid update with no pending edits | Download, signature verification, installer launch and automatic restart complete; app reports rc.5 | PASS by owner report for installation and automatic restart; installed rc.5 end state independently verified. Individual download/signature progress transitions were not recorded. |
| Installed resources and identity | Windows entry, running executable and About agree on rc.5; license/notices match verified source/release | PASS for Windows registration, running executable metadata and license/notices parity; About screen was not independently captured after installation |
| Repeat Preview check on rc.5 | No same-version reinstall offer, client remains usable | PASS by owner report |
| Stable/Preview isolation and downgrade | Stable does not accept a prerelease; no downgrade/equal-version installation | PARTIAL: newer Preview and same-version no-offer confirmed; Stable rejection and downgrade NOT RUN. An absent Stable manifest is not proof of prerelease rejection. |
| Offline/HTTP error/interrupted download | No installer launch or restart; useful failure; retry after recovery succeeds | NOT RUN; use an explicitly scoped fault setup, never disconnect the whole PC unexpectedly |

Record the source/tag SHA, candidate and publication run URLs, actual public installer hash, public-key fingerprint, installed versions/hashes before and after, UI messages, process exit/restart evidence and retained fixture edits. Keep paths, project contents and raw support logs out of public evidence.

## Isolated signature-negative test proposal

The production client has a compile-time repository, exact HTTPS GitHub manifest endpoints and an exact repository/version/installer URL check. A local manifest file or arbitrary localhost server cannot drive the installed production client without changing that authority boundary. Do not call a standalone Node verifier or native fixture an installed-app E2E pass.

A separate installed QA variant and dedicated fixture repository are a possible way to exercise the same native updater command/download/signature path without touching public production feeds. Before implementing it:

- Obtain owner approval for the additional fixture repository/public visibility and isolated QA installation. This plan creates neither.
- Use distinct QA product name, application identifier, install directory, profile and updater repository. Normal release builds must retain all current production values and have no runtime endpoint override.
- Preserve the committed public verification key, strict HTTPS validation, channel/version checks and locked Tauri updater. Use existing protected signing only through an approved QA build; never generate or disclose private keys.
- Generate a newer QA installer with the QA identity. Never use a production installer for a successful QA install, because it could modify the normal installation.
- Establish a positive QA baseline first. Then serve separate controlled cases: altered signature, one-byte altered installer, and mismatched existing public signature. Never let malformed fixtures enter the production repository's rolling feeds.
- Confirm rejection before installer launch, unchanged QA executable/registration, continued usability, and recovery with an intact newer signed fixture. Record this as evidence from an isolated QA build, distinct from the rc.4-to-rc.5 production-positive test.
- Review the exact packaging/routing diff and production-exclusion checks before running. This proposal does not itself implement or approve a test bypass.

The signature-negative case, deterministic interruption/concurrency cases and release-control decisions remain open after merely publishing rc.5. Version-asset governance and release-environment administrator bypass are still separate Track 14 decisions.
