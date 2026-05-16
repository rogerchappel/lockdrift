# LockDrift PRD

Status: in-progress
Factory run: 2026-05-17 AM

## One-liner
`lockdrift` audits package lockfiles for duplicate versions, registry surprises, git deps, and stale package metadata before dependency drift bites. 🔒

## Source attribution
Created during the 2026-05-14 evening OSS Factory run. Web search was attempted for current developer-tool pain points, but the configured provider returned an authentication/plan error. Inspired by recurring npm/pnpm/yarn lockfile drift in OSS and agent-generated projects; this is a renamed/reframed deterministic local auditor, not copied from a specific project.

## Target users
- OSS maintainers reviewing dependency churn.
- Agents that need safe dependency context before edits.
- Developers preparing releases from Node/TypeScript repos.

## Problem
Lockfiles encode important supply-chain facts, but humans rarely read them. Duplicate major versions, unexpected registries, git/tarball dependencies, stale package metadata, and workspace mismatch can slip into repos without a clear local report.

## Goals
- Parse common JavaScript lockfiles offline.
- Compare lockfile facts with `package.json` and workspace metadata.
- Flag duplicate packages, registry drift, non-registry dependencies, abandoned pins, and package/lock mismatch.
- Emit deterministic Markdown/JSON reports suitable for CI and agent handoffs.
- Provide safe config for allowlisted registries/packages.

## Non-goals
- Vulnerability database lookups in V1.
- Installing or updating dependencies.
- Replacing package-manager native commands.

## V1 CLI

```bash
lockdrift scan . --out docs/LOCKDRIFT.md
lockdrift scan fixtures/drift --format json --fail-on medium
lockdrift explain pnpm-lock.yaml --package commander
```

## Functional requirements
1. Parse `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, root `package.json`, and workspace package manifests.
2. Detect duplicate resolved versions, git/file/tarball specs, non-allowlisted registries, missing lock entries, unused lock entries, and package-manager mismatch.
3. Support `.lockdrift.json` for allowed registries, ignored packages, severity thresholds, and workspace roots.
4. Emit stable Markdown/JSON with package, version/spec, evidence, severity, and remediation.
5. Include fixture-backed tests for npm, pnpm, yarn, workspace, registry, duplicate, and mismatch cases.

## Acceptance criteria
- `npm test`, `npm run check`, `npm run build`, and `npm run smoke` pass.
- `bash scripts/validate.sh` passes when present.
- Real CLI smoke scans checked-in fixtures and writes reports.
- README covers quick start, safety model, examples, config, limitations, and CI usage.
- Public GitHub repo `rogerchappel/lockdrift` has useful description and topics.
