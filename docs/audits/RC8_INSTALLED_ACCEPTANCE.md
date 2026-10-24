# Preview rc.8 — Windows Apply persistence acceptance

**Updated:** 2026-10-24. **Status:** PASS for signed-candidate material verification, installed identity, Apply/reopen, documented settings persistence and Normalize preview/cancellation on the synthetic fixture. Track 09's Windows persistence blocker is closed; overall Track 18 acceptance remains open.

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

## Remaining acceptance boundaries

- This is a synthetic single-file Apply/reopen case, not representative-project, abrupt-power-loss or installed concurrency acceptance.
- Prior rc.7 Discard/two-file-tab evidence and rc.4-to-rc.5 updater evidence are retained for their tested versions. This manual rc.8 installation is not a new updater E2E.
- Installed signature-negative, network/interruption, download-time concurrency, Stable/downgrade and remaining manual UI cases stay as recorded in [Track 18](PRE_1_0_18_FINAL_ACCEPTANCE.md).
- Track 14 and Track 18 remain open. Track 19 deletion and public release publication are not authorized by this result.
