import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useStores } from '@stores/index';
import type { ConnectionStatus } from '@/types';
import styles from './ConnectionTabBar.module.css';

function statusClass(status: ConnectionStatus): string {
  switch (status) {
    case 'connecting':
      return styles.statusConnecting;
    case 'connected':
      return styles.statusConnected;
    case 'error':
      return styles.statusError;
    default:
      return styles.statusDisconnected;
  }
}

export const ConnectionTabBar = observer(function ConnectionTabBar() {
  const { t } = useTranslation();
  const {
    terminalStore,
    fileConnectionStore,
    sessionStore,
    workspaceStore,
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

  const hasTabs =
    terminalStore.tabs.length > 0 || fileConnectionStore.tabs.length > 0;

  if (!hasTabs) {
    return (
      <div className={styles.tabBar}>
        <span className={styles.empty}>{t('terminal.tabs.empty')}</span>
      </div>
    );
  }

  return (
    <div className={styles.tabBar}>
      {terminalStore.tabs.map((tab) => {
        const session = sessionStore.sessions.find((s) => s.id === tab.sessionId);
        const isSftp = session?.protocol === 'sftp';
        const isActive =
          workspaceStore.active?.kind === 'terminal' &&
          workspaceStore.active.tabId === tab.id;

        return (
          <div
            key={tab.id}
            className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
          >
            <button
              type="button"
              className={styles.tabMain}
              onClick={() => terminalStore.setActiveTab(tab.id)}
            >
              <span
                className={`${styles.statusDot} ${statusClass(tab.status)}`}
                title={statusLabels[tab.status]}
              />
              <span className={styles.tabTitle}>{tab.title}</span>
            </button>
            {isSftp && tab.status === 'connected' && (
              <div className={styles.viewToggle}>
                <button
                  type="button"
                  className={`${styles.viewBtn} ${tab.workspaceView === 'files' ? styles.viewBtnActive : ''}`}
                  title={t('fileTransfer.view.files')}
                  onClick={() => terminalStore.setWorkspaceView(tab.id, 'files')}
                >
                  {t('fileTransfer.view.filesShort')}
                </button>
                <button
                  type="button"
                  className={`${styles.viewBtn} ${tab.workspaceView !== 'files' ? styles.viewBtnActive : ''}`}
                  title={t('fileTransfer.view.terminal')}
                  onClick={() =>
                    terminalStore.setWorkspaceView(tab.id, 'terminal')
                  }
                >
                  {t('fileTransfer.view.terminalShort')}
                </button>
              </div>
            )}
            <button
              type="button"
              className={styles.closeBtn}
              title={t('terminal.tabs.close')}
              aria-label={t('terminal.tabs.closeTab', { title: tab.title })}
              onClick={() => void terminalStore.closeTab(tab.id)}
            >
              ×
            </button>
          </div>
        );
      })}
      {fileConnectionStore.tabs.map((tab) => {
        const isActive =
          workspaceStore.active?.kind === 'ftp' &&
          workspaceStore.active.tabId === tab.id;

        return (
          <div
            key={tab.id}
            className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
          >
            <button
              type="button"
              className={styles.tabMain}
              onClick={() => fileConnectionStore.setActiveTab(tab.id)}
            >
              <span
                className={`${styles.statusDot} ${statusClass(tab.status)}`}
                title={statusLabels[tab.status]}
              />
              <span className={styles.tabTitle}>{tab.title}</span>
            </button>
            <button
              type="button"
              className={styles.closeBtn}
              title={t('terminal.tabs.close')}
              aria-label={t('terminal.tabs.closeTab', { title: tab.title })}
              onClick={() => void fileConnectionStore.closeTab(tab.id)}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
});
