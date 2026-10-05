# Pre-1.0 Audit 16 — Dependencies, licenses and distribution

**Status:** IN REVIEW — rustls remediation and extended SDK/compiler notices are validated; Preact provenance is resolved below. Installer plug-in distribution review remains open. This is not full distribution-compliance sign-off.
**Baseline:** `e0654d54104fec2601b0a2013059dc6ab56a1ad3` after Track 15 / PR #35.
**Review dates:** 2026-10-04–05.

## Reviewed application graph

The baseline locked metadata contains **11 npm** packages and **502 Cargo** packages. Windows classification has **245 runtime components** (243 Cargo plus two vendored frontend components), **82 build-only** and **188 other-target** entries. The existing notices contain **156 distinct legal texts**. These counts describe the application dependency graph, not every native binary contribution to the final installer.

The TypeScript compiler emits the application AMD modules; React/Zustand imports resolve to the local compatibility layer. No npm package directory is bundled. Compiler-emitted helpers are a separate review item below. The committed frontend remains the distribution source; no browser build path or package replacement is introduced.

`release-spec/third-party-policy.json` records the reviewed runtime license expressions without flattening `AND`/`OR` expressions, plus the source digests of Preact and the Lucide geometry. New expressions, unreviewed Cargo origins/path dependencies, changed vendored bytes and missing vendored coverage now fail the inventory/distribution gates. Existing legal-text discovery, curated fallbacks, MPL source references and empty/missing-text rejection remain required.

## Findings and remediation

### 16-A — affected TLS dependency

The full locked graph was queried against OSV on 2026-10-04 (502 Cargo identities); npm's live audit reported zero advisories for the 11 checked packages. The Windows runtime contains `rustls 0.23.44`, affected by [RUSTSEC-2026-0285](https://rustsec.org/advisories/RUSTSEC-2026-0285.html) / [GHSA-2mjx-qc3c-rqvc](https://github.com/rustls/rustls/security/advisories/GHSA-2mjx-qc3c-rqvc). Rustls accepts TLS 1.3 handshake messages across encryption-level boundaries; upstream specifies `0.23.45` as the patched floor. This is a concrete dependency finding, not proof that updater signatures can be bypassed.

The lock update is limited to `rustls 0.23.44 -> 0.23.45` and its registry checksum. The official registry index and downloaded crate agree on SHA-256 `0d41d731c7d2f962d1ccc364cec258de3c0e93b38c2fb3ba97ac74513048d634`; dependency and feature requirements are unchanged. The license remains `Apache-2.0 OR ISC OR MIT`. A fresh OSV query for `0.23.45` returned no matches. The gate rejects versions below the patched floor and prerelease identities.

Local Cargo registry access failed with Windows Schannel `SEC_E_NO_CREDENTIALS`; offline resolution lacked the new index entry. The lock was prepared from the verified registry record. [PR #36](https://github.com/360shvit/NodeEditor-Workbench/pull/36) merged after [Windows CI 37216009509](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/37216009509) actually compiled `rustls 0.23.45` with `--locked`: 89/89 suites, 250 soak cycles and 39/39 native tests passed. Post-merge validation 37218512540 also succeeded on `c350ca6817aac94a21d4b999f79b9e097c7d84ca`. No TLS validation was disabled. Public/installed rc.5 binaries do not receive the fix until a separately approved new release is built and installed.

### 16-B — incomplete future-dependency review boundaries

The prior inventory/classifier filtered external packages using truthy Cargo `source`, silently excluding additional path dependencies (`source: null`). It also accepted any nonempty runtime license declaration without a reviewed-expression boundary. The shared policy now rejects non-root path/git/alternative-registry sources until explicitly reviewed, and requires runtime expressions from the reviewed set. This does not choose a new project or dependency license.

### 16-C — source-distribution notices and vendored identity

Generated installer notices were present, but there was no dedicated committed notice document for copied frontend code. [Third-party source notices](../THIRD_PARTY.md) now retain the full Preact MIT and Lucide ISC/Feather MIT texts, linked from README. The project's existing `LICENSE` is unchanged.

Preact provenance was unresolved in the first pass. On 2026-10-05, comparison with the official **Preact 10.5.13** npm package established complete binding-aware body equivalence: 5,163 tokens and 228 local bindings, preserving property names, unbound globals, literals and operators. Local variable/label renaming and the `globalThis.PreactLite` export adapter explain the differences; the exported names map to the same bindings. This verifies the downstream code relationship, not a historical record of who originally copied it. The runtime was not upgraded or edited.

The official archive's registry SHA-512 integrity was verified and its SHA-256 is `f78000436433ff738354fa36dfa232bf7ceafb8025b07469d7197c411be54aec`; the source commit is `e523a82cda1d982b6fa82d23cc7539f5f5b4701d`. [The provenance record](../../release-spec/preact-provenance.json) pins archive/module/downstream hashes. To reproduce, obtain that exact archive, extract `package/dist/preact.module.js`, and pass the file to `node scripts/verify-preact-provenance.mjs <file>`. The comparison rejects any other upstream module hash, checks both complete bodies and verifies the export adapter without executing the downloaded code.

The 2026-10-05 OSV query for npm `preact@10.5.13` returned no matches. The upstream [JSON VNode advisory](https://github.com/preactjs/preact/security/advisories/GHSA-36hm-qxxp-pg3m) lists later affected version ranges. Existing execution tests confirm the shipped strict constructor check rejects JSON VNodes including `constructor: null`. This is dated advisory evidence; the old runtime remains maintenance debt, not a guarantee against future findings.

## Existing curated legal material

Nine Cargo packages lack root legal files in their published crates; the generator already uses explicit version-bound exceptions. This review retained their existing license choices:

| Components | Evidence reviewed |
|---|---|
| `alloc-stdlib 0.2.4` | Its [upstream LICENSE at the crate's recorded commit](https://github.com/dropbox/rust-alloc-no-stdlib/blob/ae42d22078b98549e987d2f03d12df7b984fde47/LICENSE) matches the existing `alloc-no-stdlib 2.0.4` BSD fallback after whitespace normalization. |
| `selectors 0.36.1` | The shipped source header explicitly identifies MPL-2.0. The existing fallback supplies the complete MPL text from `cssparser 0.36.0`; notices retain the exact selectors source archive. No generic root LICENSE exists at its recorded Stylo commit; that absence is not reported as a successful retrieval. |
| Five UNIC `0.9.0` packages | Existing generated MIT permission/disclaimer text matches [upstream LICENSE-MIT at the recorded commit](https://github.com/open-i18n/rust-unic/blob/5878605364af97a3358368a6eaef02104af2e016/LICENSE-MIT) after whitespace normalization; source headers identify MIT/Apache alternatives. Existing attribution remains. |
| `webview2-com` / `webview2-com-sys 0.38.2` | Existing generated wrapper MIT text and Bill Avery attribution match [the wrapper repository license](https://github.com/wravery/webview2-rs/blob/b74dc5e2b394044bea5191052868ce7a106c202c/LICENSE). This license comparison does **not** classify Microsoft's native loader binaries as MIT. |
| Vendored frontend | Preact's MIT text is retained, with the 10.5.13 code relationship verified above; Lucide/Feather attribution and both license bodies match the [1.29.0 license](https://github.com/lucide-icons/lucide/blob/1.29.0/LICENSE). |

MPL source references cover cssparser, dtoa-short, option-ext and selectors with exact crate archives. The generator retains compound legal material (including Apache/ISC and Unicode texts) instead of assuming the application MIT license covers dependencies. This review of the existing fallbacks does not close the packaging gaps below.

## Advisory triage and limits

- `glib 0.18.5`: [RUSTSEC-2024-0429](https://rustsec.org/advisories/RUSTSEC-2024-0429.html), an unsound iterator, is present in the full lock but classified other-target, absent from the Windows target graph. No Linux/macOS release is authorized or cleared by this Windows review.
- `proc-macro-error 1.0.4`: [unmaintained advisory](https://rustsec.org/advisories/RUSTSEC-2024-0370.html), also other-target for this Windows build.
- Five runtime UNIC crates: unmaintained advisories `RUSTSEC-2025-0075`, `0080`, `0081`, `0098`, `0100`. These are maintenance findings rather than newly demonstrated exploits. Their transitive Tauri dependency paths require follow-up; no unsafe mass dependency replacement or suppression was introduced.
- The OSV/npm results are dated external-database evidence, not a permanent absence-of-vulnerabilities guarantee. Compiler/CLI/installer tool graphs are not covered by the 502-package application query; the identified Preact 10.5.13 snapshot was queried separately on 2026-10-05.

## Native SDK and compiler material follow-up

The `webview2-com-sys 0.38.2` MSVC binding statically links `WebView2LoaderStatic`. Its x64 library matches the [official Microsoft SDK 1.0.3650.58 package](https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.3650.58) byte-for-byte: SHA-256 `0659b741bde6348d4c4a6ec4ceb9af50e3d0048ed9cd3c8659bccbb61fde55ee`. The SDK archive SHA-256 is `911a472128c82ac8baa0c486c23342cc9dd6e7dc50d754e676726642ca065c60`. Its nuspec points to `LICENSE.txt`; both that Microsoft BSD-style text and `NOTICE.txt` are now committed and incorporated into generated installer notices. Wrapper MIT and Evergreen Runtime terms remain separate.

`tauri-ui/app.js` begins with TypeScript 5.8.3's emitted `__createBinding`, `__exportStar` and `__importDefault` routines. The locked compiler's complete Apache-2.0 license and upstream third-party notice file are retained in source and generated notices. The helper-prefix digest identifies the exact reviewed output; no npm runtime import or compiler package is added to the app.

`bundled-materials.mjs` verifies actual Cargo registry loader bytes, wrapper and installed/locked compiler versions, emitted helper bytes and full legal-file hashes before generating notices. `test:bundled-materials` rejects altered native bytes, versions, helper output, missing/edited notices, unsupported targets and escaping paths. Existing Cargo/vendored notice requirements remain intact.

The locked Tauri bundler uses NSIS 3.11 (archive SHA-1 `EF7FF767E5CBD9EDD22ADD3A32C9B8F4500BB10D`) and `nsis-tauri-utils 0.5.3` (DLL SHA-1 `75197FEE3C6A814FE035788D1C34EAD39349B860`). NSIS's full COPYING text includes CPL-1.0 and the explicit LZMA linking exception. The additional plug-in's upstream declares Apache-2.0/MIT, but this is not yet a complete inventory of its compiled transitive components. That remaining binary review must not be inferred from the application's Cargo.lock.

## Validation and remaining exit gates

Local dependency/bundled-material regressions, installer and validation-link checks passed. The source/document diff check excludes the four copied upstream legal files, whose original whitespace is retained. [Windows CI 37327378454](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/37327378454), on PR #38 head `463cb056adb2bf7b9b14d5ce976030070a3396a7`, passed 91/91 suites, 250 soak cycles and 39 native tests. Actual notice generation verified the registry loader and produced **247 runtime/material entries and 160 distinct legal texts**. The application's Cargo/vendor classification remains 245 entries; two supplemental entries cover the loader and emitted helpers. No new signed installer is claimed by this PR validation. The subsequent Preact comparison also passed locally with the pinned official module; final PR checks remain required after follow-up changes.

Before Track 16 can become PASS:

1. Required Windows checks must pass on the final notice extension, including generation against the actual loader, locked graph and native tests. The rustls patch's CI is already passed; no signed installer incorporating the follow-up is claimed.
2. Finish NSIS 3.11/LZMA and installer plug-in distribution review, including their compiled transitive components and required material. A Cargo-only application list does not prove this.
3. Build and verify a fresh signed candidate after distribution review; existing rc.5 and the Track 15 same-version artifact do not contain the new dependency/notices. No public release or same-version replacement is authorized by this audit.

Track 14's installed-client manipulation test is still required and **not waived** by the owner asking to continue. Standalone signature rejection is not that test. Stable and Preview remain the only channels; no QA setup, new signing key, tag or release was created. GitHub cleanup remains Track 19, after acceptance.
