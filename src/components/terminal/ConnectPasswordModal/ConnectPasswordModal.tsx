import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import styles from './ConnectPasswordModal.module.css';

export const ConnectPasswordModal = observer(function ConnectPasswordModal() {
  const { terminalStore, fileConnectionStore, sessionStore } = useStores();
  const [password, setPassword] = useState('');

  const sshPending = terminalStore.pendingConnect;
  const ftpPending = fileConnectionStore.pendingConnect;
  const pending = sshPending ?? ftpPending;
  const pendingKey = sshPending
    ? `${sshPending.sessionId}:${sshPending.passphraseRetry ? 'passphrase' : 'password'}`
    : ftpPending
      ? `ftp:${ftpPending.sessionId}`
      : null;

  useEffect(() => {
    if (pendingKey) setPassword('');
  }, [pendingKey]);

  if (!pending) return null;

  const session = sessionStore.sessions.find((s) => s.id === pending.sessionId);
  const isFtp = session?.protocol === 'ftp';
  const isPassphraseRetry =
    !isFtp && sshPending?.passphraseRetry === true;
  const canConnect = Boolean(session) && Boolean(password);

  const handleConnect = () => {
    if (isFtp) {
      void fileConnectionStore.connect(pending.sessionId, password);
    } else if (session) {
      void terminalStore.openTab(pending.sessionId, password, session);
    } else {
      terminalStore.cancelPendingConnect();
    }
    setPassword('');
  };

  const handleCancel = () => {
    if (isFtp) {
      fileConnectionStore.cancelPendingConnect();
    } else {
      terminalStore.cancelPendingConnect();
    }
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
        <h2 className={styles.title}>
          {isFtp
            ? 'FTP-подключение'
            : isPassphraseRetry
              ? 'Пароль ключа'
              : 'Подключение'}
        </h2>
        <p className={styles.hint}>
          {!session
            ? 'Сессия не найдена. Возможно, она была удалена или изменена после импорта.'
            : isPassphraseRetry
              ? `${session.name} — ${session.username}@${session.host}. Ключ зашифрован, введите passphrase.`
              : `${session.name} — ${session.username}@${session.host}`}
        </p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="connect-password">
            {isPassphraseRetry ? 'Passphrase' : 'Пароль'}
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
            disabled={!canConnect}
          >
            Подключить
          </button>
        </div>
      </div>
    </div>
  );
});
