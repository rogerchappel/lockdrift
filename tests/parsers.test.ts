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

test('parses pnpm v9, peer-qualified, scoped, and legacy package keys', async () => {
  const facts = await parseLockfile(path.join(root, 'pnpm-v9/pnpm-lock.yaml'), path.join(root, 'pnpm-v9'));
  const identities = facts.packages.map(({ name, version }) => `${name}@${version}`);

  assert.ok(identities.includes('kleur@4.1.5'));
  assert.ok(identities.includes('@scope/direct@2.0.0'));
  assert.ok(identities.includes('peer-user@1.0.0'));
  assert.ok(identities.includes('legacy-package@1.2.3'));
  assert.ok(identities.includes('@legacy/scope@4.5.6'));
});

test('parses yarn v1 lockfile facts', async () => {
  const facts = await parseLockfile(path.join(root, 'yarn-mismatch/yarn.lock'), path.join(root, 'yarn-mismatch'));

  assert.equal(facts.kind, 'yarn');
  assert.ok(facts.packages.some((pkg) => pkg.name === 'ansi-colors' && pkg.dependencyNames.includes('color-name')));
});
