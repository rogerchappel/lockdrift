export { scanProject, explainPackage } from './scanner.js';
export { renderJson, renderMarkdown } from './report.js';
export type {
  Finding,
  FindingCode,
  LockdriftConfig,
  LockfileFacts,
  LockfileKind,
  LockPackage,
  OutputFormat,
  PackageManifest,
  ScanSummary,
  Severity
} from './types.js';
