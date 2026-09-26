# Pre-1.0 Audit 07 — Native / Tauri Authority Boundary

**Status:** PASS  
**Scope:** Tauri command authority, WebView capabilities, native picker/token grants, path canonicalization/containment, Windows symlink/reparse/junction behavior, project/output/WorldGen filesystem boundaries, and native safety limits.

## Exit decision

Track 07 has no unresolved 1.0 blocker. The audit confirmed that the WebView capability surface is already deliberately narrow and that existing project-file/apply paths perform native canonicalization and containment. It also found and remediated a grant-retargeting gap at several native directory authorities: a path selected earlier by the user could later be replaced by a Windows junction/reparse point and still be treated as the original authority.

The durable gate is `test:pre1-native-authority-boundary`. Windows-native junction fixtures additionally run through the locked Rust test suite. Focused validation run `35261204338` completed successfully: the Track 07 source/capability gate, 13 native Rust tests, release-contract parity, complete registered regression matrix, and zero-unused-source audit all passed before the temporary validator committed the hardened source and removed itself.

## Reviewed authority model

- The WebView capability file grants only core event access and WebView zoom; direct frontend filesystem, dialog, shell/process and HTTP capabilities remain absent.
- Filesystem selection and persistent path authority stay in Rust/native commands rather than accepting arbitrary WebView paths as trusted authority.
- Project-relative paths are validated as relative components and existing project files are canonicalized and required to remain under the canonical project root.
- Save/output/worldgen handles use opaque native tokens rather than exposing a generic arbitrary-path registration command.
- Project scan/resource limits such as entry count, JSON byte size and JSON nesting remain enforced.
- Apply uses canonical project targets and keeps its transactional temp/backup work adjacent to already-authorized canonical files.

## Findings and remediation

### Finding 07-A — previously authorized directory could be retargeted

**Classification:** must-fix before 1.0 — remediated.

A directory selected/opened through a native authority boundary could subsequently be moved and replaced at the same path by a Windows junction/reparse point. Some later operations reused the stored path without proving that it still represented the originally authorized directory.

Remediation introduces native directory-authority revalidation. The active project root is checked against its stored canonical root before authority-dependent use. Stored output-folder authority is revalidated before output operations. WorldGen folder authority is revalidated at token use. Reparse points are rejected where a regular local file/directory is required.

Windows-native tests create real `mklink /J` fixtures and prove that project/output/WorldGen grant retargeting is rejected after authorization.

### Finding 07-B — existing output target containment needed a final canonical check

**Classification:** must-fix before 1.0 — remediated.

An already-existing output target had weaker validation than canonical project-file resolution. A reparse-backed target could therefore undermine the intended selected-output-root boundary.

Remediation rejects symlink/reparse/directory targets where a regular output file is expected, canonicalizes an existing target and requires that canonical target to remain beneath the selected output root before it can be used.

### Finding 07-C — WorldGen folder/file resolution needed explicit reparse containment

**Classification:** must-fix before 1.0 — remediated.

WorldGen performance log selection already used native pickers, but the folder-to-newest-log path did not consistently enforce the same Windows reparse/containment semantics implied by the authority boundary.

Remediation canonicalizes the selected folder base, rejects reparse-backed selected/resolved files where regular local objects are required, verifies the resolved log remains beneath the canonical folder, and revalidates the stored folder authority when the token is used.

## Existing protections revalidated

The audit revalidated the narrow Tauri capability allowlist, CSP restrictions, canonical existing-project-file resolution, relative-path validation, opaque native grants, existing save-target parent revalidation, scan resource bounds and the transactional apply path. No frontend filesystem/shell/http capability was added as part of the remediation.

## Test evidence

Focused Windows validation exercised 13 locked Rust tests with 0 failures, including real junction fixtures for authority retargeting, the existing external-junction project-scan fixture, save-target parent revalidation, rollback safety and WorldGen bounded/reverse-scan behavior. The registered JS regression matrix also executed `test:pre1-native-authority-boundary` successfully alongside Tracks 01–06 and all historical compatibility suites.

## Accepted limits / follow-up

This track establishes the native authority boundary; the broader adversary model, updater trust, command-injection review, secret handling and dependency/supply-chain analysis continue in Track 08. Apply crash/recovery race analysis is intentionally owned by Track 09, while ZIP/import/export and very-large-I/O boundary behavior remains Track 10.

## Result

**PASS.** Native directory grants are now revalidated against retargeting, existing output targets receive canonical containment checks, WorldGen file/folder authority is reparse-aware, and the protections are backed by real Windows junction fixtures plus the normal regression matrix. No unresolved Track 07 blocker remains.
