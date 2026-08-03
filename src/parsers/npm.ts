import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { LockfileFacts, LockPackage } from '../types.js';
import { classifySource } from '../source.js';

type PackageLock = {
  lockfileVersion?: number;
  packageManager?: string;
  packages?: Record<string, NpmPackageEntry>;
  dependencies?: Record<string, NpmPackageEntry>;
};

type NpmPackageEntry = {
  version?: string;
  resolved?: string;
  integrity?: string;
  requires?: Record<string, string>;
  dependencies?: Record<string, string | NpmPackageEntry>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

export async function parseNpmLockfile(file: string, root: string): Promise<LockfileFacts> {
  const raw = JSON.parse(await readFile(file, 'utf8')) as PackageLock;
  const packages: LockPackage[] = [];

  if (raw.packages) {
    for (const [key, entry] of Object.entries(raw.packages)) {
      if (key === '' || !entry.version) {
        continue;
      }
      const name = packageNameFromPackagePath(key);
      packages.push(toPackage(file, root, key, name, entry));
    }
  } else if (raw.dependencies) {
    collectDependencyMapPackages(file, root, raw.dependencies, '', packages);
  }

  return {
    kind: 'npm',
    path: path.relative(root, file),
    packages: packages.sort((a, b) => a.key.localeCompare(b.key)),
    packageManager: raw.packageManager
  };
}

function collectDependencyMapPackages(
  file: string,
  root: string,
  dependencies: Record<string, NpmPackageEntry>,
  parentKey: string,
  packages: LockPackage[]
): void {
  for (const [name, entry] of Object.entries(dependencies)) {
    const key = `${parentKey}node_modules/${name}`;
    packages.push(toPackage(file, root, key, name, entry));
    const nested = Object.fromEntries(
      Object.entries(entry.dependencies ?? {}).filter(
        (dependency): dependency is [string, NpmPackageEntry] => typeof dependency[1] === 'object'
      )
    );
    collectDependencyMapPackages(file, root, nested, `${key}/`, packages);
  }
}

function toPackage(file: string, root: string, key: string, name: string, entry: NpmPackageEntry): LockPackage {
  const spec = entry.resolved ?? entry.version;
  return {
    name,
    version: entry.version,
    spec,
    resolved: entry.resolved,
    integrity: entry.integrity,
    source: classifySource(spec, entry.resolved),
    lockfile: path.relative(root, file),
    key,
    dependencyNames: [
      ...Object.keys(entry.requires ?? {}),
      ...Object.keys(entry.dependencies ?? {}),
      ...Object.keys(entry.devDependencies ?? {}),
      ...Object.keys(entry.optionalDependencies ?? {})
    ].filter((name, index, names) => names.indexOf(name) === index).sort()
  };
}

function packageNameFromPackagePath(value: string): string {
  const parts = value.split('node_modules/');
  return parts[parts.length - 1] ?? value;
}
