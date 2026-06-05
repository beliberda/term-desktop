import type { SessionConfig, SessionFolder, SessionsFileV2 } from '@/types';

export type TreeNodeKind = 'session' | 'folder';

export interface TreeNode {
  id: string;
  kind: TreeNodeKind;
}

export function isFolderId(file: SessionsFileV2, id: string): boolean {
  return file.folders.some((folder) => folder.id === id);
}

export function getFolder(file: SessionsFileV2, id: string): SessionFolder | undefined {
  return file.folders.find((folder) => folder.id === id);
}

export function getChildOrder(
  file: SessionsFileV2,
  parentId: string | null,
): string[] {
  if (parentId === null) {
    return file.rootOrder;
  }
  return getFolder(file, parentId)?.childOrder ?? [];
}

export function setChildOrder(
  file: SessionsFileV2,
  parentId: string | null,
  order: string[],
): SessionsFileV2 {
  if (parentId === null) {
    return { ...file, rootOrder: order };
  }

  return {
    ...file,
    folders: file.folders.map((folder) =>
      folder.id === parentId ? { ...folder, childOrder: order } : folder,
    ),
  };
}

export function findParentId(
  file: SessionsFileV2,
  itemId: string,
): string | null {
  if (file.rootOrder.includes(itemId)) {
    return null;
  }

  for (const folder of file.folders) {
    if (folder.childOrder.includes(itemId)) {
      return folder.id;
    }
  }

  return null;
}

export function removeFromTree(
  file: SessionsFileV2,
  itemId: string,
): SessionsFileV2 {
  const parentId = findParentId(file, itemId);
  const order = getChildOrder(file, parentId).filter((id) => id !== itemId);
  return setChildOrder(file, parentId, order);
}

export function insertIntoParent(
  file: SessionsFileV2,
  itemId: string,
  parentId: string | null,
  index: number,
): SessionsFileV2 {
  let next = removeFromTree(file, itemId);
  const order = [...getChildOrder(next, parentId)];
  const clampedIndex = Math.max(0, Math.min(index, order.length));
  order.splice(clampedIndex, 0, itemId);
  next = setChildOrder(next, parentId, order);

  if (isFolderId(next, itemId)) {
    next = {
      ...next,
      folders: next.folders.map((folder) =>
        folder.id === itemId ? { ...folder, parentId } : folder,
      ),
    };
  }

  return next;
}

export function isDescendantFolder(
  file: SessionsFileV2,
  folderId: string,
  potentialAncestorId: string,
): boolean {
  let parentId = findParentId(file, folderId);
  while (parentId) {
    if (parentId === potentialAncestorId) {
      return true;
    }
    parentId = findParentId(file, parentId);
  }
  return false;
}

export function canMoveIntoFolder(
  file: SessionsFileV2,
  itemId: string,
  targetFolderId: string,
): boolean {
  if (itemId === targetFolderId) {
    return false;
  }

  if (!isFolderId(file, itemId)) {
    return true;
  }

  return !isDescendantFolder(file, targetFolderId, itemId);
}

export function deleteFolderFromTree(
  file: SessionsFileV2,
  folderId: string,
): SessionsFileV2 {
  const folder = getFolder(file, folderId);
  if (!folder) {
    return file;
  }

  const children = [...folder.childOrder];
  let next = removeFromTree(file, folderId);
  next = {
    ...next,
    folders: next.folders.filter((item) => item.id !== folderId),
  };

  for (const childId of children) {
    next = removeFromTree(next, childId);
    next = {
      ...next,
      rootOrder: [...next.rootOrder, childId],
    };

    if (isFolderId(next, childId)) {
      next = {
        ...next,
        folders: next.folders.map((item) =>
          item.id === childId ? { ...item, parentId: null } : item,
        ),
      };
    }
  }

  return next;
}

export function buildTreeState(file: SessionsFileV2): {
  rootOrder: string[];
  folders: SessionFolder[];
  sessions: SessionConfig[];
} {
  return {
    rootOrder: file.rootOrder,
    folders: file.folders,
    sessions: file.sessions,
  };
}

export function toSessionsFile(
  rootOrder: string[],
  folders: SessionFolder[],
  sessions: SessionConfig[],
): SessionsFileV2 {
  return {
    schemaVersion: 2,
    rootOrder,
    folders,
    sessions,
  };
}

export function getTreeNodes(
  file: SessionsFileV2,
  parentId: string | null,
): TreeNode[] {
  return getChildOrder(file, parentId).map((id) => ({
    id,
    kind: isFolderId(file, id) ? 'folder' : 'session',
  }));
}
