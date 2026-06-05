import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import { connectSession } from '@utils/connectSession';
import { SessionContextMenu } from './SessionContextMenu';
import styles from './SessionList.module.css';

interface ContextMenuState {
  sessionId: string;
  x: number;
  y: number;
}

export const SessionList = observer(function SessionList() {
  const stores = useStores();
  const { sessionStore } = stores;
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const contextSession = contextMenu
    ? sessionStore.sessions.find((s) => s.id === contextMenu.sessionId)
    : null;

  if (sessionStore.isLoading) {
    return <div className={styles.stateMessage}>Загрузка сессий...</div>;
  }

  if (sessionStore.sessions.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Нет сессий</p>
        <p className={styles.emptyHint}>
          Нажмите + чтобы создать подключение
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {sessionStore.error && (
        <div className={styles.error}>{sessionStore.error}</div>
      )}
      <ul className={styles.list}>
        {sessionStore.sessions.map((session) => (
          <li
            key={session.id}
            className={`${styles.item} ${sessionStore.selectedId === session.id ? styles.itemSelected : ''}`}
            onClick={() => connectSession(session, stores)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({
                sessionId: session.id,
                x: e.clientX,
                y: e.clientY,
              });
            }}
          >
            <div className={styles.info}>
              <div className={styles.name}>{session.name}</div>
              <div className={styles.host}>
                {session.username}@{session.host}:{session.port}
              </div>
            </div>
            <span className={styles.badge}>{session.protocol}</span>
            <button
              type="button"
              className={styles.editBtn}
              title="Редактировать"
              onClick={(e) => {
                e.stopPropagation();
                sessionStore.openEditForm(session.id);
              }}
            >
              ✎
            </button>
            <button
              type="button"
              className={styles.deleteBtn}
              title="Удалить"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Удалить сессию «${session.name}»?`)) {
                  sessionStore.deleteSession(session.id);
                }
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {contextMenu && contextSession && (
        <SessionContextMenu
          session={contextSession}
          anchor={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
});
