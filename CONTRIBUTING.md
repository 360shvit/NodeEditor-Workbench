# Contributing

This project is pre-1.0 and changes are expected to preserve the existing safety and release contracts.

Before proposing changes, read `README.md`, `docs/ARCHITECTURE.md`, `docs/VALIDATION.md` and `release-spec/README.md`.

Changes must preserve native authority boundaries, staged ChangeSet review, deterministic embedded-bundle generation and the allowlisted release surface. Do not commit private signing keys, generated release payloads, local project data, logs containing private paths, `node_modules`, Cargo target directories or environment-secret files.

A code change is not release-ready until its relevant automated regression tests are green. Release/updater changes additionally require the Windows/native validation gates described in `docs/VALIDATION.md`.
