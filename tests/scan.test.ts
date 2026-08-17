import test from 'node:test';
import assert from 'node:assert/strict';
import { explainPackage, scanProject } from '../src/scanner.js';

test('scan detects npm drift findings', async () => {
  const summary = await scanProject('fixtures/npm-drift');
  const codes = new Set(summary.findings.map((finding) => finding.code));

  assert.ok(codes.has('duplicate-version'));
  assert.ok(codes.has('registry-drift'));
  assert.ok(codes.has('non-registry-source'));
  assert.ok(codes.has('missing-lock-entry'));
  assert.ok(codes.has('unused-lock-entry'));
});

test('scan detects nested npm v1 duplicate versions without false unused entries', async () => {
  const summary = await scanProject('fixtures/npm-v1-nested');

  assert.ok(summary.findings.some((finding) => finding.code === 'duplicate-version' && finding.packageName === 'leaf'));
  assert.ok(!summary.findings.some((finding) => finding.code === 'unused-lock-entry'));
});

test('scan discovers workspace manifests', async () => {
  const summary = await scanProject('fixtures/pnpm-workspace');

  assert.ok(summary.manifests.some((manifest) => manifest.name === '@fixture/app'));
  assert.ok(summary.manifests.some((manifest) => manifest.name === '@fixture/lib'));
});

test('scan analyzes real pnpm v9 keys by package name', async () => {
  const summary = await scanProject('fixtures/pnpm-v9');

  assert.ok(summary.findings.some((finding) =>
    finding.code === 'duplicate-version' && finding.packageName === 'kleur'
  ));
  assert.ok(!summary.findings.some((finding) =>
    finding.code === 'missing-lock-entry'
  ));
  assert.ok(!summary.findings.some((finding) =>
    finding.packageName === 'ignored-tool'
  ));
  for (const child of ['child', 'optional-child', 'peer-child', '@scope/child']) {
    assert.ok(!summary.findings.some((finding) =>
      finding.code === 'unused-lock-entry' && finding.packageName === child
    ));
  }
  assert.ok(summary.findings.some((finding) =>
    finding.code === 'unused-lock-entry' && finding.packageName === 'orphan'
  ));
});

test('explain associates pnpm v9 peer-qualified snapshots with package facts', async () => {
  const explanation = await explainPackage('fixtures/pnpm-v9/pnpm-lock.yaml', 'peer-user');

  assert.match(explanation, /^peer-user@1\.0\.0/m);
  assert.match(explanation, /key: peer-user@1\.0\.0/);
  assert.match(explanation, /dependencies: kleur/);
});

test('scan discovers nested workspace manifests and analyzes their dependencies', async () => {
  const summary = await scanProject('fixtures/nested-workspace');
  const nestedManifest = summary.manifests.find((manifest) => manifest.name === 'nested-app');

  assert.deepEqual(
    nestedManifest?.dependencies.map((dependency) => dependency.name),
    ['left-pad', 'missing-package']
  );
  assert.ok(summary.findings.some((finding) =>
    finding.code === 'missing-lock-entry' && finding.packageName === 'missing-package'
  ));
  assert.ok(summary.findings.some((finding) =>
    finding.code === 'unused-lock-entry' && finding.packageName === 'stale-package'
  ));
  assert.ok(!summary.findings.some((finding) =>
    finding.code === 'unused-lock-entry' && finding.packageName === 'left-pad'
  ));
});

test('scan detects package manager mismatch', async () => {
  const summary = await scanProject('fixtures/yarn-mismatch');

  assert.ok(summary.findings.some((finding) => finding.code === 'package-manager-mismatch'));
});

test('scan retains yarn v1 optional dependencies as used lock entries', async () => {
  const summary = await scanProject('fixtures/yarn-optional');

  assert.ok(!summary.findings.some((finding) =>
    finding.code === 'unused-lock-entry' && finding.packageName === 'optional-child'
  ));
});

test('scan accepts clean npm fixture', async () => {
  const summary = await scanProject('fixtures/clean-npm');

  assert.equal(summary.findings.length, 0);
});
