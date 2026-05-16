import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { LockdriftConfig, Severity } from './types.js';
import { parseSeverity } from './severity.js';

const defaultConfig: LockdriftConfig = {
  allowedRegistries: ['https://registry.npmjs.org/'],
  ignoredPackages: [],
  failOn: 'high',
  workspaceRoots: []
};

type RawConfig = {
  allowedRegistries?: unknown;
  ignoredPackages?: unknown;
  failOn?: unknown;
  workspaceRoots?: unknown;
};

export async function loadConfig(root: string): Promise<LockdriftConfig> {
  const configPath = path.join(root, '.lockdrift.json');

  try {
    const raw = JSON.parse(await readFile(configPath, 'utf8')) as RawConfig;
    return normalizeConfig(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...defaultConfig };
    }

    throw new Error(`Unable to read .lockdrift.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function normalizeConfig(raw: RawConfig): LockdriftConfig {
  return {
    allowedRegistries: normalizeStringList(raw.allowedRegistries, defaultConfig.allowedRegistries).map(normalizeRegistry),
    ignoredPackages: normalizeStringList(raw.ignoredPackages, defaultConfig.ignoredPackages),
    failOn: parseSeverity(typeof raw.failOn === 'string' ? raw.failOn : undefined, defaultConfig.failOn) as Severity,
    workspaceRoots: normalizeStringList(raw.workspaceRoots, defaultConfig.workspaceRoots)
  };
}

function normalizeStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function normalizeRegistry(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}
