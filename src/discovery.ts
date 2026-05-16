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
  optionalDependencies?: Record<string, string>;
};

export async function findLockfiles(root: string): Promise<string[]> {
  const files = await walk(root);
  return files.filter((file) => lockfileNames.has(path.basename(file))).sort();
}

export async function readManifests(root: string, workspaceRoots: string[]): Promise<PackageManifest[]> {
  const candidates = new Set<string>([path.join(root, 'package.json')]);

  for (const pattern of workspaceRoots) {
    if (pattern.endsWith('/*')) {
      const parent = path.join(root, pattern.slice(0, -2));
      for (const entry of await safeReadDir(parent)) {
        candidates.add(path.join(parent, entry.name, 'package.json'));
      }
    } else {
      candidates.add(path.join(root, pattern, 'package.json'));
    }
  }

  const rootManifest = await readManifest(path.join(root, 'package.json'), root);
  for (const workspace of rootManifest?.workspaces ?? []) {
    if (workspace.endsWith('/*')) {
      const parent = path.join(root, workspace.slice(0, -2));
      for (const entry of await safeReadDir(parent)) {
        candidates.add(path.join(parent, entry.name, 'package.json'));
      }
    } else {
      candidates.add(path.join(root, workspace, 'package.json'));
    }
  }

  const manifests = await Promise.all([...candidates].map((file) => readManifest(file, root)));
  return manifests.filter((manifest): manifest is PackageManifest => manifest !== undefined).sort((a, b) => a.path.localeCompare(b.path));
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
        dependencies.push({ manifestPath: relative, workspace, name, spec, scope });
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

async function walk(directory: string): Promise<string[]> {
  const entries = await safeReadDir(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...await walk(fullPath));
      }
      continue;
    }
    files.push(fullPath);
  }

  return files;
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
