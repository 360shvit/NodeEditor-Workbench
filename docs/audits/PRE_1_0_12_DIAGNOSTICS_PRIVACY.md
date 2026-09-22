# Pre-1.0 Audit 12 — Diagnostics, logging & privacy

**Status:** IN REVIEW — remediation and local gates complete; normal Windows PR CI pending.
**Reviewed baseline:** PR #25 after Track 11, `9d297418e61e10541a448cdeebcf3b8b9013ab6d`.
**Scope:** runtime events/metrics/traces, support report options, error handling at diagnostic ingress, desktop persistent JSONL logging, queue/rotation/clear behavior and outbound data flow.

## Data flow and disclosure controls

| Source / destination | Retained data and controls |
|---|---|
| Instrumentation call sites | Application-owned operation/phase names, generated trace IDs, counts, durations, flags and reviewed enum metadata. Search records query length, not query text. The project summary builder explicitly selects counts, source kind and writable state; it does not copy file models or contents. |
| Runtime memory ring | At most 500 bounded events. `diagnosticPrivacy.ts` accepts known metadata fields; free text and unknown keys are omitted. Only explicit path fields can retain safe relative paths. Absolute, drive-relative, UNC/device, URI and traversal path fields are redacted before retention. |
| Error ingress | Built-in error category plus operation/context metadata. Exception messages, thrown-object stringification, stack text and React component stacks are excluded. The user's interactive error UI still receives the original error. |
| Metrics and traces | 256 metric names / 96 samples per name, 20 trace summaries and 20 slow-operation summaries. Names have a bounded identifier/route grammar; query/hash-bearing names are redacted. Trace/metric producers were reviewed as internal operation identifiers, not project values. |
| Persistent renderer queue | Warnings/errors and selected lifecycle events by default; detailed mode opts into the wider structured stream. All events pass the same privacy filter. Relative paths are redacted before enqueue. Queue at most 1,000, batch at most 50; overflow drops oldest queued events and increments a counter. |
| Native persistent sink | Fixed app-log directory and four managed filenames; renderer cannot choose a destination. Native independently rebuilds the event envelope and keeps only known counters, core enums and bounded operation/route identifiers. It does not persist message, stack, arbitrary extras or path fields from a direct command payload. Mutex serializes status, append, rotation and clear. |
| Support JSON | User-triggered clipboard/save only. Project-relative paths default off; logs and performance can independently be excluded. Absolute/unsafe paths and raw text cannot be opted back in. Report uses current in-memory events, not disk history. `projectContentsIncluded:false` and `automaticUpload:false` are preserved as booleans. |
| Network | No upload/fetch/beacon/socket transport in diagnostics modules. Native outbound HTTP remains the separately audited explicit GitHub updater path; diagnostic data is not passed to it. CSP/capability restrictions remain unchanged. |

The report retains application version, platform/language, timestamps, layout preferences, project-size counts and operation timing. These can still describe a user's environment/activity. Users should review reports before sharing. Local clipboard/file storage is an explicit disclosure destination, not an upload by Workbench.

## Findings and remediation

### 1. Raw errors defeated the no-project-contents promise

**Must-fix before 1.0 — remediated.** The previous path regex preserved arbitrary exception text. A real `JSON.parse` failure containing a synthetic private value reproduced that value in the default report. Unsupported thrown objects could also throw again during `String(error)` inside the diagnostic handler.

The new policy preserves built-in error category, operation and reviewed metadata without converting or retaining raw exception text. Unknown data keys/strings are excluded rather than relying on regexes to recognize arbitrary project content. Native logging also sanitizes direct renderer payloads. Tests check canaries in parser errors, messages, stack/content/password/query fields, unknown keys and dynamic path-bearing identifiers.

### 2. Incomplete path filtering and mutable snapshots

**Must-fix before 1.0 — remediated.** Forward-slash Windows paths, UNC/device forms and arbitrary absolute roots were not all handled by the old text replacements. Returned event objects and nested arrays could also mutate retained events after ingress sanitization.

Absolute/unsafe path fields are now wholly redacted. Safe relative paths survive only in explicit fields and require report opt-in. Persistent sinks never retain them. Returned events and ring snapshots are deep copies of already bounded plain data. Fixtures cover drive/backslash/forward-slash, UNC/device, file URI, POSIX, traversal, spaces and standalone relative filenames; attempted mutations cannot introduce a private canary into the report.

### 3. Recursion and event-size bounds were incomplete

**Hardening — remediated.** The event ring and queue capped object count, but nested metadata recursion lacked a global work/depth bound. Cycles could overflow the stack and broad data could produce an event large enough to disable the native sink.

Ingress now allows at most four object levels, 40 keys per object, 80 visited fields/items and 30 paths per array. It does not execute accessors. An event exceeding 4,000 JSON UTF-16 units replaces metadata with `diagnosticDataOmitted`; valid retained events therefore stay below 12,000 UTF-8 bytes, beneath the native 16 KiB entry ceiling. Tests execute cyclic, 10,000-level, throwing-accessor and multibyte/large-array fixtures, including 500-event retention and 1,250 events under blocked-sink backpressure. These are payload bounds, not a whole-process RSS guarantee.

### 4. Clear/write races and native log target checks

**Hardening — remediated.** Clear previously allowed new events to start appending while native clear was pending. It now deduplicates concurrent clear requests, drains the old in-flight append, drops queued history and suppresses persistent writes until clear returns. Logging resumes afterwards. A synchronous bridge exception no longer leaves a stale flush promise; one failure disables the sink until recovery instead of recursively logging failures.

Native target inspection now includes Windows reparse points and dangling-link inspection. Append/rotate/clear validate every managed generation before mutation, so a later unsafe generation cannot cause an earlier valid log to be deleted first. Testable directory helpers are used directly by the real commands; no test-only substitute implementation is used.

## Repeatable evidence

- `test:pre1-diagnostics-privacy` executes the committed embedded diagnostics modules. It covers the canaries, opt-ins, retained booleans/counts/categories, immutable snapshots, bounded recursion/bytes/queue, clear-versus-append sequencing and synchronous sink failure/recovery.
- Four locked native Windows fixtures in `diagnostic_privacy_tests.rs` cover direct-payload sanitization and valid JSONL, entry/count/batch rejection before any write, seven rotations with no more than four files of at most 2 MiB, idempotent clear, and Windows junction refusal with sentinel preservation.
- Local strict application TypeScript, Track 11 resource budgets and unified performance tracing passed. Local locked native suite passed **34/34** tests.
- Local full matrix exposed one historical source-location assertion after the privacy helper moved; it now checks the new helper and its boolean behavior is covered at runtime. Eight existing suites encounter this host's `spawnSync ... EPERM` restriction; they are **not claimed as local passes**. No subprocess or release gate is weakened.
- Windows PR CI: **pending**. Normal CI must run all **85 registered self-contained suites**, the **250-cycle embedded soak**, all **34 locked native tests**, release/embedded parity, strict TypeScript, third-party gates and unused-carry audit before this track becomes PASS.

## Accepted limits / remaining acceptance work

- Raw error text/stack omission deliberately trades some debugging detail for the no-content guarantee. Interactive UI messages remain available to the user; support receives categories and operation context. Arbitrary symbol type and shortcut text are omitted. New diagnostic fields require a policy review.
- Event names/trace IDs and allowlisted counters are internal instrumentation contracts, not a defense against arbitrary code running inside a compromised renderer. Such code already has access to project data; this audit does not claim covert-channel prevention.
- Existing disk logs are not rewritten or silently deleted on upgrade. Clear logs removes managed disk history; it does not clear current memory events or unrelated files. Local logs are unencrypted and inherit the current user's OS access controls.
- A stalled native append can delay clear/exit; loss on crash, partial JSONL writes and partial rotation/clear after an OS I/O failure remain possible. The file sink fails closed and reports unavailable. No durable audit-log or secure-erasure guarantee is made.
- Junction/target validation is a point-in-time check, not protection against a hostile same-user process racing filesystem replacement or altering ancestor directories. Stored byte limits describe application-produced logs, not externally modified files.
- Real installed-client UI/clipboard/save interaction and low-memory behavior remain Track 18 manual acceptance, not claimed by these synthetic/runtime tests.

No dependency, lockfile, license, signing/updater configuration, release identity, workflow, runner or Action pin changed. No tag or release is created.
