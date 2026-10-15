# Preview rc.6 — signed candidate verification

**Status:** PASS for candidate build, cryptographic verification and packaged material. Installation, installed-client negative tests and public publication are NOT RUN by this record.
**Build date:** 2026-10-12. **Independent verification:** 2026-10-15.
**Source:** `57195937f34ca48914fa85b1ce384652e47aadf2`, tree `c4710f557f45c00f725b3f3e50f5890a6682be3a`, version `0.11.36-rc.6-r1` / updater `0.11.36-rc.6`.

## Protected build

[Validate Release Candidate #11](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/38283054735), job `114924737614`, succeeded after the owner's `release` environment approval. It used `windows-2025`, image `20260925.250.1`, pinned Rust/Node/Actions and locked Tauri CLI `2.11.0`. Read-only repository permissions and the non-publishing workflow were retained.

Logs confirm **92/92** regression suites, **250** soak cycles, **39/39** native tests, **21** Windows failure-path cases, deterministic embedded parity, deep release-integrity mutations, zero unused carry, generated notices, signed NSIS packaging, **442** exact installer-toolset files, the six-file Preview surface and cryptographic updater-signature verification. The [post-merge source CI](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/38051923840) also passed on this exact source.

Artifact `11762947762`, named `release-candidate-57195937f34ca48914fa85b1ce384652e47aadf2`, contained 3,110,428 bytes. Its downloaded ZIP matched GitHub's digest. Its seven-day expiry is 2026-10-19 17:36:48 UTC; the recorded identity and hashes below remain after expiry. No tag, release or feed was created or changed.

## Independent artifact checks

The six-file surface allowlist, all recorded hashes, surface sizes/identity, installer hash sidecar and exact Preview manifest version/platform/URL/signature matched. Both lock hashes matched source. Root, public and installer-embedded notices were byte-identical: **249** runtime/material entries and **164** distinct legal texts. The artifact's toolset evidence matches the committed 442-file index, SHA-256 `ea477d14cec2ba008a7d155f04165a29f5580c9140a84b84c28bf1e5b0193924`.

| Material | SHA-256 |
|---|---|
| Artifact ZIP | `7a36ffb3517755efa94438c32298f7092b3413a55ef89a884a39589e93eeef1c` |
| Installer `Hytale-Generator-Workbench_0.11.36-rc.6_x64-setup.exe` | `de04e2bebc84c0fe2125d02c1f8c3320df849e8681297c0180000d9df2e14b32` |
| Installer signature | `fb73785b5ec5cec288fe140697ced31d329d6f210cb458883d6f3dea66f7b911` |
| Installer hash sidecar | `fb8a4f201cef0c05ce30cae7a8130497ce59923d62bf896d361bbf88f627a592` |
| `RELEASE_SURFACE.json` | `8fa127614a9cb9ebfd4806d9594f14f857cf1b38fc3196598901b217a5c1a8e2` |
| Candidate `latest-preview.json` | `72cf220653a4921188fbadeeb79354a08ded2d5a28446157458d212eec3f1446` |
| Notices, including embedded copy | `4ac9c6ceb24e0e34a28d8829d6b17490568d97301d41b9ae8bd5dd57b55628d2` |
| Embedded project `LICENSE` | `7991b28025bc6b9ed3ea49f189f36a3de7c8b31e83714c52d0d57099928456f2` |
| Embedded application executable | `03cefa69375485b8a71bada94ebe3266fee8620c7b658c1a1bebdb5b3a5a4472` |
| npm lock | `426366b40242637d506eabcdf2a2128e369e35c5fb0d91b0e632a574bc52bd20` |
| Cargo lock | `3d7e66d96f687a543043f9109709bd33e57f698f92392b4546de5c010ce26b4a` |

The updater signature verified with algorithm `ED` and key ID `6fee5e670300baef`. The committed public-key file retains SHA-256 `33374e88c5b4f66546b789e0b20ea568b695364b4a1c84ab64bb25a585b1cc62`. This is Tauri updater signature verification; it is not an Authenticode-signing claim. No private signing value was read or changed.

## Actual installer contents

The NSIS archive was extracted for inspection without executing the installer or application. [Official 7-Zip 26.04](https://www.7-zip.org/download.html) was obtained from the vendor's `ip7z/7zip` release and its two downloaded file digests matched GitHub's published digests. The extraction tools stayed in the local evidence folder; no system installation or project dependency was added. The vendor installer was itself unpacked with `7zr`, not executed.

The embedded executable's product version is `0.11.36-rc.6`. Embedded `LICENSE` matches committed source and embedded notices match the generated artifact. The five embedded DLLs (`System`, `nsDialogs`, `StartMenu`, `NSISdl`, `nsis_tauri_utils`) each match exactly one reviewed index entry. In particular, the actual embedded `nsis_tauri_utils.dll` is `5ba143b5db4a87d32d6e7802e033330aae56cbceabe0d1e3ba41948385ad4709`.

For reproducing the inspection-tool provenance: official `7z2604-x64.exe` has SHA-256 `d54bf805f9f3704d1e8db2fa3498ae7ef2df0312b40b558e7c71c734430a665d`; official `7zr.exe` has SHA-256 `256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282`.

## Negative checks and remaining boundaries

In-memory changes to the downloaded installer and to its signature were each rejected by the standalone verifier. **This does not establish rejection inside the installed application.** The existing installed rc.5 executable still had its recorded hash `2df801761e0f18152ce18288f262a0c4cb1394570538a948f26de61418786a4a` on 2026-10-15; no candidate installation or new installed E2E observation is claimed.

The candidate's fresh distribution evidence classifies `glib 0.18.5` as `other-target`, not resolved for `x86_64-pc-windows-msvc`. GitHub Dependabot alert #1 / `GHSA-wrw7-89jp-8q8g` matches the already documented advisory and was left open. This Windows conclusion does not clear Linux/macOS distribution or all future advisories.

The owner's 2026-10-10 scope decision remains: unavailable historical upstream compiler/resolution details are unverified accepted review limits; no external inquiry is required. No complete reconstruction of the plug-in's historical build or bit-identical native reproducibility is claimed.

This closes Track 16's fresh signed-candidate/material exit gate. [Track 14](PRE_1_0_14_UPDATER_RELEASE.md) installed-client and version-asset controls, [Track 18](PRE_1_0_18_FINAL_ACCEPTANCE.md) manual acceptance and subsequent [Track 19](PRE_1_0_19_GITHUB_CLEANUP.md) remain. Only Stable and Preview exist; public publication requires separate explicit owner authorization.
