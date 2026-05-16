import type { Severity } from './types.js';

const order: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3
};

export function severityRank(severity: Severity): number {
  return order[severity];
}

export function severityMeets(severity: Severity, threshold: Severity): boolean {
  return severityRank(severity) >= severityRank(threshold);
}

export function parseSeverity(value: string | undefined, fallback: Severity): Severity {
  if (value === 'info' || value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }

  return fallback;
}
