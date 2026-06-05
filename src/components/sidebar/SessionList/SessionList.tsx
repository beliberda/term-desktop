import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import styles from './SessionList.module.css';

export const SessionList = observer(function SessionList() {
  const { sessionStore, terminalStore } = useStores();

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
            onClick={() => sessionStore.openEditForm(session.id)}
            onDoubleClick={() =>
              terminalStore.requestConnect(session.id, session)
            }
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
    </div>
  );
});
