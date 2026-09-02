import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { DependencyScope, ManifestDependency, PackageManifest } from './types.js';

const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage']);
const lockfileNames = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']);
const dependencyScopes: DependencyScope[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies'
];

type RawPackageJson = {
  name?: string;
  packageManager?: string;
  workspaces?: string[] | { packages?: string[] };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  optionalDependencies?: Record<string, string>;
};

export async function findLockfiles(root: string, workspaceRoots: string[] = []): Promise<string[]> {
  const directories = new Set<string>([root]);
  const rootManifest = await readManifest(path.join(root, 'package.json'), root);

  for (const pattern of [...workspaceRoots, ...(rootManifest?.workspaces ?? [])]) {
    for (const manifest of await expandWorkspacePattern(root, pattern)) {
      directories.add(path.dirname(manifest));
    }
  }

  const candidates = [...directories].flatMap((directory) =>
    [...lockfileNames].map((name) => path.join(directory, name))
  );
  const existing = await Promise.all(candidates.map(async (file) => {
    try {
      return (await stat(file)).isFile() ? file : undefined;
    } catch {
      return undefined;
    }
  }));
  return existing.filter((file): file is string => file !== undefined).sort();
}

export async function readManifests(root: string, workspaceRoots: string[]): Promise<PackageManifest[]> {
  const candidates = new Set<string>([path.join(root, 'package.json')]);

  for (const pattern of workspaceRoots) {
    for (const candidate of await expandWorkspacePattern(root, pattern)) {
      candidates.add(candidate);
    }
  }

  const rootManifest = await readManifest(path.join(root, 'package.json'), root);
  for (const workspace of rootManifest?.workspaces ?? []) {
    for (const candidate of await expandWorkspacePattern(root, workspace)) {
      candidates.add(candidate);
    }
  }

  const manifests = await Promise.all([...candidates].map((file) => readManifest(file, root)));
  return manifests.filter((manifest): manifest is PackageManifest => manifest !== undefined).sort((a, b) => a.path.localeCompare(b.path));
}

async function expandWorkspacePattern(root: string, pattern: string): Promise<string[]> {
  const segments = validateWorkspacePattern(pattern);
  const candidates: string[] = [];

  async function expand(directory: string, index: number): Promise<void> {
    if (index === segments.length) {
      candidates.push(path.join(directory, 'package.json'));
      return;
    }

    const segment = segments[index];
    if (segment === '**') {
      await expand(directory, index + 1);
      for (const entry of await safeReadDir(directory)) {
        if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
          await expand(path.join(directory, entry.name), index);
        }
      }
      return;
    }

    if (segment === '*') {
      for (const entry of await safeReadDir(directory)) {
        if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
          await expand(path.join(directory, entry.name), index + 1);
        }
      }
      return;
    }

    if (!ignoredDirectories.has(segment)) {
      await expand(path.join(directory, segment), index + 1);
    }
  }

  await expand(root, 0);
  return candidates;
}

function validateWorkspacePattern(pattern: string): string[] {
  if (pattern.length === 0 || path.isAbsolute(pattern)) {
    throw new Error(`Unsupported workspace pattern "${pattern}": use a non-empty path relative to the project root.`);
  }

  const segments = pattern.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error(`Unsupported workspace pattern "${pattern}": empty, "." and ".." path segments are not allowed.`);
  }

  for (const segment of segments) {
    if (segment !== '*' && segment !== '**' && /[*?[\]{}!]/.test(segment)) {
      throw new Error(`Unsupported workspace pattern "${pattern}": only complete "*" and "**" path segments are supported.`);
    }
  }
  return segments;
}

async function readManifest(file: string, root: string): Promise<PackageManifest | undefined> {
  try {
    const raw = JSON.parse(await readFile(file, 'utf8')) as RawPackageJson;
    const relative = path.relative(root, file) || 'package.json';
    const workspace = raw.name ?? (path.dirname(relative) || '.');
    const dependencies: ManifestDependency[] = [];

    for (const scope of dependencyScopes) {
      const values = raw[scope] ?? {};
      for (const [name, spec] of Object.entries(values)) {
        const optional = scope === 'optionalDependencies'
          || (scope === 'peerDependencies' && raw.peerDependenciesMeta?.[name]?.optional === true);
        dependencies.push({ manifestPath: relative, workspace, name, spec, scope, optional });
      }
    }

    return {
      path: relative,
      name: workspace,
      packageManager: raw.packageManager,
      workspaces: normalizeWorkspaces(raw.workspaces),
      dependencies
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

async function safeReadDir(directory: string) {
  try {
    const info = await stat(directory);
    if (!info.isDirectory()) {
      return [];
    }
    return await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

function normalizeWorkspaces(value: RawPackageJson['workspaces']): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (Array.isArray(value?.packages)) {
    return value.packages;
  }
  return [];
}
