# LockDrift

Offline JavaScript lockfile drift and supply-chain facts auditor.

LockDrift reads package manifests and lockfiles locally, then reports facts that are easy to miss in review: duplicate locked versions, unexpected registries, git/file/tarball sources, package-manager mismatches, direct dependencies missing from lockfiles, and likely stale lock entries.

## Quick Start

\`\`\`bash
npm install
npm run build
npx lockdrift scan . --out docs/LOCKDRIFT.md
npx lockdrift scan . --format json --fail-on medium
npx lockdrift explain pnpm-lock.yaml --package commander
\`\`\`

For local development:

\`\`\`bash
npm test
npm run check
npm run build
npm run smoke
bash scripts/validate.sh
\`\`\`

## CLI

\`lockdrift scan [path]\`

- \`--format markdown|json\`: choose report format. Default is Markdown.
- \`--out <path>\`: write the report to a file. Without this, LockDrift writes to stdout.
- \`--fail-on info|low|medium|high\`: exit non-zero when findings meet the threshold.

\`lockdrift explain <lockfile> --package <name>\`

Prints the locked versions, source, resolved URL, integrity, and child dependency names for one package in one lockfile.

## Config

Create \`.lockdrift.json\` at the scanned project root:

\`\`\`json
{
  "allowedRegistries": ["https://registry.npmjs.org/"],
  "ignoredPackages": ["internal-tool"],
  "failOn": "medium",
  "workspaceRoots": ["packages/*"]
}
\`\`\`

## Safety Model

- Runs offline.
- Does not install, update, publish, or call registries.
- Reads \`package.json\`, \`package-lock.json\`, \`pnpm-lock.yaml\`, \`yarn.lock\`, workspace manifests, and \`.lockdrift.json\`.
- Writes only when \`--out\` is provided.
- Findings are review signals, not vulnerability database claims.

## Supported Lockfiles

- npm \`package-lock.json\` v2/v3 package maps, plus older dependency maps.
- pnpm \`pnpm-lock.yaml\` package entries.
- Yarn v1 \`yarn.lock\`.

Yarn Berry support is limited in this MVP. Vulnerability database lookups are intentionally out of scope.

## CI Example

\`\`\`yaml
- run: npm ci
- run: npm run build
- run: npx lockdrift scan . --format json --fail-on medium
\`\`\`

## Development

The fixture suite under \`fixtures/\` covers npm, pnpm, Yarn, workspace, registry, duplicate, and mismatch cases. Tests compile TypeScript first and execute against \`dist/\` so the CLI path is exercised.

See \`docs/PRD.md\`, \`docs/TASKS.md\`, and \`docs/ORCHESTRATION.md\` for factory context.

## Package contents

The npm package allowlist includes the runtime files plus the public support
documents needed for release review: `README.md`, `LICENSE`, `SECURITY.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.
Run `npm run package:smoke` or `npm pack --dry-run` before publishing to
confirm those files are still present in the tarball.

