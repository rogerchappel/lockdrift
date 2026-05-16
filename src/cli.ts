#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Command, InvalidArgumentError } from 'commander';
import { loadConfig } from './config.js';
import { renderJson, renderMarkdown } from './report.js';
import { explainPackage, scanProject } from './scanner.js';
import { parseSeverity, severityMeets } from './severity.js';
import type { OutputFormat, Severity } from './types.js';

const program = new Command();

program
  .name('lockdrift')
  .description('Offline JavaScript lockfile drift and supply-chain facts auditor.')
  .version('0.1.0');

program
  .command('scan')
  .argument('[path]', 'Project path to scan', '.')
  .option('--format <format>', 'Output format: markdown or json', parseFormat, 'markdown')
  .option('--out <path>', 'Write report to a file instead of stdout')
  .option('--fail-on <severity>', 'Exit non-zero when findings meet severity: info, low, medium, high', parseFailOn)
  .description('Scan a project directory for lockfile drift.')
  .action(async (target: string, options: { format: OutputFormat; out?: string; failOn?: Severity }) => {
    const summary = await scanProject(target);
    const rendered = options.format === 'json' ? renderJson(summary) : renderMarkdown(summary);

    if (options.out) {
      await mkdir(path.dirname(path.resolve(options.out)), { recursive: true });
      await writeFile(options.out, rendered, 'utf8');
    } else {
      process.stdout.write(rendered);
    }

    const config = await loadConfig(path.resolve(target));
    const failOn = options.failOn ?? config.failOn;
    if (summary.findings.some((finding) => severityMeets(finding.severity, failOn))) {
      process.exitCode = 1;
    }
  });

program
  .command('explain')
  .argument('<lockfile>', 'Lockfile to inspect')
  .requiredOption('--package <name>', 'Package name to explain')
  .description('Explain package facts from a single lockfile.')
  .action(async (lockfile: string, options: { package: string }) => {
    process.stdout.write(`${await explainPackage(lockfile, options.package)}\n`);
  });

await program.parseAsync(process.argv);

function parseFormat(value: string): OutputFormat {
  if (value === 'markdown' || value === 'json') {
    return value;
  }
  throw new InvalidArgumentError('format must be markdown or json');
}

function parseFailOn(value: string): Severity {
  const parsed = parseSeverity(value, 'high');
  if (parsed !== value) {
    throw new InvalidArgumentError('severity must be info, low, medium, or high');
  }
  return parsed;
}
