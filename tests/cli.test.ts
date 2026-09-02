import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('cli explain prints package facts', async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    'dist/src/cli.js',
    'explain',
    'fixtures/npm-drift/package-lock.json',
    '--package',
    'left-pad'
  ]);

  assert.match(stdout, /left-pad@1\.3\.0/);
});

test('cli scan json exits non-zero when threshold is met', async () => {
  await assert.rejects(
    execFileAsync(process.execPath, ['dist/src/cli.js', 'scan', 'fixtures/npm-drift', '--format', 'json', '--fail-on', 'high']),
    /Command failed/
  );
});

test('cli scan reports invalid targets without output or a stack trace', async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'lockdrift-cli-'));
  const fileTarget = path.join(temporaryRoot, 'not-a-directory');
  await writeFile(fileTarget, 'file', 'utf8');

  try {
    for (const [target, expected] of [
      [path.join(temporaryRoot, 'missing'), 'Scan target does not exist:'],
      [fileTarget, 'Scan target is not a directory:']
    ]) {
      await assert.rejects(
        execFileAsync(process.execPath, ['dist/src/cli.js', 'scan', target, '--format', 'json']),
        (error: Error & { stdout?: string; stderr?: string }) => {
          assert.equal(error.stdout, '');
          assert.match(error.stderr ?? '', new RegExp(`^Error: ${expected}`));
          assert.doesNotMatch(error.stderr ?? '', /\n\s+at /);
          return true;
        }
      );
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('cli reports config and lockfile failures without output or a stack trace', async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'lockdrift-cli-errors-'));
  const malformedConfigRoot = path.join(temporaryRoot, 'config');
  const malformedLockRoot = path.join(temporaryRoot, 'lockfile');
  await Promise.all([
    mkdir(malformedConfigRoot),
    mkdir(malformedLockRoot)
  ]);
  await Promise.all([
    writeFile(path.join(malformedConfigRoot, '.lockdrift.json'), '{bad\n', 'utf8'),
    writeFile(path.join(malformedLockRoot, 'package.json'), '{}\n', 'utf8'),
    writeFile(path.join(malformedLockRoot, 'package-lock.json'), '{bad\n', 'utf8')
  ]);

  try {
    for (const [args, expected] of [
      [['scan', malformedConfigRoot, '--format', 'json'], /Unable to read \.lockdrift\.json/],
      [['scan', malformedLockRoot, '--format', 'json'], /package-lock\.json/],
      [['explain', path.join(temporaryRoot, 'unknown.lock'), '--package', 'example'], /Unsupported lockfile/]
    ] as const) {
      await assert.rejects(
        execFileAsync(process.execPath, ['dist/src/cli.js', ...args]),
        (error: Error & { code?: number; stdout?: string; stderr?: string }) => {
          assert.equal(error.code, 1);
          assert.equal(error.stdout, '');
          assert.match(error.stderr ?? '', expected);
          assert.match(error.stderr ?? '', /^Error: /);
          assert.doesNotMatch(error.stderr ?? '', /\n\s+at |file:\/\/|dist\/src\/.+\.js:\d+/);
          return true;
        }
      );
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
