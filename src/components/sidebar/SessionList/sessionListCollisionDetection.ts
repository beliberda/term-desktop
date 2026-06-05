import type { CollisionDetection } from '@dnd-kit/core';
import { closestCenter, pointerWithin } from '@dnd-kit/core';

/** Приоритет drop-зон папок, чтобы элемент попадал внутрь, а не только между соседями. */
export const sessionListCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  const folderHits = pointerHits.filter((collision) =>
    String(collision.id).startsWith('droppable-folder-'),
  );

  if (folderHits.length > 0) {
    return folderHits;
  }

  return closestCenter(args);
};

export function parseFolderDroppableId(
  id: string,
): string | null {
  if (!id.startsWith('droppable-folder-')) {
    return null;
  }
  return id.slice('droppable-folder-'.length);
}
