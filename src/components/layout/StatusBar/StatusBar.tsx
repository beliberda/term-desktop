import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import styles from './StatusBar.module.css';

const STATUS_LABELS = {
  connecting: 'Подключение',
  connected: 'Подключено',
  disconnected: 'Отключено',
  error: 'Ошибка',
} as const;

export const StatusBar = observer(function StatusBar() {
  const {
    terminalStore,
    fileConnectionStore,
    sessionStore,
    appStore,
  } = useStores();

  const ftpConn = fileConnectionStore.activeConnection;
  const ftpSession = fileConnectionStore.activeSessionId
    ? sessionStore.sessions.find(
        (s) => s.id === fileConnectionStore.activeSessionId,
      )
    : null;

  const activeTab = terminalStore.activeTab;
  const sshSession = activeTab
    ? sessionStore.sessions.find((s) => s.id === activeTab.sessionId)
    : null;

  const showFtp =
    appStore.sidebarTab === 'files' &&
    ftpConn &&
    (ftpConn.status === 'connected' || ftpConn.status === 'connecting');

  const host = showFtp
    ? ftpSession
      ? `${ftpSession.username}@${ftpSession.host}:${ftpSession.port}`
      : '—'
    : sshSession
      ? `${sshSession.username}@${sshSession.host}:${sshSession.port}`
      : '—';

  const status = showFtp
    ? ftpConn!.status
    : activeTab?.status ?? 'disconnected';

  const latency = showFtp
    ? ftpConn?.connectLatencyMs
    : activeTab?.connectLatencyMs;

  return (
    <footer className={styles.statusBar}>
      <span className={styles.item}>
        <span className={styles.label}>Host:</span>
        <span className={styles.value}>{host}</span>
      </span>
      <span className={styles.item}>
        <span className={styles.label}>Статус:</span>
        <span className={styles.value}>
          {STATUS_LABELS[status] ?? status}
        </span>
      </span>
      <span className={styles.item}>
        <span className={styles.label}>Connect:</span>
        <span className={styles.value}>
          {latency !== undefined ? `${latency} ms` : '—'}
        </span>
      </span>
    </footer>
  );
});
