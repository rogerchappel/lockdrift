import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { parseLockfile } from '../src/parsers/index.js';

const root = path.resolve('fixtures');

test('parses npm package-lock facts', async () => {
  const facts = await parseLockfile(path.join(root, 'npm-drift/package-lock.json'), path.join(root, 'npm-drift'));
  const leftPad = facts.packages.filter((pkg) => pkg.name === 'left-pad');

  assert.equal(facts.kind, 'npm');
  assert.equal(leftPad.length, 2);
  assert.ok(facts.packages.some((pkg) => pkg.source === 'git'));
});

test('parses pnpm lockfile facts', async () => {
  const facts = await parseLockfile(path.join(root, 'pnpm-workspace/pnpm-lock.yaml'), path.join(root, 'pnpm-workspace'));

  assert.equal(facts.kind, 'pnpm');
  assert.ok(facts.packages.some((pkg) => pkg.name === 'kleur'));
  assert.ok(facts.packages.some((pkg) => pkg.source === 'git'));
});

test('parses yarn v1 lockfile facts', async () => {
  const facts = await parseLockfile(path.join(root, 'yarn-mismatch/yarn.lock'), path.join(root, 'yarn-mismatch'));

  assert.equal(facts.kind, 'yarn');
  assert.ok(facts.packages.some((pkg) => pkg.name === 'ansi-colors' && pkg.dependencyNames.includes('color-name')));
});
