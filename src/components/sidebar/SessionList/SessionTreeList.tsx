import type { MouseEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { observer } from 'mobx-react-lite';
import type { SessionConfig, SessionFolder } from '@/types';
import { useStores } from '@stores/index';
import { SessionFolderRow } from './SessionFolderRow';
import { SessionItemRow } from './SessionItemRow';
import styles from './SessionList.module.css';

interface SessionTreeListProps {
  parentId: string | null;
  depth?: number;
  onSessionContextMenu: (e: MouseEvent, session: SessionConfig) => void;
  onFolderContextMenu: (e: MouseEvent, folder: SessionFolder) => void;
}

export const SessionTreeList = observer(function SessionTreeList({
  parentId,
  depth = 0,
  onSessionContextMenu,
  onFolderContextMenu,
}: SessionTreeListProps) {
  const { sessionStore } = useStores();
  const nodes = sessionStore.getChildren(parentId);
  const sortableIds = nodes.map((node) => node.id);

  const droppableId = parentId === null ? 'droppable-root' : `droppable-folder-${parentId}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  if (nodes.length === 0) {
    return (
      <ul
        ref={setNodeRef}
        className={`${styles.list} ${styles.listNested} ${isOver ? styles.listOver : ''}`}
        style={{ paddingLeft: depth * 14 }}
      />
    );
  }

  return (
    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
      <ul
        ref={setNodeRef}
        className={`${styles.list} ${parentId !== null ? styles.listNested : ''} ${isOver ? styles.listOver : ''}`}
      >
        {nodes.map((node) => {
          if (node.kind === 'folder') {
            const folder = sessionStore.getFolderById(node.id);
            if (!folder) return null;
            return (
              <SessionFolderRow
                key={node.id}
                folder={folder}
                depth={depth}
                onSessionContextMenu={onSessionContextMenu}
                onFolderContextMenu={onFolderContextMenu}
              />
            );
          }

          const session = sessionStore.getSessionById(node.id);
          if (!session) return null;
          return (
            <SessionItemRow
              key={node.id}
              session={session}
              depth={depth}
              onContextMenu={onSessionContextMenu}
            />
          );
        })}
      </ul>
    </SortableContext>
  );
});
