import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useStores } from '@stores/index';
import type { ConnectionStatus } from '@/types';
import styles from './StatusBar.module.css';

export const StatusBar = observer(function StatusBar() {
  const { t } = useTranslation();
  const {
    terminalStore,
    fileConnectionStore,
    sessionStore,
    appStore,
  } = useStores();

  const statusLabels = useMemo(
    (): Record<ConnectionStatus, string> => ({
      connecting: t('terminal.status.connecting'),
      connected: t('terminal.status.connected'),
      disconnected: t('terminal.status.disconnected'),
      error: t('terminal.status.error'),
    }),
    [t],
  );

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
      : t('common.empty')
    : sshSession
      ? `${sshSession.username}@${sshSession.host}:${sshSession.port}`
      : t('common.empty');

  const status = showFtp
    ? ftpConn!.status
    : activeTab?.status ?? 'disconnected';

  const latency = showFtp
    ? ftpConn?.connectLatencyMs
    : activeTab?.connectLatencyMs;

  return (
    <footer className={styles.statusBar}>
      <span className={styles.item}>
        <span className={styles.label}>{t('common.host')}:</span>
        <span className={styles.value}>{host}</span>
      </span>
      <span className={styles.item}>
        <span className={styles.label}>{t('common.status')}:</span>
        <span className={styles.value}>
          {statusLabels[status] ?? status}
        </span>
      </span>
      <span className={styles.item}>
        <span className={styles.label}>{t('common.connect')}:</span>
        <span className={styles.value}>
          {latency !== undefined ? `${latency} ms` : t('common.empty')}
        </span>
      </span>
    </footer>
  );
});
