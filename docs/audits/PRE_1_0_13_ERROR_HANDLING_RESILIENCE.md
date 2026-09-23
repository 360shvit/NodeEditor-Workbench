# Pre-1.0 Audit 13 — Error handling & resilience

**Status:** PASS — reviewed findings remediated; normal Windows PR CI passed.
**Reviewed baseline:** PR #25 after Track 12, `ff84304357c8d6c11f02922f8cb43c386775f9d0`.
**Scope:** fatal UI fallback, native error/cancellation propagation, malformed input, async support-report saves, layout failures, project close/exit, optional storage and update-check recovery.

## Error taxonomy and recovery paths

| Failure / boundary | User-visible outcome and retained state |
|---|---|
| Native picker cancellation | Explicit null picker results produce HTTP-style 204 or a cancelled save result. They do not claim a write succeeded. |
| Native I/O, authority or OS error | The fixed-command bridge returns 500 with an error message. Folder-open callers retain the current workspace on failure. An error containing the substring `cancel` remains an error. |
| Malformed project JSON / duplicate node identity | The parser retains source text and a parse error with no fabricated semantic nodes. A corrected input can be parsed again. Parsing does not write files. Existing core/refactor gates remain active. |
| Preview / WorldGen read failure | Preview resets its prior data and rejects stale completions after selection changes. WorldGen shows an error and can retain the last successful report for the same selection; Refresh now or the 60-second poll retries. Selection tokens reject stale results/errors. Track 11 owns native scan bounds and cooperative cancellation. |
| Layout generation / staging failure | A local alert replaces an escaping exception; the failed proposal is invalidated. Generation can be retried. Failure before the store commit preserves the existing ChangeSet. |
| Project close / application exit failure | The lifecycle UI catches rejected actions and shows a dismissible error. Frontend project state is cleared only after native close succeeds. A failed Discard & Close retains the staged ChangeSet. |
| Support-report save | The UI awaits the native selected-target write. It reports saved, cancelled or failed, suppresses duplicate saves while pending, and restores the save button after failure. No premature exported event is recorded. |
| Update check / optional channel storage | Failed checks clear stale install offers and release the busy state for retry. Storage read/write exceptions fall back to the in-memory channel. An explicit stable preference survives a preview-default build. Native channel/signature/installed-build gates are unchanged. |
| Fatal render exception | The root fallback works for falsey exceptions and malformed error objects without arbitrary string coercion. It offers a caught/awaited diagnostic save. Reload requires a second explicit action explaining loss of staged edits and Undo/Redo. |

Global error/rejection diagnostics remain sanitized by Track 12. Raw messages are allowed only in local interactive error UI, not in support JSON or persistent application logs. `userFacingError.ts` bounds displayed text and tolerates throwing accessors; it is not a diagnostic serialization path.

## Findings and remediation

1. **Must-fix before 1.0 — remediated:** the bridge treated any rejection whose text contained `cancel` as user cancellation. A read error for `C:/Projects/cancelled/World.json` reproduced a misleading 204 on project open. Cancellation now comes only from explicit picker results; real native failures remain visible.
2. **Must-fix before 1.0 — remediated:** report saves returned before the native picker/write and could record success despite cancellation or disk failure. A dedicated fixed-command diagnostic save bridge now exposes the write outcome to both Settings and the fatal fallback. Existing opaque target tokens and staged native file replacement remain authoritative.
3. **Must-fix before 1.0 — remediated:** the fatal fallback incorrectly promised that project files had not been modified and immediately reloaded on one click. Its copy now acknowledges earlier/in-progress writes; reload requires confirmation. The fallback also handles non-Error and falsey thrown values.
4. **Hardening — remediated:** layout handlers rethrew recoverable failures, while close/exit promises could reject without local recovery UI. Both now expose errors and leave a retry path. Fixtures verify no premature ChangeSet/project-state clearing on the exercised failures.
5. **Hardening — remediated:** optional update-channel storage exceptions could break Settings, stored stable was ignored with a preview default, and a failed recheck left an old install offer visible. Storage access is guarded, both explicit channels are respected, and a new check invalidates the previous result.

## Repeatable evidence

`test:pre1-error-resilience` executes the shipped bridge and committed embedded AMD modules. It covers native cancellation versus errors across open/recent/Apply/export/WorldGen/update routes; malformed rejection objects; support-save cancellation, blocked writes, successful completion, disk failure and missing native bridge; fatal fallback exceptions and reload confirmation; storage denial; failed update rechecks; close/exit/discard failures and retry; malformed JSON correction; layout generation/staging failure and retry.

Component handlers run in a deterministic hook-state fixture with controlled I/O. This proves state transitions and promise outcomes, not WebView rendering, focus, OS dialogs or a signed installed-client update. Existing Track 09/10 transaction/recovery and I/O gates remain the write-safety evidence; this track does not replace them with UI assertions.

Local strict app TypeScript, the new gate, privacy, frontend architecture and lifecycle checks passed. The local matrix passed 78 of 86 registered suites; eight existing suites hit this host's subprocess `EPERM` restriction (including compiler-dependent assertions with a null exit status). No failed gate was removed or weakened.

Normal [Windows PR validation](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/35917017907) and [Dependency Approval](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/35917015502) passed on implementation commit `8eac1914323944cf1db968dbaad07b0b69c3b74e`. The Windows job verified **86/86 self-contained regression suites**, **250 packaged-bundle soak cycles**, **34/34 locked native tests**, strict app TypeScript, release/embedded parity, third-party/notice gates and **zero unused source carry**. This is the full validation evidence for the locally restricted suites.

## Accepted limits and follow-up

- A fatal UI error does not roll back prior writes or cancel an already running native operation. Reload discards in-memory staged changes and history; there is no crash-session restoration. Track 09 journal recovery remains responsible for interrupted Apply.
- There is no whole-operation rollback for arbitrary frontend store failures after a commit starts, nor for multi-file folder output; the explicit Track 09/10 guarantees and limits apply.
- Native error text can contain project paths/content in the local error display. Diagnostics intentionally omit that text. Reports therefore prioritize operation/category evidence over full exception details.
- WorldGen may display the last successful report with an error after a failed refresh. There is no automatic repair of malformed project files or logs.
- No frontend timeout pretends to cancel native writes. The UI awaits a real native result; a stuck OS dialog or storage operation can remain pending. Saving diagnostics during native failure is best effort.
- Signed installed-client offline/network/signature/download/restart behavior, real dialog/clipboard interaction and fatal-screen usability remain Tracks 14/18 acceptance. They are not verified by this synthetic gate or an unsigned PR build.

No dependency, lockfile, license, signing key, release identity, native command authority, workflow, runner or Action pin changed. No merge, tag or public release is performed.

Track 13 is complete within the reviewed scope and explicit limits above. **Next:** Track 14 — updater, signing & release pipeline.
