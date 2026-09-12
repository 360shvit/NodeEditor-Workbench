# Release / updater contract

**Applies to:** v0.11.35-r10 GitHub / Updater Integration source line.

`release-contract.json` is the canonical authoring source for release identity, update channels and publication policy. `npm run release:sync` synchronizes package/Tauri/Rust/build-helper mirrors and regenerates the shipped `tauri-ui/app.js` deterministically. `npm run release:check` validates the same identity mirrors without mutation and requires byte-for-byte embedded-bundle parity.

## Version identity

`version.semver` is the only public updater ordering identity. `revision` (`rN`) is an internal QA/artifact label and never decides update precedence. A public updater release must use `r1`; if a published build needs a fix, bump SemVer rather than republishing the same SemVer.

Examples:

- `1.0.0` → fix: `1.0.1`
- `1.1.0-rc.1` → next RC: `1.1.0-rc.2`
- `1.1.0-rc.2` → stable: `1.1.0`

## v0.11.35 updater authority

The Tauri v2 updater is integrated but remains fail-closed until public bootstrap is complete.

- Update check/download/install authority lives in native Rust commands.
- The WebView is not granted `updater:default` capability.
- Stable reads `updater-stable/latest.json` and must never accept a prerelease publication.
- Preview reads `updater-preview/latest-preview.json` and may advance to prerelease or stable versions.
- The signed package is downloaded and verified first. Native authority then **rechecks pending project changes immediately before `install()`**. Any staged changes that appeared while downloading block installation/restart.
- Installed Windows NSIS builds are the automatic-update route. Raw/development builds set `HGW_DISTRIBUTION_KIND=development`, so native updater configuration is refused.
- Install/restart requires an explicit user action; update checks are not background polling.

Tauri signatures are mandatory. The private signing key must never be committed or packaged. Only the public verification key is committed after bootstrap.

## Publication boundary

`release/public/` is the single allowlisted end-user publication boundary. The release workflow builds the signed NSIS artifact, stages it through `scripts/release-surface.mjs`, validates the surface, then uploads **only files from that directory**.

The surface contains, as applicable:

- canonical NSIS installer;
- installer `.sig` produced by Tauri;
- installer SHA-256 sidecar;
- `THIRD_PARTY_NOTICES.txt`;
- `latest.json` for stable releases only;
- `latest-preview.json` for both stable and prerelease releases;
- `RELEASE_SURFACE.json` integrity inventory.

A prerelease surface must not contain `latest.json`. Therefore publishing an RC/beta cannot mutate the Stable rolling channel.

## Static updater manifest

The generated static JSON follows Tauri v2's required structure: valid SemVer `version`, plus `platforms.windows-x86_64.url` and the **contents** of the generated signature file. URLs target the immutable version release `v<semver>` rather than a rolling asset.

## Bootstrap lock

Public publishing remains blocked while any of these conditions is true:

- no real GitHub repository/distribution repository is selected;
- `src-tauri/updater.pubkey` is still the `UNCONFIGURED` sentinel;
- `package-lock.json` is missing;
- `src-tauri/Cargo.lock` is missing;
- release-environment signing secrets are absent;
- `updater.publication.publishable` is false;
- the candidate revision is not `r1`;
- repository/license policy has not been explicitly approved for the chosen public/private model.

Repository setup must keep only the public verification key in source, store signing secrets in a protected release environment, preserve committed dependency locks, run the full Windows/native validation gates, and enable `publication.publishable` only for the final public candidate.
