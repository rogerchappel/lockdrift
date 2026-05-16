import path from 'node:path';
import type { Finding, LockdriftConfig, LockfileFacts, LockPackage, ManifestDependency, PackageManifest, ScanSummary } from './types.js';
import { registryFromResolved } from './source.js';

export function analyze(root: string, lockfiles: LockfileFacts[], manifests: PackageManifest[], config: LockdriftConfig): ScanSummary {
  const packages = lockfiles.flatMap((lockfile) => lockfile.packages);
  const manifestDependencies = manifests.flatMap((manifest) => manifest.dependencies);
  const findings = [
    ...findDuplicateVersions(packages, config),
    ...findNonRegistrySources(packages, config),
    ...findRegistryDrift(packages, config),
    ...findMissingLockEntries(manifestDependencies, packages, config),
    ...findUnusedLockEntries(manifestDependencies, packages, config),
    ...findPackageManagerMismatch(lockfiles, manifests)
  ].sort(compareFindings);

  return { root: path.resolve(root), lockfiles, manifests, findings };
}

function findDuplicateVersions(packages: LockPackage[], config: LockdriftConfig): Finding[] {
  const byName = groupBy(packages.filter((pkg) => !isIgnored(pkg.name, config)), (pkg) => pkg.name);
  const findings: Finding[] = [];

  for (const [name, entries] of byName) {
    const versions = new Map<string, LockPackage[]>();
    for (const entry of entries) {
      if (entry.version) {
        versions.set(entry.version, [...versions.get(entry.version) ?? [], entry]);
      }
    }
    if (versions.size <= 1) {
      continue;
    }
    findings.push({
      code: 'duplicate-version',
      severity: 'medium',
      packageName: name,
      evidence: [...versions.entries()].map(([version, versionEntries]) => `${version} in ${versionEntries.map((entry) => entry.lockfile).join(', ')}`).join('; '),
      remediation: 'Align dependency ranges or dedupe with the package manager before release.'
    });
  }

  return findings;
}

function findNonRegistrySources(packages: LockPackage[], config: LockdriftConfig): Finding[] {
  return packages
    .filter((pkg) => !isIgnored(pkg.name, config) && pkg.source !== 'registry')
    .map((pkg) => ({
      code: 'non-registry-source',
      severity: pkg.source === 'git' ? 'high' : 'medium',
      packageName: pkg.name,
      version: pkg.version,
      spec: pkg.spec,
      evidence: `${pkg.name} resolves from ${pkg.source} source ${pkg.spec ?? pkg.resolved ?? pkg.key}`,
      remediation: 'Confirm the source is intentional and add an ignore only after review.'
    }));
}

function findRegistryDrift(packages: LockPackage[], config: LockdriftConfig): Finding[] {
  return packages.flatMap((pkg) => {
    if (isIgnored(pkg.name, config)) {
      return [];
    }
    const registry = registryFromResolved(pkg.resolved);
    if (!registry || config.allowedRegistries.includes(registry)) {
      return [];
    }
    return [{
      code: 'registry-drift' as const,
      severity: 'high' as const,
      packageName: pkg.name,
      version: pkg.version,
      spec: pkg.resolved,
      evidence: `${pkg.name} resolves from ${registry}, allowed registries: ${config.allowedRegistries.join(', ')}`,
      remediation: 'Verify the registry host, then add it to .lockdrift.json only if it is expected.'
    }];
  });
}

function findMissingLockEntries(dependencies: ManifestDependency[], packages: LockPackage[], config: LockdriftConfig): Finding[] {
  const packageNames = new Set(packages.map((pkg) => pkg.name));
  return dependencies
    .filter((dependency) => !isIgnored(dependency.name, config) && !isLocalSpec(dependency.spec) && !packageNames.has(dependency.name))
    .map((dependency) => ({
      code: 'missing-lock-entry',
      severity: 'high',
      packageName: dependency.name,
      spec: dependency.spec,
      evidence: `${dependency.name}@${dependency.spec} appears in ${dependency.manifestPath} ${dependency.scope} but not in any lockfile`,
      remediation: 'Regenerate the lockfile with the intended package manager.'
    }));
}

function findUnusedLockEntries(dependencies: ManifestDependency[], packages: LockPackage[], config: LockdriftConfig): Finding[] {
  const directNames = new Set(dependencies.map((dependency) => dependency.name));
  const referencedNames = new Set(packages.flatMap((pkg) => pkg.dependencyNames));
  return packages
    .filter((pkg) => !isIgnored(pkg.name, config) && !directNames.has(pkg.name) && !referencedNames.has(pkg.name))
    .map((pkg) => ({
      code: 'unused-lock-entry',
      severity: 'low',
      packageName: pkg.name,
      version: pkg.version,
      evidence: `${pkg.name}@${pkg.version ?? 'unknown'} is locked in ${pkg.lockfile} but is not a direct manifest dependency and has no locked child dependencies`,
      remediation: 'Run the package manager prune/install flow and review whether the lockfile carries stale entries.'
    }));
}

function findPackageManagerMismatch(lockfiles: LockfileFacts[], manifests: PackageManifest[]): Finding[] {
  const lockKinds = new Set(lockfiles.map((lockfile) => lockfile.kind));
  const packageManagers = manifests.map((manifest) => manifest.packageManager).filter((value): value is string => Boolean(value));
  const findings: Finding[] = [];

  for (const packageManager of packageManagers) {
    const expected = packageManager.split('@')[0];
    if (expected === 'npm' || expected === 'pnpm' || expected === 'yarn') {
      if (!lockKinds.has(expected)) {
        findings.push({
          code: 'package-manager-mismatch',
          severity: 'medium',
          spec: packageManager,
          evidence: `packageManager declares ${packageManager}, but discovered lockfiles: ${[...lockKinds].join(', ') || 'none'}`,
          remediation: 'Commit the matching lockfile or update packageManager to the tool that owns the lockfile.'
        });
      }
    }
  }

  if (lockKinds.size > 1) {
    findings.push({
      code: 'package-manager-mismatch',
      severity: 'medium',
      evidence: `Multiple package-manager lockfiles found: ${[...lockKinds].join(', ')}`,
      remediation: 'Keep only the lockfile for the package manager used by this repository.'
    });
  }

  return findings;
}

function isIgnored(name: string, config: LockdriftConfig): boolean {
  return config.ignoredPackages.includes(name);
}

function isLocalSpec(spec: string): boolean {
  return spec.startsWith('workspace:') || spec.startsWith('file:') || spec.startsWith('link:');
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const value = key(item);
    map.set(value, [...map.get(value) ?? [], item]);
  }
  return map;
}

function compareFindings(a: Finding, b: Finding): number {
  return [
    a.severity.localeCompare(b.severity),
    (a.packageName ?? '').localeCompare(b.packageName ?? ''),
    a.code.localeCompare(b.code)
  ].find((value) => value !== 0) ?? 0;
}
