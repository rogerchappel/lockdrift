import test from 'node:test';
import assert from 'node:assert/strict';
import { scanProject } from '../src/scanner.js';

test('scan detects npm drift findings', async () => {
  const summary = await scanProject('fixtures/npm-drift');
  const codes = new Set(summary.findings.map((finding) => finding.code));

  assert.ok(codes.has('duplicate-version'));
  assert.ok(codes.has('registry-drift'));
  assert.ok(codes.has('non-registry-source'));
  assert.ok(codes.has('missing-lock-entry'));
  assert.ok(codes.has('unused-lock-entry'));
});

test('scan discovers workspace manifests', async () => {
  const summary = await scanProject('fixtures/pnpm-workspace');

  assert.ok(summary.manifests.some((manifest) => manifest.name === '@fixture/app'));
  assert.ok(summary.manifests.some((manifest) => manifest.name === '@fixture/lib'));
});

test('scan detects package manager mismatch', async () => {
  const summary = await scanProject('fixtures/yarn-mismatch');

  assert.ok(summary.findings.some((finding) => finding.code === 'package-manager-mismatch'));
});
