export function classifySource(spec?: string, resolved?: string): string {
  const value = resolved || spec || '';

  if (value.startsWith('git+') || value.startsWith('git://') || value.startsWith('ssh://') || value.includes('github.com')) {
    return 'git';
  }
  if (value.startsWith('file:') || value.startsWith('link:') || value.startsWith('workspace:')) {
    return 'file';
  }
  if (value.endsWith('.tgz') || value.includes('.tgz?') || value.startsWith('http://') || value.startsWith('https://')) {
    return 'registry';
  }
  if (value.startsWith('npm:') || value === '' || /^[~^<>=*\d]/.test(value)) {
    return 'registry';
  }
  return 'other';
}

export function registryFromResolved(resolved?: string): string | undefined {
  if (!resolved || !/^https?:\/\//.test(resolved)) {
    return undefined;
  }

  try {
    const url = new URL(resolved);
    return `${url.protocol}//${url.host}/`;
  } catch {
    return undefined;
  }
}

export function normalizePackageKey(name: string, version?: string): string {
  return version ? `${name}@${version}` : name;
}
