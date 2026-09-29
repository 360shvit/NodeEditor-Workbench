# Installed updater validation — 0.11.36-rc.5 Preview

**Date:** 2026-09-27. **Status:** PREPARING — no rc.4-to-rc.5 installed test result yet.

## Scope and baseline

This candidate creates a genuinely newer signed Preview target for the updater shipped in rc.4. The owner authorized continued Preview testing on the existing Windows PC. It is not Stable/1.0 acceptance. Track 14 remains BLOCKED.

The rc.4 publication and owner-confirmed installation are recorded in [the rc.4 evidence](UPDATER_E2E_RC4.md). Starting installed version: `0.11.36-rc.4`; executable SHA-256: `d9bcd5babc6b63b3484b2889351a36ca7554dd8914ffd23ef7fe07553774279a`. Windows registration and executable metadata agree. A repeat Preview check returned no newer version (owner report).

rc.5 changes release identity and documentation only. Native/renderer updater behavior, production endpoints, public key, signing-secret references, locked dependency resolutions, installer configuration, fixed Windows runner and full Action SHA pins remain unchanged. npm and Cargo lockfiles change only the root application version.

## Publication sequence

1. Pass required PR validation and integrate through protected main.
2. Run the protected, non-publishing signed candidate workflow on that main commit.
3. Verify candidate installer/signature, hashes, release inventory and notices.
4. Create the new exact tag `v0.11.36-rc.5` at that tested commit. Let the normal publishing workflow independently validate, obtain the release-environment approval, sign and publish the Preview release.
5. Independently verify the actual published bytes and rolling Preview manifest. The publishing workflow rebuilds the installer; do not substitute the earlier candidate hash.
6. Keep the client on rc.4 until the applicable pre-install checks below are recorded. The public offer also reaches other Preview users and must remain a valid genuine update.

No tag rewriting, same-version republishing, production endpoint overrides, signature/TLS bypasses, signing-key generation or unreviewed secret changes are part of this plan.

## Installed-client sequence

Use an expendable project fixture for editing cases, never the owner's real project data. Record which assertions were directly observed and which were reported by the owner. A successful process/version check alone does not prove every intermediate UI step.

| Scenario | Expected observation | Evidence status |
|---|---|---|
| rc.4 Preview before publication | No newer offer | Owner-reported baseline from rc.4; repeat if state changes |
| rc.4 Preview after publication | Exactly rc.5 and the versioned installer URL | NOT RUN |
| Pending edits before installation | Install is blocked; fixture edits remain intact | NOT RUN; prepare and inspect fixture before changing it |
| Edits or Apply while download is finishing | Native final gate prevents installation during pending edits/transaction | NOT RUN; deterministic scheduling is still needed, not a timing guess |
| Valid update with no pending edits | Download, signature verification, installer launch and automatic restart complete; app reports rc.5 | NOT RUN |
| Installed resources and identity | Windows entry, running executable and About agree on rc.5; license/notices match verified source/release | NOT RUN |
| Repeat Preview check on rc.5 | No same-version reinstall offer, client remains usable | NOT RUN |
| Stable/Preview isolation and downgrade | Stable does not accept a prerelease; no downgrade/equal-version installation | NOT RUN; an absent Stable manifest is not proof of prerelease rejection |
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
