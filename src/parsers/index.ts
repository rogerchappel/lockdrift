import path from 'node:path';
import type { LockfileFacts } from '../types.js';
import { parseNpmLockfile } from './npm.js';
import { parsePnpmLockfile } from './pnpm.js';
import { parseYarnLockfile } from './yarn.js';

export async function parseLockfile(file: string, root: string): Promise<LockfileFacts> {
  const name = path.basename(file);
  if (name === 'package-lock.json') {
    return parseNpmLockfile(file, root);
  }
  if (name === 'pnpm-lock.yaml') {
    return parsePnpmLockfile(file, root);
  }
  if (name === 'yarn.lock') {
    return parseYarnLockfile(file, root);
  }

  throw new Error(`Unsupported lockfile: ${file}`);
}
