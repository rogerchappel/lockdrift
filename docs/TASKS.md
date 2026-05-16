# LockDrift Tasks

## MVP

- [x] Scaffold OSS TypeScript CLI project.
- [x] Copy PRD into docs/PRD.md.
- [x] Parse npm package-lock.json.
- [x] Parse pnpm-lock.yaml.
- [x] Parse Yarn v1 yarn.lock.
- [x] Discover root and workspace package manifests.
- [x] Support .lockdrift.json allowlists, ignores, fail threshold, and workspace roots.
- [x] Detect duplicate locked package versions.
- [x] Detect non-registry sources.
- [x] Detect registry drift.
- [x] Detect manifest dependencies missing from lockfiles.
- [x] Detect low-confidence stale lockfile entries.
- [x] Detect package-manager mismatch.
- [x] Emit Markdown and JSON reports.
- [x] Add scan and explain CLI commands.
- [x] Add npm, pnpm, Yarn, workspace, registry, duplicate, and mismatch fixtures.
- [x] Add fixture-backed tests and CLI smoke tests.
- [x] Add README, safety, contributing, security, license, changelog, and release metadata.

## Post-MVP

- [ ] Improve Yarn Berry support.
- [ ] Add dependency path explanations for nested duplicates.
- [ ] Add SARIF output for code scanning dashboards.
- [ ] Add package-manager specific remediation hints.
- [ ] Add optional online metadata mode for stale or deprecated packages.
