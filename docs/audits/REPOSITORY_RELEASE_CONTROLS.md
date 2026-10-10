# Repository release controls

**Verified:** 2026-10-08 against public repository `360shvit/NodeEditor-Workbench`, main `277588272d37ef37cf959a7e2b70679404d615db` after PR #39.
**Result:** Administration findings partly closed; Track 14 and final acceptance remain BLOCKED.

This is a dated settings observation, not an assertion that source tests enforce remote administration state. Settings changes were saved in GitHub and the resulting checked states/success messages observed. No release, tag, signing job, secret value, product channel or installed application was changed.

## Protection and monitoring

| Control | Verified state / action |
|---|---|
| Main ruleset `23139129` | Active on the default branch; deletion/force push prohibited, linear history, PR required, strict `validate` and `dependency-approval` checks; no bypass actors. Zero required approvals is the existing single-maintainer configuration, not independent review. |
| Version-tag ruleset `24035029` | Active on `refs/tags/v*`; update/deletion/force push prohibited, no bypass actors. Tag creation remains possible; rolling updater tags are outside this pattern. |
| Protected `release` environment | Required reviewer `360shvit`; only branch `main` and tags `v*`. **Administrator bypass disabled and saved** on this date. Self-review remains allowed so the single owner can explicitly approve their own run. This is a manual gate, not two-person separation. |
| Signing secrets | The environment lists `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Only names/presence were inspected. Values were not read or changed; this snapshot is not a new signing test. |
| Actions full SHA policy | **Enabled and saved**. All external `uses:` references in the reviewed source already use full commit SHAs. Windows build/signing workflows retain `windows-2025`; the dependency-approval job retains its existing Ubuntu runner. |
| Actions token / forks | Default token permissions remain read-only; Actions creation/approval of PRs is disabled. First-time contributor fork workflows require approval. Artifact/log retention remains 90 days (individual artifact settings can be shorter). |
| Private Vulnerability Reporting | Already enabled; confirmed in Settings and Security overview. The public reporting policy now links to the private route. |
| Secret scanning / push protection | Already enabled; verified from their enabled-state controls. This does not claim the absence of all possible secrets. |
| Dependency graph / Dependabot alerts | Previously disabled; both **enabled and saved**. Enabling monitoring is not proof that indexing is complete or that no vulnerabilities exist. |
| Malware alerts | **Enabled and saved**. |
| Automatic alert dismissal | The enabled preset for low-impact development dependencies was **disabled and saved**; the package-malware dismissal preset was already disabled. Build dependencies can affect shipped outputs, so alerts require review rather than blanket dismissal. |
| Other security automation | Existing Dependabot version-update configuration retained. Automatic security-update PRs, grouped security updates, automatic dependency submission and CodeQL setup were not enabled by this settings audit. Existing source/CI security gates remain required. |

Disabling environment bypass prevents bypassing that deployment gate under the current configuration; a repository owner can still edit repository settings. Neither tag protection nor environment approval alone makes release assets immutable.

## Version assets and rolling manifests — unresolved

The repository's release-immutability setting remains disabled. The API inventory contains the published rc.3, rc.4, rc.5 and `updater-preview` releases, all reporting `immutable: false`; no `updater-stable` release exists. No existing asset was replaced.

GitHub's [immutability documentation](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes) says the setting applies to future releases. [Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases) lock their assets and tags after publication and recommend assembling a draft before publishing it. Our rolling manifests use replaceable release assets, so blindly enabling this setting before the Stable rolling release exists would break that future update route.

A compatible migration must be prepared and separately approved before public operations:

1. Preserve the existing mutable `updater-preview` release and all published version assets.
2. Obtain explicit owner authorization for creating the missing public `updater-stable` container while releases are still mutable. Do not invent a signed Stable manifest or advertise a nonexistent Stable build.
3. Verify the version-publication path uploads and checks every allowlisted asset before final publication. Make rolling-feed preflight require the expected existing mutable containers; a missing/immutable container must stop publication instead of silently creating an unusable feed.
4. Enable repository release immutability after the migration prerequisites pass. Future version releases should then be provider-protected; earlier releases remain historical mutable assets and must not be described as retroactively protected.
5. During a separately approved publication, verify the resulting version release's immutable flag, asset digests/signature and continuing mutability/monotonic behavior of the intended rolling manifests.

This is a migration outline, not an executed or validated migration. Do not disable immutability opportunistically around normal releases or weaken signature/channel/version checks. Only Stable and Preview remain supported.

## Acceptance still required

- Installed-client manipulation, interruption/retry, download-time edits/Apply and remaining Stable/downgrade cases in [Track 14](PRE_1_0_14_UPDATER_RELEASE.md).
- A fresh signed candidate with verified packaged material in [Track 16](PRE_1_0_16_DEPENDENCIES_NOTICES.md). Per the owner's 2026-10-10 scope decision, unavailable historical upstream build details are a documented limit, not an external-inquiry blocker.
- The identified final candidate's [manual acceptance matrix](PRE_1_0_18_FINAL_ACCEPTANCE.md), followed by the reviewed cleanup inventory. No cleanup deletion occurred here.

Main source CI [37492912413](https://github.com/360shvit/NodeEditor-Workbench/actions/runs/37492912413) passed on the reviewed baseline. It predates these administration changes and is not a deployment or installed-client test. A later documentation PR's required CI must be checked independently before merge.
