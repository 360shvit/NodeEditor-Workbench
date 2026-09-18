# Pre-1.0 Audit 08 — Security & Threat Model

**Status:** PASS  
**Scope:** local project-data trust, WebView/renderer attack surface, Tauri IPC/native command boundary, command/process execution, path authority, updater trust, secrets, CI permissions, dependency/supply-chain controls, and security-reporting readiness.

## Exit decision

Track 08 has no unresolved high-severity or 1.0-blocking security finding in the reviewed source line. The audit built an explicit threat model across the renderer/native/release boundaries, revalidated the Track 07 filesystem-authority work, added a repeatable security gate, and applied one small defense-in-depth remediation so Tauri command dispatch stays statically auditable.

The durable gate is `test:pre1-security-threat-model`. It is a normal `test:*` script and therefore runs inside the existing RC regression matrix. Initial normal Windows validation run `35310950567` completed successfully with the new gate registered; the complete regression matrix, zero-unused-source audit and locked native Rust tests all passed.

## Threat model and trust boundaries

### Untrusted project/log data -> renderer

Project JSON, filenames, semantic values and WorldGen log content are treated as data, not executable markup or code. The gate rejects application-owned renderer sinks such as `dangerouslySetInnerHTML`, direct `innerHTML` assignment, `insertAdjacentHTML`, `document.write`, `eval`, `new Function` and dynamic script-element creation.

The packaged WebView keeps a restrictive CSP: scripts/default content are self-only, objects and frames are denied, and network connectivity is restricted to Tauri IPC origins. `withGlobalTauri=true` remains an explicit compatibility boundary rather than being hidden; because that increases the consequence of a future renderer compromise, the no-raw-HTML/no-eval invariant is now enforced directly.

### Renderer -> Tauri/native authority

The capability file exposes only core event access and current-WebView zoom. Direct frontend filesystem, dialog, shell/process, HTTP and updater capabilities remain absent. The committed Tauri bridge maps a fixed set of local `/api/...` routes to fixed native command names.

**Hardening remediation:** the download/save bridge previously selected one of two known native picker commands through a computed `invoke(...)` expression. This was not an arbitrary-command injection vulnerability, but it weakened static review. The bridge now uses two explicit literal `invoke` calls so every production command target remains textually fixed and the gate rejects future computed command names.

Track 07's canonicalization, opaque picker grants, reparse/junction checks and path-containment protections remain part of this threat model and are still covered by their own gate/native fixtures.

### Native process / command execution

Production Rust contains no OS-shell/process spawning path. The only `std::process::Command` use is inside the Windows-only test module that creates real `mklink /J` fixtures. The Track 08 gate slices production Rust before that test module and fails if process spawning is introduced there.

### Updater / release trust

Updater endpoint selection is limited to the stable/preview GitHub Release manifest paths for the configured repository. The native updater is configured with the committed minisign public verification key; private signing material is not source material and the release workflow references it only through GitHub Environment secrets.

The install path requires a previously checked channel/version, uses Tauri's signed update verification and rechecks staged project changes again after download before the install/restart boundary.

The release workflow remains tag-only and read-only during validation. `contents: write` is granted only to the publish job inside the `release` environment, with public assets staged through the existing release-surface allowlist.

## Current dependency/advisory review

The audit reviewed the current direct npm/runtime graph and current upstream Tauri security advisories rather than relying only on historical tests.

A relevant 2026 Tauri advisory was identified: **GHSA-7gmj-67g7-phm9 / CVE-2026-42184**, "Origin Confusion Allows Remote Pages to Invoke Local-Only IPC Commands", affects Tauri `>=2.0` through `<=2.11.0` on Windows/Android and is patched from `2.11.1`.

HGW's checked `Cargo.lock` resolves `tauri` to **2.11.5**, so the audited branch is not in the affected range. The Track 08 gate now enforces a minimum locked Tauri version of **2.11.1** so a future lockfile regression cannot silently reintroduce this known origin-classification vulnerability.

Recent React security advisories reviewed during this audit primarily target React 19 Server Components packages. HGW uses React 18.3.1 and its checked npm lock does not include those server-component packages. This does not replace ongoing advisory monitoring.

Dependency/supply-chain controls additionally include exact direct npm versions, checked npm/Cargo locks, `npm ci --ignore-scripts`, `cargo test --locked`, weekly Dependabot coverage for npm/Cargo/GitHub Actions, immutable-SHA-pinned external Actions, and a `pull_request_target` dependency-approval workflow that does not checkout or execute PR code.

## Secret handling

The gate inventories tracked source and rejects common private-key, PAT, AWS-key and local-secret filename/content patterns. The committed updater key is decoded/checked as a minisign **public** key and must not contain secret-key material.

Release private-key values remain GitHub secrets and are not committed, packaged or printed by the audit. This audit never retrieves or inspects the private signing key.

## Security reporting / operational gate

`SECURITY.md` already requires GitHub Private Vulnerability Reporting or an equivalent private contact before public promotion and explicitly tells reporters not to place exploit details or private signing material in public issues.

The repository-admin state for Private Vulnerability Reporting cannot be proven through the available source/CI interface, so this audit does **not** claim that the setting is enabled. Confirming that admin setting (or documenting an equivalent private contact) remains a manual operational prerequisite before stable 1.0/public promotion. This is not a source-code blocker and is intentionally kept visible for final acceptance rather than silently waived.

## Findings

### Finding 08-A — computed native command selection in save bridge

**Classification:** hardening — remediated.

A conditional expression selected between two fixed native picker command strings inside `invoke(...)`. The allowed set was static, but a computed command expression makes future expansion harder to audit. It is now two explicit literal command calls, and the Track 08 gate rejects computed Tauri command names.

### Finding 08-B — current Tauri origin-confusion advisory

**Classification:** advisory review — current source not affected; regression guard added.

The current checked Tauri version is 2.11.5, above the 2.11.1 patched floor for GHSA-7gmj-67g7-phm9 / CVE-2026-42184. A lockfile-version assertion was added to the durable gate.

### Finding 08-C — `withGlobalTauri=true` increases renderer-compromise impact

**Classification:** accepted/documented compatibility risk.

The embedded runtime intentionally uses the global Tauri bridge. Removing it during the pre-1.0 audit would be a wider architectural migration with regression risk. The current mitigation is defense in depth: restrictive CSP, no frames, no remote-connect surface, least-privilege capability file, no application raw-HTML/eval sinks, fixed native command mapping and native-side authority validation. Any future introduction of a raw renderer sink or broader capability now fails the Track 08 contract.

### Finding 08-D — private vulnerability-reporting admin state is not source-verifiable

**Classification:** operational manual gate.

The policy requirement exists, but repository-admin configuration is outside the checked source line. Final stable acceptance must explicitly confirm Private Vulnerability Reporting or document an equivalent private contact.

## Result

**PASS.** No unresolved high-severity source finding remains. Renderer code/data separation, static native command dispatch, least-privilege Tauri capabilities, native process restrictions, signed updater trust, secret hygiene and CI/supply-chain controls now have a repeatable audit gate. The known 2026 Tauri origin-confusion advisory is explicitly guarded by the lockfile security floor. Track 09 — apply transaction, recovery and concurrency — is next.
