import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findLockfiles, readManifests } from '../src/discovery.js';

test('workspaceRoots expands nested globs, ignores generated directories, and deduplicates manifests', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lockdrift-discovery-'));
  try {
    await writeManifest(root, 'package.json', { name: 'root' });
    await writeManifest(root, 'packages/group/app/package.json', { name: 'nested-app' });
    await writeManifest(root, 'packages/node_modules/generated/package.json', { name: 'generated' });

    const manifests = await readManifests(root, ['packages/**', 'packages/*/*']);

    assert.deepEqual(manifests.map((manifest) => manifest.name), ['root', 'nested-app']);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('workspace discovery rejects unsupported patterns explicitly', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lockdrift-discovery-'));
  try {
    await writeManifest(root, 'package.json', { name: 'root' });

    await assert.rejects(
      readManifests(root, ['packages/app-*']),
      /only complete "\*" and "\*\*" path segments are supported/
    );
  } finally {
    await rm(root, { recursive: true });
  }
});

test('lockfile discovery includes roots and real workspaces but excludes unrelated fixtures', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lockdrift-lockfiles-'));
  try {
    await writeManifest(root, 'package.json', { workspaces: ['packages/*'] });
    await writeManifest(root, 'packages/app/package.json', { name: 'app' });
    await writeFile(path.join(root, 'package-lock.json'), '{}');
    await writeFile(path.join(root, 'packages/app/pnpm-lock.yaml'), 'lockfileVersion: 9');
    await writeManifest(root, 'fixtures/example/package.json', { name: 'fixture' });
    await writeFile(path.join(root, 'fixtures/example/package-lock.json'), '{}');

    const lockfiles = await findLockfiles(root);

    assert.deepEqual(lockfiles.map((file) => path.relative(root, file)), [
      'package-lock.json',
      'packages/app/pnpm-lock.yaml'
    ]);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('lockfile discovery honors configured workspace roots', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lockdrift-lockfiles-'));
  try {
    await writeManifest(root, 'package.json', { name: 'root' });
    await writeManifest(root, 'components/api/package.json', { name: 'api' });
    await writeFile(path.join(root, 'components/api/yarn.lock'), '');

    const lockfiles = await findLockfiles(root, ['components/*']);

    assert.deepEqual(lockfiles.map((file) => path.relative(root, file)), ['components/api/yarn.lock']);
  } finally {
    await rm(root, { recursive: true });
  }
});

async function writeManifest(root: string, relative: string, contents: object): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(contents));
}
