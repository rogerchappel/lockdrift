import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('cli explain prints package facts', async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    'dist/cli.js',
    'explain',
    'fixtures/npm-drift/package-lock.json',
    '--package',
    'left-pad'
  ]);

  assert.match(stdout, /left-pad@1\.3\.0/);
});

test('cli scan json exits non-zero when threshold is met', async () => {
  await assert.rejects(
    execFileAsync(process.execPath, ['dist/cli.js', 'scan', 'fixtures/npm-drift', '--format', 'json', '--fail-on', 'high']),
    /Command failed/
  );
});
