# Preview rc.8 — Windows Apply persistence acceptance

**Updated:** 2026-10-24. **Status:** PASS for signed-candidate material verification, installed identity, synthetic Apply/reopen, documented settings persistence, Normalize preview/cancellation, scoped accessibility smoke, diagnostic export/content inspection, representative-project navigation and the benign read-failure/recovery smoke below. Track 09's Windows persistence blocker is closed; overall Track 18 acceptance remains open.

## Candidate and automated evidence

Version `0.11.36-rc.8-r1` / updater `0.11.36-rc.8`, milestone **Windows Apply Persistence**, contains the [Windows file-sync correction](https://github.com/360shvit/NodeEditor-Workbench/pull/49) and [rc.8 identity update](https://github.com/360shvit/NodeEditor-Workbench/pull/50). Exact candidate source: `4ccc77b1bb5f80b89cc9286372d9d779a562a10b`, tree `10b2e6bdde4bae4ab33a8c074f4572fa1735da81`.

Both PRs passed their required Windows and Dependency Approval checks before protected squash merges. [Post-merge Windows CI](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/39996992390) passed on that exact source. The owner approved the protected `release` environment for [Validate Release Candidate #13](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/39997158411), job `120563565250`, which succeeded on 2026-10-23.

Candidate logs confirm **93/93** self-contained regression suites, **250** soak cycles and **43** native tests, including all four new writable-file-sync regressions. Release-integrity checks, **249** notice entries / **164** legal texts, **442** reviewed installer-toolset files, NSIS packaging and the six-file Preview surface also passed.

Artifact `12521836243`, named `release-candidate-4ccc77b1bb5f80b89cc9286372d9d779a562a10b`, contained 3,110,585 bytes. Its downloaded byte count and SHA-256 matched GitHub on 2026-10-24. Artifact expiry is 2026-10-30 18:04:51 UTC; a local copy was retained. This workflow did not publish a release, version tag or update feed.

## Independent material verification

The six-file surface allowlist, all hashes/sizes, manifest identity/URLs, hash sidecar, source lock hashes, notices/distribution evidence and toolset index passed independent checks. The actual Tauri updater signature verified with algorithm `ED`, key ID `6fee5e670300baef` and unchanged public-key file SHA-256 `33374e88c5b4f66546b789e0b20ea568b695364b4a1c84ab64bb25a585b1cc62`.

Archive extraction without executing the installer confirmed embedded ProductVersion `0.11.36-rc.8`, source LICENSE, generated notices and all five reviewed installer DLL hashes. No Authenticode verification is claimed. Standalone in-memory payload/signature mutations were rejected; this is not an installed-client negative-signature test. The Windows distribution evidence still classifies `glib 0.18.5` as `other-target`, without claiming broader advisory clearance. The [agreed installer-material scope](RC6_CANDIDATE_VERIFICATION.md) remains applicable.

| Material | SHA-256 |
|---|---|
| Artifact ZIP | `ac8b639cbeb661c93d1c0656be6481d274b2b9c670c88e958cd96cc0bbe1b321` |
| Installer `Hytale-Generator-Workbench_0.11.36-rc.8_x64-setup.exe` | `4d41c791abe27f2603e188aafb443a9e011babf3b5cc163a1ff3adeefa303a76` |
| Installer signature | `602268e5ffac23a3451793cf32bf485adf3e36aa8f8726dac0319c80b979e5f2` |
| Embedded / installed application | `419258ec96aa80b543060094eb218bedac75e7f91ce372390a26ad67439413e2` |
| Embedded / installed uninstaller | `7f454a06550e0d112addf23e2da34d72a9b6983e3fd4342fc830ca78f4566259` |
| Embedded / installed LICENSE | `7991b28025bc6b9ed3ea49f189f36a3de7c8b31e83714c52d0d57099928456f2` |
| Embedded / installed notices | `4ac9c6ceb24e0e34a28d8829d6b17490568d97301d41b9ae8bd5dd57b55628d2` |
| npm lock | `4c48d822ec12a2d527e350e0001a46a44bf377f6c12a98c5f2dc02d8f7d8ad49` |
| Cargo lock | `1f5a53d05735740ad3d16258d528cb5b19791845355bef109b0834dba0d7dbbc` |

## Installed Apply/reopen retest

On 2026-10-24 the owner was asked to complete the rc.8 installer, check About, open the existing four-file synthetic generator project, change `SmokeSource.json` Value from 1 to 2, press Enter, complete Apply, close the project and reopen it through Recents. The expected outcome was Value 2 with no error and no pending changes. The owner explicitly replied **“rc.8: Apply und Wiederöffnen erfolgreich”** to that sequence.

Independent read-only inspection after the reply confirmed:

- Installed application and uninstaller ProductVersion are both `0.11.36-rc.8`; application, uninstaller, LICENSE and notices match the extracted candidate byte-for-byte.
- Only `SmokeSource.json` changed. Its persisted Value is 2. Reversing only that numeric literal in memory reproduces the exact pre-test SHA-256, proving that no additional bytes changed in the file.
- The other three fixture files remain byte-identical to their pre-test baseline.
- The agent did not edit the fixture, reset its Value, delete recovery metadata or change filesystem permissions. Value 2 was left in place.

| Synthetic file | Before SHA-256 | After SHA-256 |
|---|---|---|
| `SmokeSource.json` | `862eee4b084f5564b9237f748b90d9b4c67f7b30ef575a5f749c4fd52b15cb64` | `cd5d4fbe70a2f728028a3810e92525e3630960461b33a156c4ea8ec7438a64ac` |
| `SmokeUse.json` | `47071d0dbe567b349d7b2fa84b2d0cc6c019fbc05018adf374fa918bb01cbc3e` | unchanged |
| `HGW_RC6_Biome.json` | `1284c410b5b85132d9c8fc5c96949136281bf2dfbc4077b8a12f4587cec5e0f8` | unchanged |
| `HGW_RC6_World.json` | `d2b79685b07bd5f338b8a521544356bf76435622bb07cebf0c8de9e047c117a1` | unchanged |

UI behavior is owner-reported; file identity and persistence are directly checked. Together with the source regression evidence, this closes the [09-D Windows Apply persistence defect](PRE_1_0_09_APPLY_TRANSACTION_RECOVERY.md). The [rc.7 failure](RC7_INSTALLED_ACCEPTANCE.md) remains recorded as a historical failure, not retroactively marked successful.

## Windows registration, settings and Layout follow-up

The owner supplied a Windows Programs and Features screenshot showing **Hytale Generator Workbench**, version `0.11.36-rc.8` and installation date 2026-10-24. Direct inspection of that screenshot confirms that the current Windows registration matches the already verified installed application and uninstaller. This closes the current registration discrepancy; the cause of the historical rc.6/rc.5 mismatch is not established. No registry values were modified.

For settings persistence, the owner was asked to change UI scale, sidebar width, non-maximized window size/position and split ratio, fully close/restart the application, reopen the project through Recents and enable Split Workview again. The owner affirmed the sequence and specifically confirmed that the split returned to its previous position. This is **PASS as owner-reported installed behavior**; exact numeric values were not supplied. Split mode itself intentionally starts disabled. No theme setting, maximized-state transition or multi-monitor behavior is claimed by this test.

For Layout, the owner kept Editing Off, selected **All graph files → Normalize → Generate proposal**, changed the file selection through **Choose files in Explorer…**, cancelled that selection change and closed the Layout results tab. The owner explicitly confirmed the requested outcome: the preview worked, cancellation retained the original selection and Changes remained empty. This is **PASS for the synthetic Normalize preview and selection-cancellation sequence**; no proposal was staged or applied.

Independent file-hash checks after both sequences confirmed that all four files still matched the post-Apply hashes above, including `SmokeSource.json` Value 2. Project files and recovery metadata were not modified by the agent. These checks do not extend the result to representative projects or other layout strategies.

The documentation-only [PR #51](https://github.com/360shvit/NodeEditor-Workbench/pull/51) retained the tested application source. Its [post-merge Windows CI](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/40094574235) also succeeded on exact commit `7b2993fd0ac9db1934056acdc0a63ddd31293130`.

## Keyboard, Narrator and contrast follow-up

The owner confirmed visible focus navigation within Settings, category activation with Enter, end-to-start Tab wrapping, Escape dismissal and immediate reopening with Enter after focus returns to the original Settings button. Category focus alone does not activate a page. Reopening initializes the temporary Settings page to Appearance; the owner accepted this behavior, and it does not reset persisted application preferences. The Settings keyboard smoke is **PASS as owner-reported installed behavior**.

The owner then confirmed understandable Windows Narrator labels while navigating Settings categories and UI-scale buttons, and readable text, focus outlines and selected categories/file tabs under Windows contrast mode. Both scoped checks are **PASS as owner-reported**. Exact spoken strings, pressed-state narration and contrast palette were not independently captured. This is not a comprehensive accessibility-conformance claim or a claim about every dialog, control and palette.

## Diagnostic save/cancel and report inspection

With the synthetic project open, project-relative paths disabled and recent logs/performance enabled, the owner cancelled the Windows save dialog once and then saved a diagnostic JSON. The owner explicitly confirmed both cancellation and saving. The expected cancellation message was **Save cancelled. No report was saved.** The file did not exist before the test and was directly inspected afterward; cancellation UI behavior remains owner-reported.

The saved report contains **56,281 bytes**, SHA-256 `3e1ddc4d361126478f7c130b2cad2e2a32ec070773324dd0705779d3e6a3ad95`, schema 8, desktop application version `0.11.36-rc.8-r1` and generation time 2026-10-24 15:43:01.347 UTC. Its privacy flags retain boolean types: project contents/paths disabled, logs/performance enabled, automatic upload false. It includes **96 events, 56 performance metrics and 20 traces**, with **zero error and warning events**.

Independent recursive inspection of 571 string values and field names found no known fixture contents, symbols, filenames or project/user paths, no unredacted path fields, and no raw error-text/stack fields or credential patterns in this report. Raw fixture documents were absent, and all four project-file hashes still matched the post-Apply baseline above. The raw JSON and local filesystem paths remain private; only the result and report digest are published.

The installed save/cancel and this report's identity/options/content checks are **PASS**. This report contains no error events; the later error-report test below separately covers one benign read failure. Clipboard interaction, low-memory behavior, arbitrary unseen data and future reports are outside this observation. The `automaticUpload:false` field is report metadata, not a new network-capture proof. No log clearing or deliberate damage to the valid project was used.

The preceding documentation-only [PR #52](https://github.com/360shvit/NodeEditor-Workbench/pull/52) also passed [post-merge Windows CI](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/40096352424) on exact commit `2b6edeef7e538347613be066fc133b85a5c5db8b`; the tested application binary remains the rc.8 candidate identified above.

## Representative-project navigation and measured operations

On 2026-10-24 the owner used a separate, initially byte-identical copy of a real generator project with Editing Off. The requested sequence was project open, search and navigation to a known symbol, Project Graph root selection/fit/pan/zoom, close/reopen through Recents, and diagnostic export with project paths disabled. The owner explicitly confirmed **all steps worked and the report was saved**. No hangs or blocking diagnostics were reported.

Independent comparison confirmed that all **196 files / 7,566,927 bytes** in both the copy and the original still matched the private pre-test baseline, with no added or missing files. The installed report identifies **16 semantic files, 1,955 nodes, 84 symbols and 213 semantic references**. Its project diagnostics are 11 errors, 2 warnings and 26 informational entries, matching the earlier core preflight's severity counts; these are distinct from runtime failures. The report contains **240 runtime events, 68 metrics and 20 traces**, with **zero runtime error or warning events**.

The report spans earlier operations as well. The following durations are selected from the two trace-linked opens with the expected 196-file inventory and the subsequent graph operation, rather than the mixed-session averages:

| Operation | Observed duration |
|---|---|
| Native open after folder selection | 20.90 ms |
| Frontend model build for that open | 43.10 ms |
| Recents reopen through model/workspace restoration | 84.90 ms |
| Native portion of that Recents reopen | 22.45 ms |
| Frontend model build for that Recents reopen | 38.10 ms |
| Project Graph build / layout | 0.50 / 0.30 ms; rendered graph model has 36 nodes and 60 edges |

The folder-picker open total of 30,732.2 ms includes waiting for the owner's selection; source inspection confirms the request starts before the native blocking picker. It and the derived bridge-overhead metric are not pure loading benchmarks. Search/camera aggregates span the application session and are not isolated to this project. Camera commit instrumentation ends at a React layout effect; it does not measure presented-frame latency or FPS. Peak process/WebView memory was not measured. These single-machine observations do not establish worst-case performance or a graph rendering all 1,955 project nodes at once.

The saved schema-8 rc.8 desktop report was generated at **2026-10-24 16:04:12.183 UTC**, contains **114,971 bytes**, and has SHA-256 `a686b28cef160ae89774c86bb078f1d7f046ca5f9609b7c25891f08f1605d12e`. Privacy options match the requested booleans. Recursive inspection of **1,294 string values** and field names found no known private project/path/content markers, unredacted path fields, raw error/stack fields or credential patterns. The raw report, project identity and per-file baseline stay local. This is a bounded inspection of this report, not a guarantee about every future input or a failure-report test.

Open/search/graph/reopen is **PASS for this owner-operated real-project smoke**, supported by the report and unchanged-file checks. The overall performance row remains **PARTIAL** because peak memory and presented-frame latency are unmeasured. No real-project Apply or additional layout strategy was exercised.

## Benign read failure, recovery and error-report privacy

A separate disposable project contained one two-byte file with deliberately invalid UTF-8 under a recognized semantic JSON directory. Neither valid project was modified to provoke the failure. The owner opened this fixture with Editing Off and confirmed the expected local **not valid UTF-8** error, successful return to the good project through Recents, continued usability and diagnostic saving with project paths disabled.

The inspected schema-8 rc.8 report was generated at **2026-10-24 16:14:08.344 UTC**, contains **143,397 bytes**, and has SHA-256 `da87b6d9cebf26cf397b0ca671d3d11d8721546ff3f7e7b4036a70a471484810`. Its **317 events, 68 metrics and 20 traces** include exactly three error records for **one failed open**: `desktop.request.failed` with `/api/project/open` status 500, `project.open.trace-failed`, and `project.open.failed`. The failed trace has no completion event. A subsequent Recents trace successfully opens the expected 196-file project in 92.9 ms. There are no warning events; the pre-existing project-diagnostic counts remain unchanged.

Recursive inspection of **1,673 strings** and field names found no malformed-fixture filename, raw expected error text, known private project/path/content markers, unredacted path fields, raw stack fields or credential patterns. Both original and test-copy inventories still contain exactly 196 baseline-matching files; all four synthetic fixture hashes also match their post-Apply baseline. The malformed fixture's two bytes are unchanged. The raw report and local paths remain private.

The diagnostics/privacy matrix case is **PASS for this scoped benign read-failure, recovery and report-export sequence**. The exact local message and UI usability are owner-confirmed; the independently inspected report proves operation/category recording and omission of the known raw error/filename markers. This does not extend to every runtime failure, fatal-crash recovery, memory exhaustion or updater fault.

## Remaining acceptance boundaries

- Apply/reopen acceptance is a synthetic single-file case. The separate representative-project smoke covers read-only navigation, not real-project writes, abrupt power loss or installed concurrency.
- Prior rc.7 Discard/two-file-tab evidence and rc.4-to-rc.5 updater evidence are retained for their tested versions. This manual rc.8 installation is not a new updater E2E.
- Installed signature-negative, network/interruption, download-time concurrency, Stable/downgrade and remaining manual UI cases stay as recorded in [Track 18](PRE_1_0_18_FINAL_ACCEPTANCE.md).
- Track 14 and Track 18 remain open. Track 19 deletion and public release publication are not authorized by this result.
