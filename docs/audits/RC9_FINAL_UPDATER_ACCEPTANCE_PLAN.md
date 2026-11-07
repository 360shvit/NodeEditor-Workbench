# Preview rc.9 — Final updater acceptance plan

**Status:** PREPARED, NOT RUN. No candidate build, installed test or publication is claimed by this plan.
**Prepared:** 2026-11-07.
**Source baseline:** main `77f317a9db9432f2835fbd6880f4007a932605bf`.
**Starting installed version:** the verified rc.8 candidate. **Target:** `0.11.36-rc.9`, display `0.11.36-rc.9-r1`, milestone **Final Updater Acceptance**.

This candidate changes release identity and its generated mirrors only. Application behavior, dependencies, public key, workflow permissions, runner pins and native updater gates are unchanged. Both lockfiles change only the root application version. The protected **Validate Release Candidate** workflow builds and signs from main without publishing. A tag push or public release is not part of this plan; the owner's deferred Stable-container/immutability decision remains in force.

## Feasibility correction

The previous [Track 14](PRE_1_0_14_UPDATER_RELEASE.md) / [Track 18](PRE_1_0_18_FINAL_ACCEPTANCE.md) recipe assumed that an owner could enter the editor during a download. Current `WorkbenchSettings.tsx` sets `updateBusy` before calling the native installer; its close handler rejects Escape/backdrop dismissal, and Close/Done are disabled until failure. The modal traps keyboard focus. Therefore "pause download, close Settings, stage an edit" is not an executable normal-UI procedure.

The native implementation separately downloads and verifies the signature, obtains the Apply/project transaction lock and rereads the pending-change count before installer launch. Existing native fixtures exercise lock exclusion; this source evidence is not an installed concurrency PASS. Already-running asynchronous work is not ruled out by the modal. Deterministic native Apply overlap and pending-count changes during a download remain NOT RUN on the installed host. Do not inject privileged renderer calls, alter the binary, relax modal/native gates or claim that a modal test proves those cases.

## Candidate prerequisites

1. Merge only after required checks pass for the exact identity commit. Record protected main SHA and the signed candidate run/job/artifact.
2. Obtain the owner's protected-environment approval. Independently verify installer/signature, public-key identity, version, embedded application, license/notices and release-surface hashes before execution.
3. Retain rc.8 recovery material and snapshot the disposable project and app profile. Record installed application identity and Windows/WebView2 versions; never overwrite the actively edited original project.
4. Prepare and test a separate bounded local transfer controller. It must serve the actual rc.9 signature and bytes under the compiled repository's exact HTTPS versioned URL. The manifest and embedded installer must agree on rc.9. Never reuse rc.8 bytes with invented newer metadata for a successful install.

## Proposed installed sequence — fresh owner approval required

The October certificate/proxy authorization has expired. This plan authorizes no trust-store change or app installation. Present the concrete controller and cleanup behavior for approval only after candidate material and helper tests are ready. Use only Preview; do not create a QA channel or product. Public releases, tags and rolling manifests stay unchanged.

1. Start the unchanged installed rc.8 with the approved process-local routing and a disposable project with no pending changes. Check Preview for the real signed rc.9 candidate.
2. Start the download and hold it after a recorded prefix. While held, try Escape, Close, Done and backdrop dismissal. Settings should remain open; the editor must not become accessible through those actions. Record the observed controls/message. This is a modal behavior test, not a final native pending-change test.
3. Abort that same transfer deliberately. Confirm recoverable download error, usable app and unchanged installed/project bytes. Confirm Settings can now close normally. The helper must never complete this first body or launch an installer.
4. After separate owner confirmation that open work is saved, enable the complete, valid candidate response. Retry Check and Install & restart. Require successful signature verification, rc.8-to-rc.9 installation and restart. Match actual installed files and Windows/About identity to the inspected candidate.
5. Offer the equal rc.9 version: no newer update. Export diagnostics with project paths off. Close the test-started app, remove the exact temporary certificate, stop the proxy and verify cleanup in the owner's execution context. Start normally and verify the real Preview feed without a local offer.

The full installation in step 4 is the previously missing **valid retry after interrupted download**. The rc.4-to-rc.5 positive and rc.8 negative results remain credited; no repetition is needed for their existing claims.

## Evidence and remaining scope

Record source/run/hash provenance, baseline/final file comparisons, helper events, owner observations, report privacy scan and cleanup checks separately. Keep raw logs, private paths and profile backups local. Stop on identity mismatch, signature/TLS failure, unexpected installer launch, missing cleanup or an unplanned write.

Track 18 remains open. This plan does not close native installed concurrency, forced downgrade installation, retained-userdata uninstall behavior, presented-frame/long-duration performance limits or deferred publication controls. Their final scope needs an explicit documented disposition; unrun cases must not become PASS merely because CI is green.
