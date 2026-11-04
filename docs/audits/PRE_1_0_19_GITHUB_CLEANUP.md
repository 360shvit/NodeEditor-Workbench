# Pre-1.0 Audit 19 — GitHub cleanup execution

**Status:** PASS for the reviewed cleanup scope, executed 2026-11-03 and independently checked 2026-11-04.
**Repository:** `360shvit/NodeEditor-Workbench`; main before/after cleanup `2baa6fb2bc3f3dc8c55dc55081847dc44adaf351`.

The owner explicitly requested Tracks 18 and 19 now. This authorizes the reviewed cleanup independently of the remaining acceptance/publication gates and supersedes the earlier scheduling dependency on all of Track 18. The owner separately deferred the public Stable-container/immutability migration on 2026-11-02; that decision remains in force.

The refreshed inventory contained **42 branches**. Only **33 reviewed branch references** were removed: 27 exact merged-PR heads and six temporary ancestors of the merged PR #25 head. A subsequent API inventory and GitHub All branches view confirm **nine retained branches**. These counts describe the cleanup snapshot, before a branch for this documentation change is created.

## Removed references and retained history

For each of the following 27 branches, the current head exactly matched its merged PR head, and the PR's merge commit was reachable in main. The reviewed heads were recorded before deletion. GitHub offered Restore after each deletion. PR discussions, commits and committed audit documents were retained.

| Removed branch | Merged PR | Verified head |
|---|---|---|
| `audit/pre-1.0-full-review` | [#25](https://github.com/360shvit/NodeEditor-Workbench/pull/25) | `7c67b3a67a45d12547dce47951c0b0c45fe9ec5e` |
| `docs/rc4-installed-update-evidence` | [#29](https://github.com/360shvit/NodeEditor-Workbench/pull/29) | `0146aa00658b223301fd21bde4d55d10353d93c1` |
| `test/rc5-updater-validation` | [#30](https://github.com/360shvit/NodeEditor-Workbench/pull/30) | `c95bb6697841edf355027228e544f863c76706e7` |
| `docs/rc5-installed-update-evidence` | [#31](https://github.com/360shvit/NodeEditor-Workbench/pull/31) | `f9f5a3b341ce01b0f3a23a4171338b16d85d23fd` |
| `docs/roadmap-github-cleanup` | [#32](https://github.com/360shvit/NodeEditor-Workbench/pull/32) | `5e612070bc3b0123bf7a2b4c07cdb4c29d77e424` |
| `audit/track15-build-ci` | [#33](https://github.com/360shvit/NodeEditor-Workbench/pull/33) | `8f0d254259e23355685d18279074b6d444da996a` |
| `audit/track15-artifact-provenance` | [#34](https://github.com/360shvit/NodeEditor-Workbench/pull/34) | `a0616a485cd4ff7efbf1662be8fad33fa6544960` |
| `docs/track15-candidate-evidence` | [#35](https://github.com/360shvit/NodeEditor-Workbench/pull/35) | `6834effee6efc423a5d77c94fe5ebee527e10512` |
| `audit/track16-dependency-notices` | [#36](https://github.com/360shvit/NodeEditor-Workbench/pull/36) | `0bdc9a48091a61aa3990b974eff8a3a790132d16` |
| `audit/final-tracks-readiness` | [#38](https://github.com/360shvit/NodeEditor-Workbench/pull/38) | `8088af7a9bad5730ca30621a09e5b88b4f23d0bd` |
| `audit/installer-material-notices` | [#39](https://github.com/360shvit/NodeEditor-Workbench/pull/39) | `0bf6c309976314a500b85d931ba37e6aa87a064e` |
| `audit/repository-release-controls` | [#40](https://github.com/360shvit/NodeEditor-Workbench/pull/40) | `98b808962169b972a39ed5c319f42155b521ca5c` |
| `release/preview-rc6-candidate` | [#41](https://github.com/360shvit/NodeEditor-Workbench/pull/41) | `18d014cc8c4842fea24aea22418e5c4e3594de18` |
| `docs/rc6-candidate-evidence` | [#45](https://github.com/360shvit/NodeEditor-Workbench/pull/45) | `2fed634bf8e75586d2b59da05dbcf83eef77cc06` |
| `fix/release-draft-verification` | [#46](https://github.com/360shvit/NodeEditor-Workbench/pull/46) | `60eee6ead718af974d5374308fc56472dab7dd14` |
| `fix/discard-field-input-drafts` | [#47](https://github.com/360shvit/NodeEditor-Workbench/pull/47) | `9f8a1e1f2a79d206fc020789a2bae7df8d5b194f` |
| `release/rc7-discard-retest` | [#48](https://github.com/360shvit/NodeEditor-Workbench/pull/48) | `4dee58165508e39fd27ffb2871e9c6f93dfab472` |
| `fix/windows-apply-file-sync` | [#49](https://github.com/360shvit/NodeEditor-Workbench/pull/49) | `1603cc2a63cf3d8888d26079361b4997a18f57e6` |
| `release/rc8-apply-retest` | [#50](https://github.com/360shvit/NodeEditor-Workbench/pull/50) | `02a9fa3307417bc49caccf687b3d2e7c61706a69` |
| `docs/rc8-installed-acceptance` | [#51](https://github.com/360shvit/NodeEditor-Workbench/pull/51) | `38e0127fa7926a24030d1f3adbbdb09e409adda8` |
| `docs/rc8-ui-acceptance` | [#52](https://github.com/360shvit/NodeEditor-Workbench/pull/52) | `c5dcae91536d464acbf147bad47e7469727d2de2` |
| `docs/rc8-accessibility-diagnostics` | [#53](https://github.com/360shvit/NodeEditor-Workbench/pull/53) | `e0e9aac2eb6fb9b485e86def8381fcf15c6bdc1a` |
| `docs/rc8-representative-project` | [#54](https://github.com/360shvit/NodeEditor-Workbench/pull/54) | `60f769d423d8f6931271f83c83bdba07ade40cfe` |
| `docs/rc8-reference-acceptance` | [#56](https://github.com/360shvit/NodeEditor-Workbench/pull/56) | `791cffa464e4b72e7d187083ac80adfda014be1f` |
| `docs/rc8-offline-updater-acceptance` | [#57](https://github.com/360shvit/NodeEditor-Workbench/pull/57) | `2c579cdc2da0534b4ca2e78e8d11c3d3816a547b` |
| `docs/rc8-updater-fault-acceptance` | [#58](https://github.com/360shvit/NodeEditor-Workbench/pull/58) | `8a581253a2b534481b6d132bae942e4123961049` |
| `docs/rc8-reinstall-acceptance` | [#59](https://github.com/360shvit/NodeEditor-Workbench/pull/59) | `272576ae17e59aecc85bf707af8f3fbc25e41d6f` |

Five temporary refs (`tmp-final-mistake`, `tmp-never-mind`, `tmp-no-more`, `tmp-tool-error`, `tmp-track07-docs-DO-NOT-USE`) pointed to `fffe2fe5f640745b1463fe028aef6162e3a61ac9`. GitHub comparison to PR #25 head `7c67b3a67a45d12547dce47951c0b0c45fe9ec5e` reported ahead 40 / behind 0, with that temporary head as the merge base. `tmp-noop` pointed to `d253a81ad99197c5b7fd9d65132efaaaf9ac0b74`; the same comparison reported ahead 43 / behind 0 and that head as merge base. These ancestry checks establish no unique work on those six refs outside the already-reviewed PR history. All six were removed only after this review; Restore was observed.

## Retained work

- Protected default branch `main`.
- `docs/rc7-installed-acceptance` at `325a9ce250b499ec5a5e00875f9d6c7856e057bb`: its exact head has no merged PR. Later acceptance records supersede some of its text, but that is insufficient reason to delete unmerged history.
- Seven active dependency PR branches: #26 (`zerofrom-derive`), #27 (`jiff-core`), #28 (`cc`), #42 (`rust-toolchain`), #43 (`setup-node`), #44 (`upload-artifact`) and #55 (`zustand`). Their existing unsuccessful checks need separate dependency review; cleanup did not merge, close or delete them.
- No separate open issues were returned by the refreshed inventory. Existing labels/milestones were left unchanged; no redundant label or milestone was established.
- Actions logs/artifacts and local candidate verification evidence were not deleted. The rc.8 candidate run's artifact listing is now empty after its documented 2026-10-30 expiry; this is not a cleanup deletion or proof that a build never existed. The broader artifact inventory endpoint was unavailable through the connector.

## Protected material and verification

The four published release records remain `v0.11.36-rc.3`, `v0.11.36-rc.4`, `v0.11.36-rc.5` and `updater-preview`. Before/after API comparison confirms identical release IDs and all **19 asset IDs, names, byte counts and SHA-256 digests**, including the Preview feed manifest. No release, tag, installer, signature, hash, notices, surface manifest or updater URL was changed. This comparison verifies preservation; it is not a new installed download test.

Both active rulesets remain present: `23139129` Protect main and `24035029` Protect version tags. Main stayed at the same passing source commit throughout branch cleanup. Required checks, pinned Actions, the fixed Windows runner, locks and protected signing environment were not modified. No security alert was dismissed. The documentation update remains subject to the normal required checks before merge.

The [current roadmap](../PRE_1_0_AUDIT_ROADMAP.md) and [installed acceptance matrix](PRE_1_0_18_FINAL_ACCEPTANCE.md) distinguish completed observations from remaining release gates. Existing evidence links use main files, PRs, commits and workflow runs; removing redundant branch references does not remove those records. No public Stable container or application release is authorized by this cleanup result.

Private local evidence retains the exact before/after inventory, ancestry comparisons and UI confirmation. It contains no private signing material. This public record deliberately excludes personal paths, project contents and raw support logs.
