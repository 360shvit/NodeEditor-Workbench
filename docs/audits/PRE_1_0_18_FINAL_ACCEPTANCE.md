# Pre-1.0 Audit 18 — Final installed acceptance

**Status:** BLOCKED — signed rc.8 candidate/material and installed Apply/reopen confirmed; Windows registration and the remaining manual/updater cases are open.
**Prepared:** 2026-10-04, source baseline `c350ca6817aac94a21d4b999f79b9e097c7d84ca`.

At preparation, published/installed `0.11.36-rc.5` and the same-version Track 15 build did not contain later dependency/notice changes. Do not install that same-version build as a new update or replace the published assets. The rc.6 candidate now contains the completed source audits and has a fresh SemVer, successful required CI and an approved protected signing build. Publication and final Stable promotion remain separate owner approvals.

## Evidence record

**Candidate and first installed checks, 2026-10-15:** [rc.6 verification](RC6_CANDIDATE_VERIFICATION.md) records exact source `57195937f34ca48914fa85b1ce384652e47aadf2`, protected run `38283054735`, installer/signature/lock hashes and actual embedded license/notices. Candidate packaging is PASS. The [installed acceptance record](RC6_INSTALLED_ACCEPTANCE.md) confirms the owner's completed manual installation/start and Preview no-offer against the older rc.5 feed, independently matching installed files, and an unresolved Windows registration mismatch. This is not an rc.5-to-rc.6 updater E2E. The successful installed rc.4-to-rc.5 evidence is retained.

For each run record date, exact source SHA, workflow/job and artifact identity, installer hash, public-key fingerprint, installed version before/after, Windows/WebView2 environment and whether each observation was direct or owner-reported. Use an expendable copy of a representative generator project; record its initial/final file hashes privately. Public results must omit personal paths, project contents and raw support logs. Mark cases PASS, FAIL, NOT RUN or BLOCKED individually.

**rc.7 follow-up, 2026-10-22:** [candidate and installed editor acceptance](RC7_INSTALLED_ACCEPTANCE.md) records the successful protected build, independent material checks, exact installed rc.7 application/resources and owner-confirmed immediate Discard reset, no restaging and two-file-tab restoration. All four fixture files remained unchanged. This closes the rc.6 Discard defect on the tested synthetic fixture; the subsequent Apply test exposed OS error 5 while persisting the recovery journal. Its source fix still requires a new signed candidate/retest. Windows registration and other manual cases remain open.

**rc.8 follow-up, 2026-10-24:** [signed candidate and installed Apply acceptance](RC8_INSTALLED_ACCEPTANCE.md) closes that Apply blocker. The owner confirmed successful Apply/reopen; direct inspection matched installed application/uninstaller/LICENSE/notices to rc.8 and proved that only the intended Value changed from 1 to 2 in one fixture file. All three other files were unchanged. This is synthetic single-file acceptance; Windows registration and the untested cases below remain open.

## Manual matrix

| Case | Required observation | Current evidence |
|---|---|---|
| Installer/identity/resources | Candidate installs; About and Windows registration match; license/notices match generated evidence | PARTIAL: rc.8 installation/About/Apply sequence confirmed by owner; installed application/uninstaller/LICENSE/notices match candidate. Windows registration version remains unverified; earlier rc.6/rc.5 discrepancy unresolved |
| Open/reopen and Explorer | Selected project opens; expected files/tabs; recent project reopens the same content | PASS for synthetic rc.7 fixture: owner confirms project reopening with both explicitly opened file tabs; four file hashes unchanged. Representative-project acceptance remains open |
| Search and references | Text/symbol/reference searches navigate to the expected file/node | PARTIAL: synthetic rc.6 fixture root/search/navigation confirmed; broader reference cases not run |
| Graph and layout | Pan/zoom/select, switch views, layout preview and cancel; no unintended file writes | PARTIAL: synthetic graph navigation confirmed, all four files unchanged; layout preview/cancel not run |
| Stage/discard | Make a disposable change; Changes shows it; discard immediately resets both displayed values without later restaging and leaves disk hashes unchanged | PASS on installed rc.7 synthetic fixture: owner confirms immediate reset of both displayed values and no later restaging; four disk hashes unchanged. Prior rc.6 failure retained in its historical record |
| Apply/reopen | Apply an intentional fixture edit; only intended file changes; reopen shows persisted result | PASS on installed rc.8 synthetic fixture: owner confirms successful Apply/reopen with Value 2 and no pending changes; direct file comparison proves only the intended Value 1-to-2 edit. The rc.7 failure remains in its historical record |
| Split/settings/persistence | Scale, resize, tabs, theme and window geometry; documented settings survive restart | NOT RUN |
| Keyboard/Narrator/High Contrast | Keyboard access, visible focus, dialog focus restore, useful Narrator labels and readable selected states | NOT RUN; source contracts alone do not prove this |
| Diagnostics/privacy | Trigger a benign failure, save report after reviewing contents; no project text or unsafe paths | NOT RUN |
| Performance/large project | Representative fixture remains responsive; record project size, memory and frame/interaction observations | Automated budgets exist; installed measurement NOT RUN |
| Valid signed update/restart/recheck | Update installs and restarts; equal version is not offered again | rc.4-to-rc.5 owner-confirmed; retain [existing evidence](UPDATER_E2E_RC5.md), do not repeat just for this matrix |
| Invalid signature | Installed client rejects altered payload/signature before launching installer; installed binary and staged fixture remain usable/unchanged | BLOCKED: safe setup not yet approved/executed |
| Network/interruption/retry | Scoped check/download fault gives recoverable failure; valid retry works; no unexpected restart | NOT RUN |
| Download-time edits/Apply | Deterministically pause download, introduce edits/transaction, prove final installation gate holds | NOT RUN; a timing guess is insufficient |
| Stable/Preview/downgrade | Stable rejects prerelease; lower/equal versions cannot install | Same-version Preview case passed on rc.5; owner-confirmed rc.6 no-offer against independently verified lower rc.5 feed. Stable rejection and forced downgrade installation NOT RUN |
| Uninstall/reinstall | Explicitly scheduled owner test; behavior for settings/project files matches the stated uninstall choice | NOT RUN; do not uninstall the owner's working app during source audit |

## Manipulation-test boundary

The installed client accepts only compiled HTTPS GitHub endpoints and versioned installer URLs. A local verifier, mock native test or arbitrary local manifest is not this test. A concrete fault-injection setup must preserve the real key and signature/HTTPS/URL checks and keep damaged bytes out of public feeds. A per-process interception approach, if selected, needs a reviewed endpoint scope, certificate/proxy cleanup plan and explicit approval before any trust-store or proxy change. No such change is made by this plan. No QA product, channel, installation or repository is introduced.

## Final exit gates

Close Track 14 installed/security/governance proof and Track 16 signed-candidate material verification, complete the matrix on an identified final candidate, verify protected release controls and private vulnerability reporting, and obtain owner sign-off on remaining known limits. The owner's 2026-10-10 decision treats unavailable historical upstream build details as a documented audit limit; no external inquiry or response is required. A green source build does not close this track. Then perform the reviewed Track 19 cleanup and present the release-gate report before seeking explicit public release approval.
