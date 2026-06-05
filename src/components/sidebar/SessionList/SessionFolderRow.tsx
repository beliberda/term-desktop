import type { CSSProperties, MouseEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { observer } from "mobx-react-lite";
import type { SessionConfig, SessionFolder } from "@/types";
import { useStores } from "@stores/index";
import { SessionTreeList } from "./SessionTreeList";
import styles from "./SessionList.module.css";

interface SessionFolderRowProps {
  folder: SessionFolder;
  depth: number;
  onSessionContextMenu: (e: MouseEvent, session: SessionConfig) => void;
  onFolderContextMenu: (e: MouseEvent, folder: SessionFolder) => void;
}

export const SessionFolderRow = observer(function SessionFolderRow({
  folder,
  depth,
  onSessionContextMenu,
  onFolderContextMenu,
}: SessionFolderRowProps) {
  const { sessionStore } = useStores();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `droppable-folder-${folder.id}`,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  const setRefs = (node: HTMLLIElement | null) => {
    setNodeRef(node);
    setDropRef(node);
  };

  return (
    <li ref={setRefs} style={style} className={styles.folderBlock}>
      <div
        className={`${styles.folderRow} ${isOver ? styles.folderRowOver : ""}`}
        style={{ paddingLeft: 12 + depth * 14 }}
        onContextMenu={(e) => onFolderContextMenu(e, folder)}
      >
        <button
          type="button"
          className={styles.dragHandle}
          title="Перетащить"
          aria-label="Перетащить"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          ⋮⋮
        </button>
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={(e) => {
            e.stopPropagation();
            sessionStore.toggleFolderCollapsed(folder.id);
          }}
          aria-label={folder.collapsed ? "Развернуть" : "Свернуть"}
        >
          {folder.collapsed ? "▸" : "▾"}
        </button>
        <span className={styles.folderIcon}>📁</span>
        <span className={styles.folderName}>{folder.name}</span>
      </div>
      {!folder.collapsed && (
        <SessionTreeList
          parentId={folder.id}
          depth={depth + 1}
          onSessionContextMenu={onSessionContextMenu}
          onFolderContextMenu={onFolderContextMenu}
        />
      )}
    </li>
  );
});
