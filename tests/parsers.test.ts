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

test('recursively parses npm v1 dependency maps with stable nested keys', async () => {
  const facts = await parseLockfile(path.join(root, 'npm-v1-nested/package-lock.json'), path.join(root, 'npm-v1-nested'));
  const leaves = facts.packages.filter((pkg) => pkg.name === 'leaf');

  assert.deepEqual(leaves.map(({ key, version, resolved, integrity, source }) => ({ key, version, resolved, integrity, source })), [
    { key: 'node_modules/other/node_modules/leaf', version: '2.0.0', resolved: 'https://registry.npmjs.org/leaf/-/leaf-2.0.0.tgz', integrity: 'sha512-leaf-two', source: 'registry' },
    { key: 'node_modules/parent/node_modules/leaf', version: '1.0.0', resolved: 'https://registry.npmjs.org/leaf/-/leaf-1.0.0.tgz', integrity: 'sha512-leaf-one', source: 'registry' }
  ]);
  assert.deepEqual(
    facts.packages.filter((pkg) => pkg.name === 'other' || pkg.name === 'parent').map(({ name, dependencyNames }) => ({ name, dependencyNames })),
    [{ name: 'other', dependencyNames: ['leaf'] }, { name: 'parent', dependencyNames: ['leaf'] }]
  );
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

  const parent = facts.packages.find((pkg) => pkg.name === 'parent');
  assert.deepEqual(parent?.dependencyNames, ['@scope/child', 'child', 'optional-child', 'peer-child']);

  const peerUser = facts.packages.find((pkg) => pkg.name === 'peer-user');
  assert.deepEqual(peerUser?.dependencyNames, ['kleur']);
});

test('parses yarn v1 lockfile facts', async () => {
  const facts = await parseLockfile(path.join(root, 'yarn-mismatch/yarn.lock'), path.join(root, 'yarn-mismatch'));

  assert.equal(facts.kind, 'yarn');
  assert.ok(facts.packages.some((pkg) => pkg.name === 'ansi-colors' && pkg.dependencyNames.includes('color-name')));
});

test('parses yarn v1 required and optional dependency edges', async () => {
  const facts = await parseLockfile(path.join(root, 'yarn-optional/yarn.lock'), path.join(root, 'yarn-optional'));
  const parent = facts.packages.find((pkg) => pkg.name === 'parent');

  assert.deepEqual(parent?.dependencyNames, ['required-child', 'optional-child']);
});
