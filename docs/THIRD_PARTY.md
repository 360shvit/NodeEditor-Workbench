# Third-party material in the public source tree

The project's existing license is in [LICENSE](../LICENSE). Copied third-party material retains the notices below. The Windows installer includes generated `THIRD_PARTY_NOTICES.txt` covering its Cargo runtime graph, vendored frontend, Microsoft loader, compiler-emitted helpers and reviewed installer material.

The checked npm package directories are build/typecheck inputs; local compatibility modules provide the emitted runtime imports. Some TypeScript helper code is emitted into the shipped bundle. Cargo dependencies are obtained from locked registry sources. Installer plug-in review remains open in the [Track 16 review](audits/PRE_1_0_16_DEPENDENCIES_NOTICES.md); the current notices are not a complete distribution sign-off.

## Native SDK and emitted compiler material

- Microsoft.Web.WebView2 SDK 1.0.3650.58: [Microsoft license](third-party/Microsoft-WebView2-SDK-LICENSE.txt) and [upstream notices](third-party/Microsoft-WebView2-SDK-NOTICE.txt). The x64 static loader shipped in `webview2-com-sys 0.38.2` exactly matches the official SDK binary. These are the loader SDK's terms, separate from the Rust wrapper and the Evergreen Runtime.
- TypeScript 5.8.3 emitted helpers: [Apache-2.0 license](third-party/TypeScript-LICENSE.txt) and [upstream third-party notices](third-party/TypeScript-ThirdPartyNoticeText.txt). The compiler package itself is not installed with the app. Its original legal material is retained; no claim is made that an alternative tslib license covers the emitted bytes.

The package-wide NOTICE files are preserved in full; this does not mean every component mentioned in those files is linked into the application. `release-spec/bundled-materials.json` pins provenance and legal-file hashes. Generation rejects changed loader bytes, compiler/wrapper versions, helper output or legal texts until reviewed. It preserves existing upstream terms without changing the project license.

## Installer material

NSIS 3.11 retains its complete [COPYING](third-party/NSIS-COPYING.txt), [NSISdl attribution](third-party/NSISdl-LICENSE.txt) and [Modern UI 2 license](third-party/NSIS-Modern-UI-2-LICENSE.txt), including the original LZMA exception. The additional nsis-tauri-utils 0.5.3 plug-in retains both [MIT](third-party/nsis-tauri-utils-LICENSE-MIT.txt) and [Apache-2.0](third-party/nsis-tauri-utils-LICENSE-APACHE.txt) texts. [Installer provenance evidence](audits/INSTALLER_MATERIALS.md) identifies the verified binaries and the remaining upstream transitive-build gap; these project-level plug-in notices do not assert complete transitive coverage.

## Preact downstream runtime

File: `tauri-ui/preact-lite.js`. Copyright and license: [Preact 10.5.13](https://github.com/preactjs/preact/tree/e523a82cda1d982b6fa82d23cc7539f5f5b4701d), MIT. On 2026-10-05 the downstream body was verified as a binding-preserving rename of the official npm module: 5,163 tokens and 228 local bindings match, while property names, globals, literals and operators are preserved. The `globalThis.PreactLite` adapter exposes the same export-to-binding mapping. Runtime bytes were not changed. [The provenance record](../release-spec/preact-provenance.json) pins the official archive/module and downstream hashes; `scripts/verify-preact-provenance.mjs` reproduces the comparison with that module. The license text below remains the upstream MIT notice.

```text
The MIT License (MIT)

Copyright (c) 2015-present Jason Miller

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Lucide and Feather icon geometry

File: `src/components/LucideIcon.tsx`, included by deterministic emission in `tauri-ui/app.js`. The source identifies Lucide 1.29.0. Both the Lucide ISC and Feather MIT notices are retained because the selected geometry includes Feather-derived icons. [Upstream license for 1.29.0](https://github.com/lucide-icons/lucide/blob/1.29.0/LICENSE):

```text
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
