import path from 'node:path';
import { analyze } from './analyzer.js';
import { loadConfig } from './config.js';
import { findLockfiles, readManifests } from './discovery.js';
import { parseLockfile } from './parsers/index.js';
import type { ScanSummary } from './types.js';

export async function scanProject(target: string): Promise<ScanSummary> {
  const root = path.resolve(target);
  const config = await loadConfig(root);
  const lockfilePaths = await findLockfiles(root);
  const [lockfiles, manifests] = await Promise.all([
    Promise.all(lockfilePaths.map((file) => parseLockfile(file, root))),
    readManifests(root, config.workspaceRoots)
  ]);

  return analyze(root, lockfiles, manifests, config);
}

export async function explainPackage(lockfilePath: string, packageName: string): Promise<string> {
  const root = path.dirname(path.resolve(lockfilePath));
  const facts = await parseLockfile(path.resolve(lockfilePath), root);
  const matches = facts.packages.filter((pkg) => pkg.name === packageName);

  if (matches.length === 0) {
    return `${packageName} was not found in ${facts.path}.`;
  }

  return matches.map((pkg) => [
    `${pkg.name}@${pkg.version ?? 'unknown'}`,
    `lockfile: ${pkg.lockfile}`,
    `key: ${pkg.key}`,
    `source: ${pkg.source}`,
    pkg.resolved ? `resolved: ${pkg.resolved}` : undefined,
    pkg.integrity ? `integrity: ${pkg.integrity}` : undefined,
    pkg.dependencyNames.length > 0 ? `dependencies: ${pkg.dependencyNames.join(', ')}` : undefined
  ].filter(Boolean).join('\n')).join('\n\n');
}
