# Preview rc.6 — installed acceptance evidence

**Updated:** 2026-10-17. **Status:** PARTIAL — installation/start, lower-version Preview no-offer and a synthetic navigation smoke are confirmed; an installed Discard input-state defect, Windows registration discrepancy and remaining acceptance cases are open.

## Candidate and method

The owner manually installed the independently verified [rc.6 candidate](RC6_CANDIDATE_VERIFICATION.md), built from source `57195937f34ca48914fa85b1ce384652e47aadf2` by protected workflow `38283054735`, job `114924737614`, artifact `11762947762`. Installer SHA-256: `de04e2bebc84c0fe2125d02c1f8c3320df849e8681297c0180000d9df2e14b32`. The committed updater public-key file has SHA-256 `33374e88c5b4f66546b789e0b20ea568b695364b4a1c84ab64bb25a585b1cc62`, key ID `6fee5e670300baef`.

Before installation, the installed rc.5 executable matched SHA-256 `2df801761e0f18152ce18288f262a0c4cb1394570538a948f26de61418786a4a`. The owner reported that rc.6 starts and a Preview check finds no newer update, then separately confirmed that the installer had been fully completed. These are owner-reported UI observations. The agent independently inspected the installed files and running application process afterward; it did not operate or record the installer UI.

This was a manual NSIS installation, **not an rc.5-to-rc.6 updater installation**. No rc.6 tag, public release or feed update was made. The existing [rc.4-to-rc.5 updater evidence](UPDATER_E2E_RC5.md) remains valid.

The host is 64-bit Windows, version `10.0.26200.0`. The active WebView2 version was not verified: the process-parent inspection returned access denied. This limitation was not bypassed.

## Installed files and identity

The installed executable reports product version `0.11.36-rc.6`; the running process uses that installed executable. All four installed files match their actual extracted candidate counterparts:

| File | SHA-256 |
|---|---|
| Application executable | `03cefa69375485b8a71bada94ebe3266fee8620c7b658c1a1bebdb5b3a5a4472` |
| `LICENSE` | `7991b28025bc6b9ed3ea49f189f36a3de7c8b31e83714c52d0d57099928456f2` |
| `THIRD_PARTY_NOTICES.txt` | `4ac9c6ceb24e0e34a28d8829d6b17490568d97301d41b9ae8bd5dd57b55628d2` |
| `uninstall.exe` | `0eb88c3ebf4d6cd39a558408db299a71d9b43a78415cfd547d7d52d593994c2d` |

**Registration discrepancy:** after the completed installation, the current-user uninstall entry still reports `DisplayVersion = 0.11.36-rc.5`. Direct reads through both registry views and the current user's hive agree. The entry points to the same installation containing the verified rc.6 executable and uninstaller. No second Workbench entry was found in the checked current-user/machine uninstall locations. File version, resources and successful startup are confirmed, but full installer/Windows identity parity is **not PASS**. The cause is unverified; no registry value, installer configuration or security setting was changed to conceal it.

## Preview lower-version check

The public [rolling Preview feed](https://github.com/360shvit/NodeEditor-Workbench/releases/download/updater-preview/latest-preview.json) was independently downloaded on 2026-10-15. It still contains `0.11.36-rc.5`, has SHA-256 `82445389f36466ee9fa28bb56cfb369e898320902ab2840dcc8aa303b06d8145`, and names the canonical versioned rc.5 installer. The owner reported no newer update from installed rc.6.

This supports the **lower-version offer rejection** case against the real Preview feed. It does not prove a forced downgrade installation attempt, Stable rejecting a prerelease, signature-negative rejection in the installed client, or recovery from an interrupted download. The client network exchange was not captured independently.

## Synthetic editor acceptance, 2026-10-17

The owner confirmed the About display `v0.11.36-rc.6 · Final Installed Acceptance`, then exercised a disposable four-file synthetic WorldStructure/Biome/Density project. The flow root, two expected node-search matches, graph navigation and project reopening worked. All four files were independently rehashed and remained identical to their pre-test contents. This is a small editor smoke, not representative-project, layout-preview or in-game acceptance.

Only a Biome file tab remained after reopening. Query/tool tabs are intentionally session-only; file/source tabs should restore. The previous complete file-tab set was not recorded, so full multi-file tab restoration is not established.

**Discard defect:** after editing a numeric `Value` from `1` to `2` and choosing Discard, the owner saw the read-only value return to `1` while the editable input still displayed `2`. Reopening/restarting restored the input to `1`. The packaged-component regression reproduced the stale draft before the fix. An obsolete input draft could also be staged again on a later blur; source remediation scopes drafts to project/change revisions, clears a committed input draft and rejects events captured before a reset. The new regression exercises the actual embedded component/hooks/store, including Discard, stale blur, Undo/Redo, removal, Editing toggle and project rebuild.

The existing installed rc.6 candidate predates this fix. Immediate input reset and no restaging must be retested on a newly identified signed candidate; a source test is not an installed PASS. Apply/reopen remains untested, and no public release is authorized by this result.

## Remaining acceptance

Resolve the Windows registration discrepancy and complete the still-open cases in the [Track 18 matrix](PRE_1_0_18_FINAL_ACCEPTANCE.md). The installed-client manipulation test, deterministic network/concurrency cases and version-asset controls remain [Track 14](PRE_1_0_14_UPDATER_RELEASE.md) work. Public publication and final Stable promotion require separate explicit owner approval.

## rc.7 follow-up, 2026-10-22

The [rc.7 candidate and installed editor retest](RC7_INSTALLED_ACCEPTANCE.md) closes the Discard input-state defect on the same synthetic fixture: immediate input reset, no restaging and two-file-tab restoration were owner-confirmed, with independently unchanged project hashes. The rc.6 observations above remain historical evidence. Windows registration and the remaining manual matrix are still open.
