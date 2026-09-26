# Installed updater test — 0.11.36-rc.4 Preview

**Date:** 2026-09-26. **Status:** PREPARING; no installed update result yet.

The owner approved using the existing Windows PC and the public Preview channel for this test. This is a prerelease test authorization, not Stable/1.0 acceptance. Track 14 remains BLOCKED until the required evidence is complete.

## Observed starting point

- The Windows uninstall entry, installed executable metadata and running application identify `0.11.36-rc.3`.
- Starting executable SHA-256: `5fce0ec4dd0be00960a62197491d08c844825c9e2ce205438a9c12c38b861cd2`.
- The application starts successfully at the project selection screen with no project open. No project data has been edited for this test.
- The latest published Preview is also `0.11.36-rc.3`; there is no newer public offer to test yet.

## Candidate and release gates

`0.11.36-rc.4-r1` contains the audited source from PR #25 plus synchronized version identity. Only the root application versions change in the npm/Cargo lockfiles; dependency resolutions, signing keys, installer settings, runner pins and workflow safety gates are unchanged.

The candidate must pass current PR validation, enter protected main through the PR, and complete the protected non-publishing signed RC workflow. Verify the staged installer signature, hashes, release inventory and notices before creating a release tag. The existing release-environment reviewer must approve signing. Never bypass that gate or read private secret values.

If those checks pass, publication is limited to a new `v0.11.36-rc.4` GitHub prerelease and the Preview manifest. Stable remains untouched. The regular publishing workflow must independently pass its own validation and signature/publication gates. The public Preview offer also becomes visible to other Preview users; it must contain a genuine valid installer, never a negative-test fixture.

## Test sequence and evidence

| Step | Expected result | Evidence status |
|---|---|---|
| Before publication: Preview check on rc.3 | Same version produces no newer update offer | NOT RUN |
| After publication: Preview check on rc.3 | Offers exactly rc.4 from the versioned repository URL | NOT RUN |
| Install and restart | Signature passes, installer completes, app restarts showing rc.4; Windows entry and executable version agree | NOT RUN |
| Installed resources | LICENSE and THIRD_PARTY_NOTICES.txt remain installed | NOT RUN |
| Check again on rc.4 | No same-version reinstall offer; app remains usable | NOT RUN |

The rc.3-to-rc.4 transition executes the **old** client's updater and proves delivery/install of the new candidate. It does not prove the new Track 14 download/install implementation end to end. A subsequent newer approved candidate is needed to exercise that implementation from installed rc.4.

Bad-signature/tampered-installer rejection, offline/interrupted download, pending-edit/Apply exclusion and full Stable/Preview isolation remain separate unrun acceptance cases. Never place tampered bytes or signatures in production rolling feeds, disable TLS/signature validation, downgrade versions, or mutate protected version tags to manufacture those tests. Existing automated signature/native fixtures remain evidence of their own narrower scope.

Record source commit, workflow run, installer SHA-256, public-key fingerprint, offered version, actual restart result and any sanitized failure for each executed step. Do not publish local usernames, project paths, raw support logs or private signing data.
