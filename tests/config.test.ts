import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../src/config.js';

test('normalizes config defaults and registry slashes', () => {
  const config = normalizeConfig({
    allowedRegistries: ['https://registry.example.test'],
    ignoredPackages: ['left-pad'],
    failOn: 'medium',
    workspaceRoots: ['packages/*']
  });

  assert.deepEqual(config.allowedRegistries, ['https://registry.example.test/']);
  assert.deepEqual(config.ignoredPackages, ['left-pad']);
  assert.equal(config.failOn, 'medium');
  assert.deepEqual(config.workspaceRoots, ['packages/*']);
});
