# Pre-1.0 Audit 18 — Final installed acceptance

**Status:** BLOCKED — matrix prepared; final candidate and remaining manual evidence are absent.
**Prepared:** 2026-10-04, source baseline `c350ca6817aac94a21d4b999f79b9e097c7d84ca`.

The existing published/installed `0.11.36-rc.5` and the same-version Track 15 build do not contain later dependency/notice changes. Do not install that same-version build as a new update or replace the published assets. A final candidate needs the completed source audits, a fresh SemVer, successful required CI and an approved protected signing build. Publication and final Stable promotion remain separate owner approvals.

## Evidence record

For each run record date, exact source SHA, workflow/job and artifact identity, installer hash, public-key fingerprint, installed version before/after, Windows/WebView2 environment and whether each observation was direct or owner-reported. Use an expendable copy of a representative generator project; record its initial/final file hashes privately. Public results must omit personal paths, project contents and raw support logs. Mark cases PASS, FAIL, NOT RUN or BLOCKED individually.

## Manual matrix

| Case | Required observation | Current evidence |
|---|---|---|
| Installer/identity/resources | Candidate installs; About and Windows registration match; license/notices match generated evidence | rc.5 end state verified; final candidate NOT RUN |
| Open/reopen and Explorer | Selected project opens; expected files/tabs; recent project reopens the same content | NOT RUN on final candidate |
| Search and references | Text/symbol/reference searches navigate to the expected file/node | NOT RUN |
| Graph and layout | Pan/zoom/select, switch views, layout preview and cancel; no unintended file writes | NOT RUN |
| Stage/discard | Make a disposable change; Changes shows it; discard leaves disk hashes unchanged | rc.5 update fixture partly covered; final candidate NOT RUN |
| Apply/reopen | Apply an intentional fixture edit; only intended file changes; reopen shows persisted result | NOT RUN |
| Split/settings/persistence | Scale, resize, tabs, theme and window geometry; documented settings survive restart | NOT RUN |
| Keyboard/Narrator/High Contrast | Keyboard access, visible focus, dialog focus restore, useful Narrator labels and readable selected states | NOT RUN; source contracts alone do not prove this |
| Diagnostics/privacy | Trigger a benign failure, save report after reviewing contents; no project text or unsafe paths | NOT RUN |
| Performance/large project | Representative fixture remains responsive; record project size, memory and frame/interaction observations | Automated budgets exist; installed measurement NOT RUN |
| Valid signed update/restart/recheck | Update installs and restarts; equal version is not offered again | rc.4-to-rc.5 owner-confirmed; retain [existing evidence](UPDATER_E2E_RC5.md), do not repeat just for this matrix |
| Invalid signature | Installed client rejects altered payload/signature before launching installer; installed binary and staged fixture remain usable/unchanged | BLOCKED: safe setup not yet approved/executed |
| Network/interruption/retry | Scoped check/download fault gives recoverable failure; valid retry works; no unexpected restart | NOT RUN |
| Download-time edits/Apply | Deterministically pause download, introduce edits/transaction, prove final installation gate holds | NOT RUN; a timing guess is insufficient |
| Stable/Preview/downgrade | Stable rejects prerelease; lower/equal versions cannot install | Same-version Preview case passed; other cases NOT RUN |
| Uninstall/reinstall | Explicitly scheduled owner test; behavior for settings/project files matches the stated uninstall choice | NOT RUN; do not uninstall the owner's working app during source audit |

## Manipulation-test boundary

The installed client accepts only compiled HTTPS GitHub endpoints and versioned installer URLs. A local verifier, mock native test or arbitrary local manifest is not this test. A concrete fault-injection setup must preserve the real key and signature/HTTPS/URL checks and keep damaged bytes out of public feeds. A per-process interception approach, if selected, needs a reviewed endpoint scope, certificate/proxy cleanup plan and explicit approval before any trust-store or proxy change. No such change is made by this plan. No QA product, channel, installation or repository is introduced.

## Final exit gates

Close Track 14 installed/security/governance proof and Track 16 signed-candidate material verification, complete the matrix on an identified final candidate, verify protected release controls and private vulnerability reporting, and obtain owner sign-off on remaining known limits. The owner's 2026-10-10 decision treats unavailable historical upstream build details as a documented audit limit; no external inquiry or response is required. A green source build does not close this track. Then perform the reviewed Track 19 cleanup and present the release-gate report before seeking explicit public release approval.
