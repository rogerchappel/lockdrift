import { readFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import type { LockfileFacts, LockPackage } from '../types.js';
import { classifySource } from '../source.js';

type PnpmLock = {
  lockfileVersion?: string | number;
  packages?: Record<string, PnpmPackageEntry>;
};

type PnpmPackageEntry = {
  resolution?: { integrity?: string; tarball?: string; repo?: string };
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

export async function parsePnpmLockfile(file: string, root: string): Promise<LockfileFacts> {
  const raw = YAML.parse(await readFile(file, 'utf8')) as PnpmLock;
  const packages: LockPackage[] = [];

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
        ...Object.keys(entry.dependencies ?? {}),
        ...Object.keys(entry.optionalDependencies ?? {}),
        ...Object.keys(entry.peerDependencies ?? {})
      ].sort()
    });
  }

  return {
    kind: 'pnpm',
    path: path.relative(root, file),
    packages: packages.sort((a, b) => a.key.localeCompare(b.key))
  };
}

function parsePnpmPackageKey(key: string): { name: string; version?: string } {
  const clean = key.replace(/^\//, '');
  if (clean.startsWith('@')) {
    const parts = clean.split('/');
    const scopedName = `${parts[0]}/${parts[1]}`;
    const version = parts[2]?.split('_')[0];
    return { name: scopedName, version };
  }

  const parts = clean.split('/');
  return { name: parts[0] ?? clean, version: parts[1]?.split('_')[0] };
}
