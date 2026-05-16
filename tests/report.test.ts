import test from 'node:test';
import assert from 'node:assert/strict';
import { renderJson, renderMarkdown } from '../src/report.js';
import { scanProject } from '../src/scanner.js';

test('renders stable markdown and json reports', async () => {
  const summary = await scanProject('fixtures/npm-drift');
  const markdown = renderMarkdown(summary);
  const json = renderJson(summary);

  assert.match(markdown, /# LockDrift Report/);
  assert.match(markdown, /registry-drift/);
  assert.equal(JSON.parse(json).findings.length, summary.findings.length);
});
