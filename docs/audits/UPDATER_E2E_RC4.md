# Installed updater test — 0.11.36-rc.4 Preview

**Updated:** 2026-09-27. **Status:** PARTIAL — owner-confirmed rc.3-to-rc.4 update; installed rc.4 independently verified. Full Track 14 acceptance remains open.

The owner approved using the existing Windows PC and the public Preview channel for this test. This is a prerelease test authorization, not Stable/1.0 acceptance. Track 14 remains BLOCKED until the required evidence is complete.

## Observed starting point (before publication)

- The Windows uninstall entry, installed executable metadata and running application identify `0.11.36-rc.3`.
- Starting executable SHA-256: `5fce0ec4dd0be00960a62197491d08c844825c9e2ce205438a9c12c38b861cd2`.
- The application starts successfully at the project selection screen with no project open. No project data has been edited for this test.
- The latest published Preview was also `0.11.36-rc.3`. The owner manually checked Preview and reported “Keine neuere Version verfügbar”.

## Candidate and release gates

`0.11.36-rc.4-r1` contains the audited source from PR #25 plus synchronized version identity. Only the root application versions change in the npm/Cargo lockfiles; dependency resolutions, signing keys, installer settings, runner pins and workflow safety gates are unchanged.

The candidate must pass current PR validation, enter protected main through the PR, and complete the protected non-publishing signed RC workflow. Verify the staged installer signature, hashes, release inventory and notices before creating a release tag. The existing release-environment reviewer must approve signing. Never bypass that gate or read private secret values.

If those checks pass, publication is limited to a new `v0.11.36-rc.4` GitHub prerelease and the Preview manifest. Stable remains untouched. The regular publishing workflow must independently pass its own validation and signature/publication gates. The public Preview offer also becomes visible to other Preview users; it must contain a genuine valid installer, never a negative-test fixture.

## Test sequence and evidence

| Step | Expected result | Evidence status |
|---|---|---|
| Before publication: Preview check on rc.3 | Same version produces no newer update offer | OWNER-REPORTED PASS: “Keine neuere Version verfügbar”. |
| After publication: Preview check on rc.3 | Offers exactly rc.4 from the versioned repository URL | Owner reports that the update was reachable and installed. Public Preview version and exact rc.4 asset URL independently verified; the offered UI was not directly observed. |
| Install and restart | Signature passes, installer completes, app restarts showing rc.4; Windows entry and executable version agree | Owner reports installation. Independently confirmed running installed executable, executable metadata and Windows uninstall entry at rc.4. The actual download/install/automatic-restart sequence was not directly observed. |
| Installed resources | LICENSE and THIRD_PARTY_NOTICES.txt remain installed | PASS: installed LICENSE matches the source license byte for byte; installed notices match the published release notices byte for byte. |
| Check again on rc.4 | No same-version reinstall offer; app remains usable | OWNER-REPORTED PASS: Preview Check returned “Keine neuere Version verfügbar”. Running rc.4 process independently confirmed. |

## Published release and independent verification

- [PR #25](https://github.com/360shvit/NodeEditor-Workbench/pull/25) is merged. Main and release tag `v0.11.36-rc.4` identify `c1a9629ff8f0e5148f195e106067a4cf19d58eb8`.
- [Protected signed candidate run 36227272412](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/36227272412) succeeded. Candidate installer SHA-256: `841ab0fc5224ae2c81049eb820380cd99d47c73ed5666e9c7fbe4200029e1b5f`.
- [Publish Windows Release run 36303177034](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/36303177034) succeeded, including both validation and publication jobs. The [rc.4 prerelease](https://github.com/360shvit/NodeEditor-Workbench/releases/tag/v0.11.36-rc.4) was published at `2026-09-27T07:55:11Z`.
- The publishing workflow builds its own installer. Published installer SHA-256: `6575e63a7056bcfefab741c64f4c1bb4494b52830642c80c8a68512f01e80c8e`. This is distinct from the earlier candidate artifact hash; the downloaded published bytes were verified separately.
- Independently downloaded all six published release assets. Their sizes and SHA-256 hashes match GitHub asset metadata; release inventory hashes/sizes and the installer hash sidecar match the downloaded bytes.
- The published installer signature verifies against the committed updater public key, including payload and trusted-comment checks. Public-key file SHA-256: `33374e88c5b4f66546b789e0b20ea568b695364b4a1c84ab64bb25a585b1cc62`. No private signing data was read or changed.
- The versioned and rolling Preview manifests are byte-identical, advertise `0.11.36-rc.4`, reference the versioned rc.4 installer URL, and carry the matching installer signature. Manifest SHA-256: `fa77fefbea80949f262341a3c2b2a01c4d19c6640f10bbf0f8e8b3b0a5ec8e72`.
- Post-install executable SHA-256: `d9bcd5babc6b63b3484b2889351a36ca7554dd8914ffd23ef7fe07553774279a`; executable ProductVersion/FileVersion and Windows DisplayVersion all equal `0.11.36-rc.4`.
- Installed notice SHA-256: `ba8840f1084877171688061508e7b70ca16521ec389cb185e4a40384b1ffd210`; installed LICENSE SHA-256: `7991b28025bc6b9ed3ea49f189f36a3de7c8b31e83714c52d0d57099928456f2`.
- Mutated candidate payload/signature rejection was checked only with the standalone pipeline verifier. It is not installed-client negative-signature evidence.

The owner reports are explicitly distinguished from independent file/API checks. No direct UI capture of the download/install/restart sequence is available; no unobserved intermediate step is counted as independently verified.

The rc.3-to-rc.4 transition executes the **old** client's updater and proves delivery/install of the new candidate. It does not prove the new Track 14 download/install implementation end to end. A subsequent newer approved candidate is needed to exercise that implementation from installed rc.4.

Bad-signature/tampered-installer rejection, offline/interrupted download, pending-edit/Apply exclusion and full Stable/Preview isolation remain separate unrun acceptance cases. Never place tampered bytes or signatures in production rolling feeds, disable TLS/signature validation, downgrade versions, or mutate protected version tags to manufacture those tests. Existing automated signature/native fixtures remain evidence of their own narrower scope.

Record source commit, workflow run, installer SHA-256, public-key fingerprint, offered version, actual restart result and any sanitized failure for each executed step. Do not publish local usernames, project paths, raw support logs or private signing data.
