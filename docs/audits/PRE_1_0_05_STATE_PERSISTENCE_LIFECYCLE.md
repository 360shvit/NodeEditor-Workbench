# Pre-1.0 Audit 05 — Application State, Persistence & Lifecycle

**Status:** PASS  
**Baseline:** audit branch derived from `v0.11.36-rc.3`  
**Gate:** `npm run test:pre1-state-persistence-lifecycle`

## Scope

This track reviews Zustand state ownership, per-project session persistence, recent-project persistence, pane/tab ownership, close/reopen/reset behavior, staged edit lifetime, project switching, desktop exit handling, file-watcher state, stale project references, and malformed/corrupt local persistence.

The required safety outcome is stronger than “state restores”: persisted UI state may restore when still meaningful, while edit authority, previous file contents, stale file ids and project-A runtime state must never silently reappear in project B or after process restart.

## State ownership map

| State family | Authority / lifetime | Persistence policy |
|---|---|---|
| Project model and source inventory | Current filesystem/workspace scan | Never persisted as authoritative content; project is rebuilt on open |
| `changeSet`, staged Undo/Redo, `editing` | Current in-memory project session | Never persisted; reset on successful project open, close and post-apply rebuild |
| Open file/source editors | Per-project UI context | Persisted by stable project-relative paths, remapped against the newly scanned project |
| Navigation history / focused node / recently closed files | Per-project UI context | Persisted by paths; stale/missing files or nodes are dropped/downgraded on restore |
| Explorer/filter/search context | Per-project UI context | Persisted with bounded normalization |
| Visual Layout / canonical Project Graph settings | Per-project UI context | Persisted with validated enums/numeric bounds; graph viewport zoom is clamped |
| Split pane assignment / active pane / split enabled | Workbench session only | Intentionally not persisted; a newly opened project starts in primary single-pane mode |
| Query/tool tabs | Workbench session only | Intentionally not persisted; only file/source editor context restores |
| Recent projects | Global convenience metadata | Bounded to 20 entries; project content is always rescanned and native access is re-authorized as required |
| Developer mode / detailed logging / appearance/layout preferences | Global app preference | Persist separately from project session state |
| Watcher debounce queue/error/external-change notice | Current desktop project root only | Never crosses a `projectRoot` boundary |

## Reset / transition matrix

| Transition | Edit state | Project UI session | Pane/runtime state | Watcher state |
|---|---|---|---|---|
| Reopen same project after restart | Empty staged edits/history | Valid path-based context restores | Primary single pane; transient tool/query state rebuilt | Fresh |
| Switch A → B | Cleared only after B open succeeds | B session restored independently | Primary single pane | Timer/queued paths/generation notice/error reset at root boundary |
| Failed project picker/scan | Preserved in A | A remains authoritative | A remains active | A remains active |
| Close project | Cleared | Stored UI context remains available for later reopen | Tabs/navigation/selections reset | Notice cleared; desktop host closes watcher |
| External reload in same project | Unaffected changes remap by path; affected changes/history are invalidated | Current UI identities remap by path | Existing valid tabs/navigation retained | Same-root generation guard suppresses superseded reloads |
| Successful apply/rebuild | Cleared | UI is remapped to rebuilt project ids by stable paths | Valid tabs/navigation survive | Same project root |

## Staged-edit resurrection review

`ProjectSessionSnapshot` contains only UI/navigation context. The session writer does not serialize `editing`, `changeSet`, `changePast`, `changeFuture`, previous source/file text, applied snapshots or project file contents. `setWorkspace` always creates a fresh empty ChangeSet and empty staged Undo/Redo history after the replacement project has successfully been built. `closeProject` performs the same destructive reset.

The lifecycle guard blocks project switch, project close and desktop app exit when staged changes exist. Choosing Review/Cancel leaves the current session intact. Choosing the destructive action executes the replacement/close/exit operation first; the guard itself does not call `resetChanges`, so a failed picker/scan cannot discard the current project's staged work.

No staged-edit resurrection path remains in the audited persistence surface.

## Finding 05-A — Watcher runtime state could cross a project switch

**Classification:** must-fix before 1.0 — remediated.

The desktop file-watcher subscription is app-shell lifetime, while its debounce queue, timer and error message were also app-shell lifetime. The event callback correctly checked the event root and reload generation, but a queued path set from project A could remain alive during an A → B switch. A B event arriving inside the debounce window could replace the timer while inheriting A's queued paths; an old watcher error or external-change notice could also remain visible after the switch.

Remediation ties the transient watcher state to `workspace.projectRoot`. On every root transition the Workbench now:

- cancels the pending debounce timer and clears its handle;
- clears queued watcher paths;
- increments the reload generation so in-flight work becomes stale;
- clears the external-change notice;
- clears the local watcher error.

The effect deliberately keys on `projectRoot`, not the workspace object, so a normal same-project external reload does not immediately erase the notice it just produced.

## Finding 05-B — Corrupt persistence was tolerant but insufficiently bounded

**Classification:** must-fix before 1.0 — remediated.

The existing persistence layer already caught JSON/storage failures and validated many enum/numeric fields, but several path/string arrays were only type-filtered. A malformed or manually edited localStorage payload could therefore feed hundreds or thousands of stale strings into restore work until browser storage limits were reached. Recent-project reading also iterated the full raw array before applying the final 20-entry output cap.

Remediation adds bounded normalization on both read and write paths:

- open file paths: 500;
- open source paths: 50;
- recently closed paths: 20;
- navigation past/future: 100 each;
- visual selected paths: 500;
- recent searches: 12;
- recent projects: 20 returned, with at most 200 raw entries inspected;
- project/source paths and graph roots: 4096 characters;
- node ids: 2048 characters;
- labels/workspace ids/query strings: explicit finite bounds;
- duplicate persisted strings are removed;
- invalid project-graph/view/filter fields fall back to safe defaults.

The Track-05 gate transpiles and executes the actual `projectPersistence.ts` module against a mocked localStorage. It covers malformed JSON, wrong schema versions, invalid required shapes, oversized arrays and strings, duplicate paths, invalid enums/numbers, graph zoom clamping and malicious extra fields named like staged edit/history/content state. The same test verifies that the writer strips those extra fields rather than serializing them.

## Stale identity / path restore review

Project model file ids are parse-order/runtime identities and are not used as durable persistence keys. File editors, focused/navigation targets, recently closed files and visual selections are persisted by project-relative paths and remapped against the freshly scanned `ProjectModel`. Missing paths are dropped. A stale node id is downgraded to file navigation rather than fabricating a node target. Workspace filter ids are validated against the new model.

Post-apply and external-reload paths likewise remap runtime file ids by normalized file path. External reload additionally clears staged history when changed paths overlap current or historical ChangeSets, avoiding undo/redo against a different on-disk basis.

## Pane and tab lifecycle decision

Split-view allocation is intentionally transient. Persisting two-pane tab placement would couple the restore format to a relatively new Workbench layout model and would increase stale-state combinations without preserving user content. Track 05 therefore treats `activePane`, pane-local tab ids and `splitViewEnabled` as session-only state. File/source editors restore into the primary pane and the project starts unsplit. Query/tool tabs are also reconstructed on demand rather than persisted.

This is an accepted product decision, not a missing persistence feature for 1.0.

## Existing evidence retained

Earlier regression suites already protect important pieces of this surface:

- `test:projects` verifies recent projects, path-based project-session ownership and the absence of staged edit/file-content persistence;
- `test:lifecycle` protects guarded switch/close/exit behavior and the fail-safe rule that changes are not reset before a replacement project succeeds;
- `test:state-reset-audit` protects path remapping across rebuilds and project-specific graph settings;
- `test:watcher` and later runtime tests protect desktop watcher authority/reload behavior;
- strict TypeScript plus the full RC regression matrix continue to run with the new Track-05 gate.

Track 05 adds the missing corruption/bounds and cross-project watcher-boundary evidence instead of replacing those older suites.

## Conclusion

No unresolved Track-05 state, persistence or lifecycle blocker remains. Staged edit authority is session-only and fail-safe across destructive transitions, stale runtime ids are remapped/dropped by path, corrupt persistence is bounded and normalized, and desktop watcher runtime state is now explicitly scoped to the active project root.
