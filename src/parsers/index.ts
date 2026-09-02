import path from 'node:path';
import type { LockfileFacts } from '../types.js';
import { parseNpmLockfile } from './npm.js';
import { parsePnpmLockfile } from './pnpm.js';
import { parseYarnLockfile } from './yarn.js';

export async function parseLockfile(file: string, root: string): Promise<LockfileFacts> {
  try {
    const name = path.basename(file);
    if (name === 'package-lock.json') {
      return await parseNpmLockfile(file, root);
    }
    if (name === 'pnpm-lock.yaml') {
      return await parsePnpmLockfile(file, root);
    }
    if (name === 'yarn.lock') {
      return await parseYarnLockfile(file, root);
    }

    throw new Error('Unsupported lockfile type');
  } catch (error) {
    throw new Error(`Unable to parse lockfile ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
