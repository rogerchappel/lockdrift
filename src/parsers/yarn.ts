import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { LockfileFacts, LockPackage } from '../types.js';
import { classifySource } from '../source.js';

type YarnEntry = {
  key: string;
  version?: string;
  resolved?: string;
  integrity?: string;
  dependencies: string[];
};

export async function parseYarnLockfile(file: string, root: string): Promise<LockfileFacts> {
  const entries = parseYarnV1(await readFile(file, 'utf8'));
  const packages: LockPackage[] = entries.map((entry) => {
    const name = packageNameFromYarnKey(entry.key);
    const spec = entry.resolved ?? entry.version;
    return {
      name,
      version: entry.version,
      spec,
      resolved: entry.resolved,
      integrity: entry.integrity,
      source: classifySource(spec, entry.resolved),
      lockfile: path.relative(root, file),
      key: entry.key,
      dependencyNames: entry.dependencies
    };
  });

  return {
    kind: 'yarn',
    path: path.relative(root, file),
    packages: packages.sort((a, b) => a.key.localeCompare(b.key))
  };
}

function parseYarnV1(content: string): YarnEntry[] {
  const entries: YarnEntry[] = [];
  let current: YarnEntry | undefined;
  let inDependencies = false;

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) {
      continue;
    }

    if (!line.startsWith(' ')) {
      const key = line.replace(/:$/, '').split(',')[0]?.trim().replace(/^"|"$/g, '');
      if (key) {
        current = { key, dependencies: [] };
        entries.push(current);
      }
      inDependencies = false;
      continue;
    }

    if (!current) {
      continue;
    }

    const trimmed = line.trim();
    if (trimmed === 'dependencies:') {
      inDependencies = true;
      continue;
    }

    const match = trimmed.match(/^(version|resolved|integrity)\s+"?(.+?)"?$/);
    if (match) {
      current[match[1] as 'version' | 'resolved' | 'integrity'] = match[2];
      inDependencies = false;
      continue;
    }

    if (inDependencies) {
      const dep = trimmed.match(/^(@?[^\s]+)\s+/);
      if (dep?.[1]) {
        current.dependencies.push(dep[1]);
      }
    }
  }

  return entries;
}

function packageNameFromYarnKey(key: string): string {
  const unquoted = key.replace(/^"|"$/g, '');
  if (unquoted.startsWith('@')) {
    const scoped = unquoted.match(/^(@[^/]+\/[^@]+)@/);
    return scoped?.[1] ?? unquoted;
  }
  return unquoted.split('@')[0] ?? unquoted;
}
