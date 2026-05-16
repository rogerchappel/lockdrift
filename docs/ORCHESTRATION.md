# LockDrift Orchestration

LockDrift is designed for local agent and CI use. It reads project files, parses lockfiles, and writes reports only when explicitly asked with \`--out\`.

## Agent Contract

- Run from a repository root or pass the target path explicitly.
- Prefer \`lockdrift scan . --format json\` for machine handoffs.
- Prefer \`lockdrift scan . --out docs/LOCKDRIFT.md\` for human review.
- Use \`--fail-on medium\` in CI when dependency drift should block a change.
- Do not treat findings as vulnerability claims; they are supply-chain facts that need review.

## Safe Defaults

- No install, update, network, publish, or registry calls.
- Default allowed registry is \`https://registry.npmjs.org/\`.
- Default fail threshold is \`high\`.
- Config stays local in \`.lockdrift.json\`.

## Suggested CI Step

\`\`\`bash
npm ci
npm run build
npx lockdrift scan . --format json --fail-on medium
\`\`\`

## Handoff Checklist

- Attach the Markdown or JSON report.
- Mention package-manager mismatch findings first.
- Treat git/file/tarball sources as review blockers unless already approved.
- Review registry-drift findings before accepting lockfile churn.
