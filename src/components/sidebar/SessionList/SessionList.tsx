import { useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { observer } from "mobx-react-lite";
import type { SessionConfig, SessionFolder } from "@/types";
import { useStores } from "@stores/index";
import { connectSession } from "@utils/connectSession";
import { canMoveIntoFolder, isFolderId } from "@utils/sessionTree";
import { SessionContextMenu } from "./SessionContextMenu";
import { FolderContextMenu } from "./FolderContextMenu";
import { SessionTreeList } from "./SessionTreeList";
import {
  parseFolderDroppableId,
  sessionListCollisionDetection,
} from "./sessionListCollisionDetection";
import styles from "./SessionList.module.css";

interface SessionContextMenuState {
  session: SessionConfig;
  x: number;
  y: number;
}

interface FolderContextMenuState {
  folder: SessionFolder;
  x: number;
  y: number;
}

export const SessionList = observer(function SessionList() {
  const stores = useStores();
  const { sessionStore } = stores;
  const [sessionMenu, setSessionMenu] =
    useState<SessionContextMenuState | null>(null);
  const [folderMenu, setFolderMenu] = useState<FolderContextMenuState | null>(
    null,
  );
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const moveIntoFolder = (activeId: string, folderId: string) => {
    const file = sessionStore.toFile();
    if (!canMoveIntoFolder(file, activeId, folderId)) {
      return;
    }

    const folder = sessionStore.getFolderById(folderId);
    if (!folder) return;

    sessionStore.moveItem(activeId, folderId, folder.childOrder.length);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const folderFromDroppable = parseFolderDroppableId(overId);
    if (folderFromDroppable) {
      moveIntoFolder(activeId, folderFromDroppable);
      return;
    }

    if (overId === "droppable-root") {
      sessionStore.moveItem(activeId, null, sessionStore.rootOrder.length);
      return;
    }

    if (overId.startsWith("droppable-")) {
      return;
    }

    // Drop на строку папки (sortable id) — помещаем внутрь папки
    if (sessionStore.getFolderById(overId)) {
      moveIntoFolder(activeId, overId);
      return;
    }

    const overParent = sessionStore.getParentId(overId);
    const activeParent = sessionStore.getParentId(activeId);

    if (overParent === activeParent) {
      sessionStore.reorderInParent(activeParent, activeId, overId);
      return;
    }

    const parentOrder =
      overParent === null
        ? sessionStore.rootOrder
        : (sessionStore.getFolderById(overParent)?.childOrder ?? []);
    const overIndex = parentOrder.indexOf(overId);
    if (overIndex < 0) return;

    if (
      isFolderId(sessionStore.toFile(), activeId) &&
      overParent &&
      !sessionStore.getFolderById(overParent)
    ) {
      return;
    }

    sessionStore.moveItem(activeId, overParent, overIndex);
  };

  const handleItemClick = (session: SessionConfig) => {
    connectSession(session, stores);
  };

  if (sessionStore.isLoading) {
    return <div className={styles.stateMessage}>Загрузка сессий...</div>;
  }

  if (!sessionStore.hasItems) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Нет сессий</p>
        <p className={styles.emptyHint}>Нажмите + чтобы создать подключение</p>
      </div>
    );
  }

  const activeSession = activeDragId
    ? sessionStore.getSessionById(activeDragId)
    : null;
  const activeFolder = activeDragId
    ? sessionStore.getFolderById(activeDragId)
    : null;

  return (
    <div className={styles.container}>
      {sessionStore.error && (
        <div className={styles.error}>{sessionStore.error}</div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={sessionListCollisionDetection}
        onDragStart={(event) => setActiveDragId(String(event.active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragId(null)}
      >
        <div
          className={styles.treeScroll}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            const row = target.closest<HTMLElement>("[data-session-id]");
            if (!row) return;
            const sessionId = row.dataset.sessionId;
            if (!sessionId) return;
            const session = sessionStore.getSessionById(sessionId);
            if (session) handleItemClick(session);
          }}
        >
          <SessionTreeList
            parentId={null}
            onSessionContextMenu={(e, session) => {
              e.preventDefault();
              setSessionMenu({
                session,
                x: e.clientX,
                y: e.clientY,
              });
            }}
            onFolderContextMenu={(e, folder) => {
              e.preventDefault();
              setFolderMenu({
                folder,
                x: e.clientX,
                y: e.clientY,
              });
            }}
          />
        </div>
        <DragOverlay>
          {activeSession && (
            <div className={styles.dragOverlay}>{activeSession.name}</div>
          )}
          {activeFolder && (
            <div className={styles.dragOverlay}>📁 {activeFolder.name}</div>
          )}
        </DragOverlay>
      </DndContext>
      {sessionMenu && (
        <SessionContextMenu
          session={sessionMenu.session}
          anchor={{ x: sessionMenu.x, y: sessionMenu.y }}
          onClose={() => setSessionMenu(null)}
        />
      )}
      {folderMenu && (
        <FolderContextMenu
          folder={folderMenu.folder}
          anchor={{ x: folderMenu.x, y: folderMenu.y }}
          onClose={() => setFolderMenu(null)}
        />
      )}
    </div>
  );
});
