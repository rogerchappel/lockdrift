import type { Finding, ScanSummary } from './types.js';

export function renderJson(summary: ScanSummary): string {
  return `${JSON.stringify(summary, null, 2)}\n`;
}

export function renderMarkdown(summary: ScanSummary): string {
  const lines = [
    '# LockDrift Report',
    '',
    `Root: \`${summary.root}\``,
    `Lockfiles: ${summary.lockfiles.length}`,
    `Manifests: ${summary.manifests.length}`,
    `Findings: ${summary.findings.length}`,
    '',
    '## Lockfiles',
    ''
  ];

  if (summary.lockfiles.length === 0) {
    lines.push('- None found');
  } else {
    for (const lockfile of summary.lockfiles) {
      lines.push(`- \`${lockfile.path}\` (${lockfile.kind}, ${lockfile.packages.length} packages)`);
    }
  }

  lines.push('', '## Findings', '');

  if (summary.findings.length === 0) {
    lines.push('No drift findings detected.');
  } else {
    for (const finding of summary.findings) {
      lines.push(renderFinding(finding), '');
    }
  }

  lines.push('## Direct Dependencies', '');
  const dependencies = summary.manifests.flatMap((manifest) => manifest.dependencies);
  if (dependencies.length === 0) {
    lines.push('- None declared');
  } else {
    for (const dependency of dependencies.sort((a, b) => a.name.localeCompare(b.name))) {
      lines.push(`- \`${dependency.name}\` \`${dependency.spec}\` from \`${dependency.manifestPath}\` ${dependency.scope}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function renderFinding(finding: Finding): string {
  const subject = finding.packageName ? ` \`${finding.packageName}\`` : '';
  const detail = finding.version ? `@${finding.version}` : finding.spec ? ` \`${finding.spec}\`` : '';
  return [
    `### ${finding.severity.toUpperCase()} ${finding.code}${subject}${detail}`,
    '',
    `Evidence: ${finding.evidence}`,
    '',
    `Remediation: ${finding.remediation}`
  ].join('\n');
}
