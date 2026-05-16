export type LockfileKind = 'npm' | 'pnpm' | 'yarn';

export type Severity = 'info' | 'low' | 'medium' | 'high';

export type FindingCode =
  | 'duplicate-version'
  | 'non-registry-source'
  | 'registry-drift'
  | 'missing-lock-entry'
  | 'unused-lock-entry'
  | 'package-manager-mismatch';

export type DependencyScope =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies';

export type ManifestDependency = {
  manifestPath: string;
  workspace: string;
  name: string;
  spec: string;
  scope: DependencyScope;
};

export type PackageManifest = {
  path: string;
  name: string;
  packageManager?: string;
  workspaces: string[];
  dependencies: ManifestDependency[];
};

export type LockPackage = {
  name: string;
  version?: string;
  spec?: string;
  resolved?: string;
  integrity?: string;
  source: string;
  lockfile: string;
  key: string;
  dependencyNames: string[];
};

export type LockfileFacts = {
  kind: LockfileKind;
  path: string;
  packages: LockPackage[];
  packageManager?: string;
};

export type LockdriftConfig = {
  allowedRegistries: string[];
  ignoredPackages: string[];
  failOn: Severity;
  workspaceRoots: string[];
};

export type Finding = {
  code: FindingCode;
  severity: Severity;
  packageName?: string;
  version?: string;
  spec?: string;
  evidence: string;
  remediation: string;
};

export type ScanSummary = {
  root: string;
  lockfiles: LockfileFacts[];
  manifests: PackageManifest[];
  findings: Finding[];
};

export type OutputFormat = 'markdown' | 'json';
