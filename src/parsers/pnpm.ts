import { readFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import type { LockfileFacts, LockPackage } from '../types.js';
import { classifySource } from '../source.js';

type PnpmLock = {
  lockfileVersion?: string | number;
  packages?: Record<string, PnpmPackageEntry>;
  importers?: Record<string, PnpmDependencyEntry>;
  snapshots?: Record<string, PnpmDependencyEntry>;
};

type PnpmDependencyEntry = {
  dependencies?: Record<string, string | PnpmDependencyReference>;
  optionalDependencies?: Record<string, string | PnpmDependencyReference>;
  peerDependencies?: Record<string, string>;
};

type PnpmDependencyReference = {
  version?: string;
  specifier?: string;
};

type PnpmPackageEntry = PnpmDependencyEntry & {
  resolution?: { integrity?: string; tarball?: string; repo?: string };
};

export async function parsePnpmLockfile(file: string, root: string): Promise<LockfileFacts> {
  const raw = YAML.parse(await readFile(file, 'utf8')) as PnpmLock;
  const packages: LockPackage[] = [];
  const snapshotDependencies = collectSnapshotDependencies(raw.snapshots ?? {});

  for (const [key, entry] of Object.entries(raw.packages ?? {})) {
    const parsed = parsePnpmPackageKey(key);
    const resolved = entry.resolution?.tarball ?? entry.resolution?.repo;
    const spec = resolved ?? parsed.version;
    packages.push({
      name: parsed.name,
      version: parsed.version,
      spec,
      resolved,
      integrity: entry.resolution?.integrity,
      source: classifySource(spec, resolved),
      lockfile: path.relative(root, file),
      key,
      dependencyNames: [
        ...dependencyNames(entry),
        ...(snapshotDependencies.get(packageIdentity(parsed)) ?? [])
      ].filter((name, index, names) => names.indexOf(name) === index).sort()
    });
  }

  return {
    kind: 'pnpm',
    path: path.relative(root, file),
    packages: packages.sort((a, b) => a.key.localeCompare(b.key))
  };
}

function collectSnapshotDependencies(snapshots: Record<string, PnpmDependencyEntry>): Map<string, string[]> {
  const dependencies = new Map<string, Set<string>>();

  for (const [key, entry] of Object.entries(snapshots)) {
    const identity = packageIdentity(parsePnpmPackageKey(key));
    const names = dependencies.get(identity) ?? new Set<string>();
    for (const name of dependencyNames(entry)) names.add(name);
    dependencies.set(identity, names);
  }

  return new Map([...dependencies].map(([identity, names]) => [identity, [...names]]));
}

function dependencyNames(entry: PnpmDependencyEntry): string[] {
  return [
    ...Object.keys(entry.dependencies ?? {}),
    ...Object.keys(entry.optionalDependencies ?? {}),
    ...Object.keys(entry.peerDependencies ?? {})
  ];
}

function packageIdentity(pkg: { name: string; version?: string }): string {
  return `${pkg.name}@${pkg.version ?? ''}`;
}

function parsePnpmPackageKey(key: string): { name: string; version?: string } {
  const clean = key.replace(/^\//, '');

  // pnpm 9 uses name@version(peer@version), while older lockfiles use
  // /name/version_peer@version. Scoped package names contain the first @.
  const modernSeparator = clean.indexOf('@', clean.startsWith('@') ? clean.indexOf('/') : 0);
  const slashCount = [...clean].filter((character) => character === '/').length;
  const isLegacySlashKey = clean.startsWith('@') ? slashCount > 1 : slashCount > 0;
  if (!isLegacySlashKey && modernSeparator > (clean.startsWith('@') ? clean.indexOf('/') : 0)) {
    return {
      name: clean.slice(0, modernSeparator),
      version: clean.slice(modernSeparator + 1).split('(')[0]
    };
  }

  if (clean.startsWith('@')) {
    const parts = clean.split('/');
    const scopedName = `${parts[0]}/${parts[1]}`;
    const version = parts[2]?.split('_')[0];
    return { name: scopedName, version };
  }

  const parts = clean.split('/');
  return { name: parts[0] ?? clean, version: parts[1]?.split('_')[0] };
}
