# Preview rc.7 — candidate and installed editor acceptance

**Updated:** 2026-10-22. **Status:** PASS for candidate/material verification and the installed Discard regression on the synthetic fixture; overall installed acceptance is BLOCKED by a newly reproduced native Apply failure.

**Later resolution, 2026-10-24:** [rc.8 installed acceptance](RC8_INSTALLED_ACCEPTANCE.md) verifies the corrected Apply/reopen path and closes the Track 09 blocker. The rc.7 failure and its observations below remain unchanged; remaining Track 18 acceptance is still open.

## Candidate identity and build

Version `0.11.36-rc.7-r1` / updater `0.11.36-rc.7`, milestone **Discard Input Reset**, contains the [Discard fix](https://github.com/360shvit/NodeEditor-Workbench/pull/47) and [candidate identity update](https://github.com/360shvit/NodeEditor-Workbench/pull/48). Exact source: `6442ad045b6def676bee1b2139e4f83b29229275`, tree `58b002799e5566f897ccabef15974ceba924939b`.

[Validate Release Candidate #12](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/39126209596), job `117671768336`, succeeded on 2026-10-18 after the owner's protected `release` environment approval. Logs confirm **93/93** regression suites, **250** soak cycles, **39** native tests, release-integrity mutations, **249** notice entries / **164** legal texts, **442** exact installer-toolset files, signed NSIS packaging and the six-file Preview surface. The [post-merge source CI](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/39125997952) also passed on the exact source.

Artifact `12135459841`, named `release-candidate-6442ad045b6def676bee1b2139e4f83b29229275`, contained 3,111,078 bytes. The downloaded ZIP matched GitHub's SHA-256 and byte count; independent verification was completed on 2026-10-18. Artifact expiry is 2026-10-25 12:26:24 UTC; a local copy was retained. This non-publishing workflow created no public release, version tag or feed update.

## Independently verified material

The release-surface allowlist, all six file hashes and declared sizes, manifest identity/URL/signature, hash sidecar, source lock hashes, generated notices and installer-toolset evidence passed. Archive extraction without executing the installer confirmed the embedded executable version, source LICENSE, notices and five reviewed installer DLL hashes.

| Material | SHA-256 |
|---|---|
| Artifact ZIP | `b86fe7dd8ec0fdee0b2a1dba1bab091e80c1bc2af7e5b55c2d45c908a559787a` |
| Installer `Hytale-Generator-Workbench_0.11.36-rc.7_x64-setup.exe` | `3f0623ba6a79e37888188e0b6185b12fc60b13271b5b7f30fe365a7b1fcbb5b8` |
| Installer signature | `a5f86165883c885c22715b92dc23ce7489b743dcda3135359378db291e624553` |
| Embedded / installed application | `8e8cff846aede0346aaaf739d7dfebeb66227a26dee89d2baccada6bd5a881ca` |
| Embedded / installed LICENSE | `7991b28025bc6b9ed3ea49f189f36a3de7c8b31e83714c52d0d57099928456f2` |
| Embedded / installed notices | `4ac9c6ceb24e0e34a28d8829d6b17490568d97301d41b9ae8bd5dd57b55628d2` |
| npm lock | `3ab3c9fce77c235a47ec354159fa6dfdf98309219a22af85f95f125367f98347` |
| Cargo lock | `3b9afddb1f8d3c142707318142b55535d77b53c91a6b69b5dd927e477004ed20` |

The real Tauri updater signature verified with algorithm `ED`, key ID `6fee5e670300baef` and unchanged public-key file SHA-256 `33374e88c5b4f66546b789e0b20ea568b695364b4a1c84ab64bb25a585b1cc62`. In-memory installer and signature mutations were each rejected by the standalone verifier. This is neither an Authenticode claim nor evidence of negative-signature rejection in the installed client. The fresh Windows distribution evidence still classifies `glib 0.18.5` as `other-target`; no broader advisory clearance is claimed.

The [existing installer-material scope and upstream limits](RC6_CANDIDATE_VERIFICATION.md) remain applicable. No private signing value, dependency resolution or release policy changed for this candidate.

## Installed Discard retest

On 2026-10-22 the owner was asked to manually install rc.7, check About, open the existing four-file synthetic WorldStructure/Biome/Density project, deliberately open two Density file tabs and perform these steps:

1. Change the numeric Value from 1 to 2, press Enter and discard the staged change.
2. Confirm that both the read-only value and editable input immediately return to 1 without restarting.
3. Focus and leave the input without typing; no change must be staged again.
4. Close the project without closing its two file tabs individually, reopen through Recents and confirm that both file tabs and Value 1 return.

The owner replied **“Passt”** to this sequence. This is recorded as owner-confirmed PASS for the listed editor observations, not an independently recorded UI session or blanket acceptance of other cases. After that reply, direct file inspection confirmed installed ProductVersion `0.11.36-rc.7` and exact application/LICENSE/notices hashes above. All four synthetic project files remained byte-identical to their pre-test baseline. The rc.6 Discard failure is therefore closed for this candidate and fixture.

This was a manual installer upgrade, not an rc.6-to-rc.7 updater E2E. The existing [rc.4-to-rc.5 signed update evidence](UPDATER_E2E_RC5.md) remains valid.

## Apply failure found during follow-up

The owner-reported diagnostic export records two failed `/api/project/apply` writes at 2026-10-22 11:46:12 and 11:46:19 UTC, after conflict checks. The error originates in `sync_write`: it wrote the journal, reopened it read-only and called `sync_all`. Windows [FlushFileBuffers](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers) requires a writable file handle. A local Windows/Rust reproduction returned OS error 5 for the read-only handle and succeeded for the writable handle. The same faulty pattern affected staged and committed Apply files.

Source remediation retains the writable handle through write/sync, uses it for staging, and opens the committed target with write access without create/truncate. Sync errors still propagate; recovery ordering, rollback, permission checks and protection of newer external edits remain enforced. Four new native fixtures exercise metadata create/replace, staged replacement, committed sync and failure propagation. Before the fix three failed with OS error 5; after the fix all four passed in an isolated Windows harness using the actual source helpers. The runner sandbox denied rename in its default temporary directory; rerunning the same tests in the task-owned fixture directory passed. This local helper test is not a full installed Apply acceptance.

The installed rc.7 binary remains affected. A new signed candidate and installed Apply/reopen retest are required; no file permissions, user recovery journal or original fixture contents were changed to conceal the failure.

## Remaining acceptance

- **Apply/reopen:** FAIL on installed rc.7. Two write attempts returned status 500; the owner supplied the visible message `Cannot persist Apply recovery journal: Zugriff verweigert (os error 5)`. All four fixture files still matched their baseline and the source Value remained 1. Reopen with a persisted edit was therefore not reached.
- **Windows registration:** NOT VERIFIED for rc.7. The owner did not supply a concrete Windows Installed Apps version in the general confirmation. The earlier rc.6-versus-rc.5 registration discrepancy is not closed by matching the executable version.
- **Other manual cases:** layout preview/cancel, settings/accessibility, representative-project performance, diagnostics and installed updater negative/network/concurrency cases remain as recorded in [Track 18](PRE_1_0_18_FINAL_ACCEPTANCE.md).
- **Publication:** no public rc.7 release or feed change; only Stable and Preview. Track 14 controls and final owner release approval remain separate.

Synthetic editor acceptance does not establish representative-project or in-game correctness. This record does not close Track 18 or authorize Track 19 deletion or public publication.
