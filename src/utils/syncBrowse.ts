import type { SessionConfig } from "@/types";
import { getSessionRemotePath } from "@/types/session";
import { joinRemotePath, mapRemoteToLocal } from "@utils/filePaths";

let syncGuardDepth = 0;

export function withSyncBrowseGuard<T>(fn: () => T): T {
  syncGuardDepth += 1;
  try {
    return fn();
  } finally {
    syncGuardDepth -= 1;
  }
}

export function isSyncBrowseGuarded(): boolean {
  return syncGuardDepth > 0;
}

export function isSyncBrowseEnabled(
  session: SessionConfig | null | undefined,
): boolean {
  return session != null && session.syncBrowse !== false;
}

export function mapLocalToRemote(
  localPath: string,
  session: SessionConfig,
): string | null {
  const localBase = session.localPath?.trim();
  if (!localBase) return null;

  const remoteBase = getSessionRemotePath(session);
  const normalizedLocal = normalizePath(localPath);
  const normalizedBase = normalizePath(localBase);

  if (normalizedLocal === normalizedBase) {
    return remoteBase;
  }

  if (
    !normalizedLocal.startsWith(`${normalizedBase}/`) &&
    normalizedLocal !== normalizedBase
  ) {
    return null;
  }

  const relative =
    normalizedLocal === normalizedBase
      ? ""
      : normalizedLocal.slice(normalizedBase.length + 1);
  if (!relative) return remoteBase;
  return joinRemotePath(remoteBase, relative);
}

export { mapRemoteToLocal };

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/, "");
}
