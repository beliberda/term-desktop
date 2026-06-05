import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import styles from './ConnectPasswordModal.module.css';

export const ConnectPasswordModal = observer(function ConnectPasswordModal() {
  const { terminalStore, sessionStore } = useStores();
  const [password, setPassword] = useState('');

  const pending = terminalStore.pendingConnect;
  if (!pending) return null;

  const session = sessionStore.sessions.find((s) => s.id === pending.sessionId);

  const handleConnect = () => {
    void terminalStore.openTab(pending.sessionId, password, session);
    setPassword('');
  };

  const handleCancel = () => {
    terminalStore.cancelPendingConnect();
    setPassword('');
  };

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={styles.title}>Подключение</h2>
        <p className={styles.hint}>
          {session
            ? `${session.name} — ${session.username}@${session.host}`
            : 'Введите пароль для подключения'}
        </p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="connect-password">
            Пароль
          </label>
          <input
            id="connect-password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConnect();
            }}
            autoFocus
          />
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnCancel}`}
            onClick={handleCancel}
          >
            Отмена
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnConnect}`}
            onClick={handleConnect}
            disabled={!password}
          >
            Подключить
          </button>
        </div>
      </div>
    </div>
  );
});
