# Pre-1.0 Audit 11 — Performance, Scalability & Resource Behavior

**Status:** IN REVIEW — remediation and local focused checks complete; normal Windows PR CI pending.

**Baseline:** `3618c62b97f581ca4bac4eb2068d4dac588dc7a6` on `audit/pre-1.0-full-review`.

**Durable gates:** `test:pre1-performance-resources` and the locked Windows Rust suite (`performance_safety_tests`). Release identity remains the already-published `0.11.36-rc.3` audit baseline.

## Scope and findings

The audit reviewed project/model construction, staged-value search, direct search, semantic graph expansion, layout safety work, Explorer descriptor caching, diagnostic retention, native WorldGen scanning and cancellation. Product architecture remains native Tauri with the committed embedded frontend.

### 11-A — Repeated staged-change scans during search

**Must-fix before 1.0 — remediated.** Each searched field previously used `changes.find`, multiplying field work by the staged-change count. The baseline fixture with 256 instrumented changes performed 991,616 change-record accesses. The fixed query indexes staged values once and performs 256 accesses. The gate allows at most two accesses per supplied change, independent of wall-clock speed.

The index is request-local and uses structured node identity plus canonical JSON paths. Fixtures cover delimiter collisions, a subsequent changed query, duplicate first-match precedence and explicit null/false/zero values. Null now replaces the original value instead of falling back to it. Search totals remain exact even when the retained snapshot is capped. Direct navigation returns immediately when earlier file/symbol results fill its limit.

### 11-B — Global relationship scans during graph expansion

**Must-fix before 1.0 — remediated.** Each expanded Density symbol and related file previously filtered the full relationship array. Per-build file/owner indexes now narrow those lookups while retaining the existing semantic filters and output order. No long-lived graph cache is introduced.

A before/after fixture with 1,000 Density symbols, a cycle and one pre-existing unresolved relation returned the same 1,003 nodes/2,002 edges. Instrumented source accesses fell from 2,004,000 to 8,000; observed local timings were 52.96 ms and 4.07 ms. The permanent gate uses a clean 2,000-relation fixture, checks exact node/edge counts and unchanged repeated output, and limits source accesses to six per relationship. Replacing the reference array is tested to prevent stale reuse.

Two historical viewport/filter tests pinned the whole graph source hash. Their exact pins were deliberately advanced to the reviewed implementation; assertions remain in place alongside the semantic and new behavioral gates.

### 11-C — Unbounded metric identities and request timing retention

**Must-fix before 1.0 — remediated.** The metric map capped samples per name but had no bound on names. The baseline retained 10,000 metrics after 10,000 preview-style endpoint names. Query strings made each file preview a separate operation family. Failed or trace-less project-open requests could also leave entries in the separate request-duration map.

Metric retention is now 256 recently used names, each at most 120 characters, with the existing 96-sample window. Evictions appear in the diagnostic summary. Request metrics/events use endpoints without query/hash parameters. Request durations are local to the request and passed directly to trace ingestion; the accumulating map is removed. Executed embedded-module fixtures cover distinct metrics, recency eviction, the sample window, 1,000 preview paths sharing one operation family, trace overhead and failed requests.

### 11-D — Malformed WorldGen lines amplified I/O; revoked scans kept working

**Must-fix before 1.0 — remediated.** A 271,360-byte malformed line containing 256 marker strings caused 104,337,920 bytes of reads in the baseline instrumented reader. The corrected reader processes each candidate line once, including across chunk boundaries: the same fixture reads 813,020 bytes. Its gate requires at most six times the input bytes.

Whole-file reverse scanning remains available; no total-log cutoff is introduced. The reader retains 1 MiB chunks and the existing 8 MiB candidate byte bound. A 65,536-line candidate bound additionally prevents millions of tiny strings from amplifying candidate memory. A new report header ends the previous candidate instead of combining unrelated reports. Oversized/incomplete candidates are skipped while older complete reports remain searchable.

Production scan work uses Tauri's blocking executor, with exactly one native scan permit. Selection replacement, revocation and approved application exit signal cancellation. Read/seek boundaries check that signal; cancellation does not free the permit until the old worker exits. Concurrent requests receive an explicit retry error instead of accumulating workers. Tests cover token isolation, permit lifetime, cancellation before I/O and after the first chunk, every marker split across a chunk boundary, multi-chunk malformed lines, candidate line count and a 32 MiB no-report scan reaching BOF exactly once.

References: [Tauri blocking executor](https://docs.rs/tauri/2.11.5/tauri/async_runtime/fn.spawn_blocking.html), [Tokio blocking-work cancellation and concurrency guidance](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html). Running blocking work requires cooperative cancellation; aborting its task handle alone does not stop it.

## Measured representative profiles

Local Windows x64, Node 24.21.0, Rust 1.98.1. JavaScript timings use `performance.now`; native tests use the debug test profile. These are synthetic fixtures, not a real user project or installed WebView benchmark. The gate prints fresh measurements in CI.

| Workload | Local observation |
|---|---:|
| Build 100 files / 4,100 nodes with 10,100 inventory paths | 35.52 ms |
| Staged-value search, 4,000 changes (three trials) | 8.93 / 6.39 / 6.48 ms |
| Same staged-value fixture before the fix | 94.58 / 99.49 / 94.63 ms |
| Effective `is:unresolved` search with those changes | 41.86 ms |
| Clean graph: 1,000 Density symbols / 2,000 relationships | 10.49 ms |
| 81-node Normalize / Author Normalize / DAG Rebuild | 2.25 / 8.70 / 2.93 ms |
| Explorer descriptors: 10,100 files, cold | 36.08 ms |
| 1,000 descriptor cache hits | 1.95 ms total |
| 32 MiB no-report native scan | 697.67 ms in the focused debug run; exactly 32 MiB read |

The JavaScript gate's final process snapshot was 54.77 MiB heap / 148.40 MiB RSS, including both core and embedded VM fixtures. This is **not peak memory**, not the native host/WebView total, and not an asserted memory ceiling.

Stable regression budgets use work counts, retained object counts, maximum read size and cancellation boundaries. Timing observations are not machine-dependent release pass thresholds. Geometry safety passes, exact search totals and full-log scanning are never skipped to meet a budget.

## Validation evidence

- Strict application/core TypeScript and focused performance gate: PASS.
- Locked Windows native suite: 30/30 PASS (26 existing + four performance/resource fixtures).
- Existing graph semantic, native-authority, Apply/recovery and performance contracts remain active.
- Local full matrix exposed two intentional graph-source pin changes, now corrected and individually rechecked. Eight other checks hit the reproduced local restriction on piped Node/Git child processes (`EPERM`); they are not counted as passing. PR CI must prove the complete matrix and canonical embedded parity.
- Normal Windows PR CI: pending.

## Accepted limits and ownership

- Explorer descriptor caching is keyed by project identity in a WeakMap and checks workspace inventory/semantic authority. The fixture proves reuse and invalidation. Layout route caches also have WeakMap ownership; existing geometry fixtures continue to check coordinate invalidation.
- Project construction, effective-diagnostic search, layout and rendering still execute synchronously in the renderer. Search result caps bound retained matches, not scan time. SVG graph and Inspector rendering are not universally virtualized; these measurements do not certify smooth interaction for every project accepted by the native file limits.
- Cancellation is cooperative between native reads/seeks, not a hard deadline. A blocked OS call, folder enumeration or bounded candidate parse can delay completion. Selecting a new log while the old worker stops can require another Refresh now. Closing/replacing the selected WorldGen tab revokes its source through the existing App lifecycle effect; hiding a tab is not a revoke operation.
- Track 10's serialized ZIP limit is not a process-RSS guarantee. Large-project peak WebView/native memory, installed-client frame latency, low-memory/device behavior and representative user-project acceptance remain **not verified here** and belong to Track 18 manual acceptance. This audit is not a release-performance guarantee.
- Track 12 owns the full diagnostics/privacy audit. Endpoint normalization here also reduces path-bearing metric names but does not claim all logging/privacy behavior has been reviewed.
- No dependency, lockfile, license, signing key, release identity, updater channel, runner, external Action pin or publishing gate changed.

## Exit decision

Pending full validation of the candidate. Track 12 — diagnostics, logging & privacy — follows after normal Windows PR CI confirms the implementation.
