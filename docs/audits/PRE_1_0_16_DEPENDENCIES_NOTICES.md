# Pre-1.0 Audit 16 — Dependencies, licenses and distribution

**Status:** IN REVIEW — application dependency review and remediation prepared; required Windows CI and the native/installer component notice review remain open. This is not full distribution-compliance sign-off.
**Baseline:** `e0654d54104fec2601b0a2013059dc6ab56a1ad3` after Track 15 / PR #35.
**Review date:** 2026-10-04.

## Reviewed application graph

The baseline locked metadata contains **11 npm** packages and **502 Cargo** packages. Windows classification has **245 runtime components** (243 Cargo plus two vendored frontend components), **82 build-only** and **188 other-target** entries. The existing notices contain **156 distinct legal texts**. These counts describe the application dependency graph, not every native binary contribution to the final installer.

The TypeScript compiler emits the application AMD modules; React/Zustand imports resolve to the local compatibility layer. No npm package directory is bundled. Compiler-emitted helpers are a separate review item below. The committed frontend remains the distribution source; no browser build path or package replacement is introduced.

`release-spec/third-party-policy.json` records the reviewed runtime license expressions without flattening `AND`/`OR` expressions, plus the source digests of Preact and the Lucide geometry. New expressions, unreviewed Cargo origins/path dependencies, changed vendored bytes and missing vendored coverage now fail the inventory/distribution gates. Existing legal-text discovery, curated fallbacks, MPL source references and empty/missing-text rejection remain required.

## Findings and remediation

### 16-A — affected TLS dependency

The full locked graph was queried against OSV on 2026-10-04 (502 Cargo identities); npm's live audit reported zero advisories for the 11 checked packages. The Windows runtime contains `rustls 0.23.44`, affected by [RUSTSEC-2026-0285](https://rustsec.org/advisories/RUSTSEC-2026-0285.html) / [GHSA-2mjx-qc3c-rqvc](https://github.com/rustls/rustls/security/advisories/GHSA-2mjx-qc3c-rqvc). Rustls accepts TLS 1.3 handshake messages across encryption-level boundaries; upstream specifies `0.23.45` as the patched floor. This is a concrete dependency finding, not proof that updater signatures can be bypassed.

The lock update is limited to `rustls 0.23.44 -> 0.23.45` and its registry checksum. The official registry index and downloaded crate agree on SHA-256 `0d41d731c7d2f962d1ccc364cec258de3c0e93b38c2fb3ba97ac74513048d634`; dependency and feature requirements are unchanged. The license remains `Apache-2.0 OR ISC OR MIT`. A fresh OSV query for `0.23.45` returned no matches. The gate rejects versions below the patched floor and prerelease identities.

Local Cargo registry access failed with Windows Schannel `SEC_E_NO_CREDENTIALS`; offline resolution lacks the new index entry. The two lock fields were therefore prepared from the verified official registry record, not claimed as a successful local Cargo update. Required CI must resolve and compile the lock with `--locked` before integration. No TLS validation was disabled. The installed/public rc.5 binaries are unchanged and do not receive this fix until a separately approved new release is built and installed.

### 16-B — incomplete future-dependency review boundaries

The prior inventory/classifier filtered external packages using truthy Cargo `source`, silently excluding additional path dependencies (`source: null`). It also accepted any nonempty runtime license declaration without a reviewed-expression boundary. The shared policy now rejects non-root path/git/alternative-registry sources until explicitly reviewed, and requires runtime expressions from the reviewed set. This does not choose a new project or dependency license.

### 16-C — source-distribution notices and vendored identity

Generated installer notices were present, but there was no dedicated committed notice document for copied frontend code. [Third-party source notices](../THIRD_PARTY.md) now retain the full Preact MIT and Lucide ISC/Feather MIT texts, linked from README. The project's existing `LICENSE` is unchanged.

Preact is a modified downstream snapshot with no established exact upstream version. The review records its current normalized source digest rather than inventing a release identity. Its shipped `isValidElement` implementation was executed against genuine VNodes and JSON-created objects (including `constructor: null`); the latter were rejected, covering the specific distinction in [GHSA-36hm-qxxp-pg3m](https://github.com/preactjs/preact/security/advisories/GHSA-36hm-qxxp-pg3m). This focused test is not a complete advisory clearance for an unidentified upstream version. Exact upstream lineage remains an explicit open provenance item; the audit does not silently upgrade or replace the runtime.

## Existing curated legal material

Nine Cargo packages lack root legal files in their published crates; the generator already uses explicit version-bound exceptions. This review retained their existing license choices:

| Components | Evidence reviewed |
|---|---|
| `alloc-stdlib 0.2.4` | Its [upstream LICENSE at the crate's recorded commit](https://github.com/dropbox/rust-alloc-no-stdlib/blob/ae42d22078b98549e987d2f03d12df7b984fde47/LICENSE) matches the existing `alloc-no-stdlib 2.0.4` BSD fallback after whitespace normalization. |
| `selectors 0.36.1` | The shipped source header explicitly identifies MPL-2.0. The existing fallback supplies the complete MPL text from `cssparser 0.36.0`; notices retain the exact selectors source archive. No generic root LICENSE exists at its recorded Stylo commit; that absence is not reported as a successful retrieval. |
| Five UNIC `0.9.0` packages | Existing generated MIT permission/disclaimer text matches [upstream LICENSE-MIT at the recorded commit](https://github.com/open-i18n/rust-unic/blob/5878605364af97a3358368a6eaef02104af2e016/LICENSE-MIT) after whitespace normalization; source headers identify MIT/Apache alternatives. Existing attribution remains. |
| `webview2-com` / `webview2-com-sys 0.38.2` | Existing generated wrapper MIT text and Bill Avery attribution match [the wrapper repository license](https://github.com/wravery/webview2-rs/blob/b74dc5e2b394044bea5191052868ce7a106c202c/LICENSE). This license comparison does **not** classify Microsoft's native loader binaries as MIT. |
| Vendored frontend | Preact's generated MIT permission/disclaimer matches upstream; Lucide/Feather attribution and both license bodies match the [1.29.0 license](https://github.com/lucide-icons/lucide/blob/1.29.0/LICENSE). Preact version provenance is unresolved as above. |

MPL source references cover cssparser, dtoa-short, option-ext and selectors with exact crate archives. The generator retains compound legal material (including Apache/ISC and Unicode texts) instead of assuming the application MIT license covers dependencies. This review of the existing fallbacks does not close the packaging gaps below.

## Advisory triage and limits

- `glib 0.18.5`: [RUSTSEC-2024-0429](https://rustsec.org/advisories/RUSTSEC-2024-0429.html), an unsound iterator, is present in the full lock but classified other-target, absent from the Windows target graph. No Linux/macOS release is authorized or cleared by this Windows review.
- `proc-macro-error 1.0.4`: [unmaintained advisory](https://rustsec.org/advisories/RUSTSEC-2024-0370.html), also other-target for this Windows build.
- Five runtime UNIC crates: unmaintained advisories `RUSTSEC-2025-0075`, `0080`, `0081`, `0098`, `0100`. These are maintenance findings rather than newly demonstrated exploits. Their transitive Tauri dependency paths require follow-up; no unsafe mass dependency replacement or suppression was introduced.
- The OSV/npm results are dated external-database evidence, not a permanent absence-of-vulnerabilities guarantee. Compiler/CLI/installer tool graphs and unidentified vendored snapshots are not covered by the 502-package query.

## Validation and remaining exit gates

Local `test:pre1-dependency-notices`, installer source contract, validation-link audit and `git diff --check` passed. The new registered regression executes the production policy with affected/prerelease TLS versions, unreviewed local/git origins, unknown/compound/missing licenses, modified vendored bytes and missing coverage. It also executes the shipped Preact VNode distinction and checks the current AMD imports/local providers and installed notice resources. Full new locked Windows compilation and regenerated notices remain CI evidence, not claimed as local passes.

Before Track 16 can become PASS:

1. Required Windows checks must pass on the final patch/lock, including refreshed inventory, classification, generated notices and native compilation/tests.
2. Complete the non-Cargo binary inventory: `webview2-com-sys 0.38.2` ships native Microsoft loader files; the local x64 loader reports SDK `1.0.3650.58`. Confirm the applicable Microsoft SDK redistribution terms and notice treatment separately from the Rust wrapper's MIT license. Preserve the configured Evergreen download-bootstrapper path.
3. Review NSIS 3.11/LZMA and the bundled installer plug-ins against their actual distributions; the [NSIS license](https://nsis.sourceforge.io/License) includes an explicit LZMA linking exception. A Cargo-only notice list is not proof of this packaging review.
4. Resolve compiler-emitted helper attribution and the exact downstream Preact provenance boundary. No upstream version has been guessed and no runtime code has been replaced during this pass.

Track 14's installed-client manipulation test is still required and **not waived** by the owner asking to continue. Standalone signature rejection is not that test. Stable and Preview remain the only channels; no QA setup, new signing key, tag or release was created. GitHub cleanup remains Track 19, after acceptance.
