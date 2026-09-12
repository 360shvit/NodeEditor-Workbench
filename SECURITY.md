# Security Policy

Hytale Generator Workbench is still in pre-1.0 acceptance. Security-sensitive issues should **not** be posted with exploit details in a public issue.

## Reporting

Until a dedicated security contact or GitHub private-vulnerability-reporting channel is configured, do not publish sensitive reproduction details. Repository bootstrap must enable GitHub Private Vulnerability Reporting (or document an equivalent private contact) before the source repository is advertised publicly.

A valid report should include the affected version, platform, impact, minimal reproduction conditions and whether project data, filesystem authority, updater/signing material or release integrity is involved. Do not include private signing keys, user project contents or unrelated personal data.

## Release-security invariants

- updater private keys are never committed or packaged;
- updater public keys may be committed;
- end-user release publication comes only from the checked `release/public/` allowlist;
- public releases use unique SemVer identities and must not republish a different updater under the same SemVer;
- the WebView does not receive direct updater plugin authority;
- staged project changes are rechecked by native authority immediately before update installation/restart;
- dependency lockfiles and pinned release toolchains are required before publication.

## Supported versions

No public stable version is supported yet. The current development/acceptance line is documented in `release-spec/release-contract.json`.
