import type { SessionConfig } from '@/types';
import { getSessionRemotePath } from '@/types/session';

export function joinRemotePath(parent: string, name: string): string {
  const base = parent === '/' ? '' : parent.replace(/\/$/, '');
  const combined = `${base}/${name}`.replace(/\/+/g, '/');
  return combined.startsWith('/') ? combined : `/${combined}`;
}

export function joinLocalPath(dir: string, name: string): string {
  const separator = dir.includes('\\') ? '\\' : '/';
  const trimmed = dir.replace(/[/\\]+$/, '');
  return `${trimmed}${separator}${name}`;
}

export function basename(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function parentRemotePath(path: string): string {
  if (path === '/') return '/';
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.length === 0 ? '/' : `/${parts.join('/')}`;
}

export function parentLocalPath(path: string): string {
  const separator = path.includes('\\') ? '\\' : '/';
  const parts = path.split(/[/\\]/).filter(Boolean);
  parts.pop();
  if (parts.length === 0) {
    return separator === '\\' && /^[A-Za-z]:/.test(path)
      ? `${path.slice(0, 2)}${separator}`
      : separator;
  }
  const joined = parts.join(separator);
  if (separator === '\\' && /^[A-Za-z]:/.test(path)) {
    return `${path.slice(0, 2)}${separator}${joined}`;
  }
  return `${separator}${joined}`;
}

export function remoteRelativePath(
  remotePath: string,
  baseRemotePath: string,
): string | null {
  const base = getSessionRemotePath({ remotePath: baseRemotePath } as SessionConfig);
  const normalized = remotePath.startsWith('/') ? remotePath : `/${remotePath}`;
  if (normalized === base) return '';
  if (!normalized.startsWith(`${base === '/' ? '' : base}/`) && base !== '/') {
    return null;
  }
  if (base === '/') return normalized.slice(1);
  return normalized.slice(base.length + 1);
}

export function mapRemoteToLocal(
  remotePath: string,
  session: SessionConfig,
): string | null {
  const localBase = session.localPath?.trim();
  if (!localBase) return null;
  const remoteBase = getSessionRemotePath(session);
  const relative = remoteRelativePath(remotePath, remoteBase);
  if (relative === null) return null;
  if (relative === '') return localBase;
  return joinLocalPath(localBase, relative.replace(/\//g, '\\'));
}
