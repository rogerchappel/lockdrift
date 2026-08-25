import path from 'node:path';
import { stat } from 'node:fs/promises';
import { analyze } from './analyzer.js';
import { loadConfig } from './config.js';
import { findLockfiles, readManifests } from './discovery.js';
import { parseLockfile } from './parsers/index.js';
import type { ScanSummary } from './types.js';

export async function scanProject(target: string): Promise<ScanSummary> {
  const root = path.resolve(target);
  await validateScanTarget(root);
  const config = await loadConfig(root);
  const lockfilePaths = await findLockfiles(root, config.workspaceRoots);
  const [lockfiles, manifests] = await Promise.all([
    Promise.all(lockfilePaths.map((file) => parseLockfile(file, root))),
    readManifests(root, config.workspaceRoots)
  ]);

  return analyze(root, lockfiles, manifests, config);
}

export class InvalidScanTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidScanTargetError';
  }
}

async function validateScanTarget(root: string): Promise<void> {
  let targetStat;
  try {
    targetStat = await stat(root);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new InvalidScanTargetError(`Scan target does not exist: ${root}`);
    }
    throw error;
  }

  if (!targetStat.isDirectory()) {
    throw new InvalidScanTargetError(`Scan target is not a directory: ${root}`);
  }
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
