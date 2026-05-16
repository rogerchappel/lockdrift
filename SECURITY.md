# Security Policy

LockDrift is an offline auditor. It should not install dependencies, update lockfiles, publish packages, or call external registries during a scan.

## Reporting

Please report suspected security issues through GitHub private vulnerability reporting when available, or contact the maintainers before publishing details.

## Scope

In scope:

- Bugs that cause LockDrift to execute untrusted project data.
- Bugs that make scans write outside paths explicitly provided by the user.
- Release, package, or CI configuration issues in this repository.

Out of scope:

- Vulnerabilities in projects scanned by LockDrift.
- Vulnerability database completeness.
- Findings that correctly report risky lockfile facts.

## Supported Versions

The current \`main\` branch and latest released version receive security fixes.
