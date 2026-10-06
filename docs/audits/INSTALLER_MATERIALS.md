# Installer material provenance — 2026-10-06

**Status:** source/legal material and local toolset verified; plug-in transitive build provenance remains unresolved. This is not complete Track 16 sign-off or evidence of a new signed candidate.

## Reviewed inputs

The pinned Tauri CLI 2.11.0 uses `tauri-bundler 2.9.0`. Its NSIS implementation downloads the following upstream binaries. They are separate from the application's Cargo dependency graph.

| Input | SHA-256 | Evidence |
|---|---|---|
| NSIS 3.11 ZIP | `c7d27f780ddb6cffb4730138cd1591e841f4b7edb155856901cdf5f214394fa1` | [Official Tauri binary release](https://github.com/tauri-apps/binary-releases/releases/tag/nsis-3.11), independently downloaded; GitHub asset digest and bundler SHA-1 also match |
| nsis-tauri-utils 0.5.3 DLL | `5ba143b5db4a87d32d6e7802e033330aae56cbceabe0d1e3ba41948385ad4709` | [Official plug-in release](https://github.com/tauri-apps/nsis-tauri-utils/releases/tag/nsis_tauri_utils-v0.5.3), cached DLL matches GitHub asset digest and the bundler SHA-1 |

The verified ZIP contains 441 files. [The toolset index](../../release-spec/nsis-toolset-files.json) records every file's relative path and SHA-256, plus the additional plug-in DLL, for 442 total files. Its LF-normalized SHA-256 is `ea477d14cec2ba008a7d155f04165a29f5580c9140a84b84c28bf1e5b0193924`. The existing local Windows cache matched all 442 files on 2026-10-05 and again on 2026-10-06. No tool binary is committed.

To reproduce the index, download and verify the archive against the digest in [the review policy](../../release-spec/installer-materials.json), extract `nsis-3.11/`, recursively hash its files, and add the verified DLL at `Plugins/x86-unicode/additional/nsis_tauri_utils.dll`. Keys use relative forward-slash paths and lexical order; JSON uses two-space indentation and a final LF. Hashes cover original file bytes, including each file's original line endings.

## Preserved legal material

The generated installer notices now include two installer entries:

- NSIS 3.11: the complete upstream COPYING text, including its zlib, bzip2 and CPL-1.0 sections and explicit LZMA linking exception; the separate NSISdl attribution; and the Modern UI 2 license. The installer is configured for LZMA; preserving the full COPYING file does not claim bzip2 is selected. The Tauri template also uses the bundled System, nsDialogs and StartMenu components covered by the NSIS distribution terms.
- nsis-tauri-utils 0.5.3: both original MIT and Apache-2.0 files from [source commit 13d9edd](https://github.com/tauri-apps/nsis-tauri-utils/tree/13d9edd27b69310e108d6fbd49f90992f8a05390). Neither alternative is removed or newly selected for the project.

Text copies normalize CRLF to LF. Modern UI 2's original Windows-1252 text is decoded as Windows-1252 and stored as UTF-8, preserving its copyright symbol and wording. Policy records both original-byte and normalized-text digests. No project license, installer compression or application runtime code changes.

## Release gates and their limits

`installer-materials.mjs` verifies legal text and index digests, the reviewed Windows target/LZMA configuration and pinned CLI identity. Custom templates, hooks, language files or a different tool directory require renewed review. The notice generator includes this material alongside the existing Cargo, frontend, Microsoft loader and TypeScript helper notices.

After `cargo tauri build` and before release-surface staging, both protected workflows and `Build-Windows-Installer.cmd` run `verify-installer-materials.mjs`. It compares the actual default NSIS cache against all indexed files, rejecting changed bytes, missing/extra files and symbolic links/junctions. It does not repair or delete the cache. The candidate workflow retains `evidence/installer-toolset.json` with the index digest and verified count, without personal paths or secret data.

This is a post-build provenance gate, not a compiler sandbox, a pre-execution cache trust guarantee or proof that final installer bytes can be reproduced. A failure prevents staging/publication; it cannot undo the preceding compiler run. Existing signature, surface, locking, protected-environment and channel gates remain mandatory.

Regression fixtures cover changed/extra/missing binaries, modified legal text, index drift, unsupported target/config/CLI, and gate ordering before staging. The local material fixtures and actual 442-file comparison passed. Local execution of the PowerShell shell-failure fixture was blocked by the owner's Windows execution policy; required Windows CI must execute its new success/failure cases. No local policy was changed.

## Remaining plug-in provenance gap

The upstream release source has no Cargo.lock. Its workspace declares `windows-sys 0.61.2`; the DLL crate uses `semver 1.0` and the workspace `nsis-plugin-api`; the latter uses the `nsis-fn` procedural macro. The macro's proc-macro2/quote/syn graph is build-time code, not evidence of additional DLL runtime components. The release tag identifies the project's source, but does not pin all resolved dependency patch versions or the compiler's contributed material.

The original project licenses and an exact published DLL hash therefore do not establish complete transitive notice coverage. No exact semver dependency version, missing upstream lock, reconstructed binary equivalence or full compliance result is invented. Complete that review and build an identified fresh signed candidate before Track 16 can become PASS. Existing public rc.5 and the older same-version candidate remain unchanged.
