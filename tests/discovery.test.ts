import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readManifests } from '../src/discovery.js';

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

async function writeManifest(root: string, relative: string, contents: object): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(contents));
}
