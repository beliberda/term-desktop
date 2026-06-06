import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useStores } from '@stores/index';
import type { ConnectionStatus } from '@/types';
import styles from './TerminalTabBar.module.css';

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

export const TerminalTabBar = observer(function TerminalTabBar() {
  const { t } = useTranslation();
  const { terminalStore } = useStores();

  const statusLabels = useMemo(
    (): Record<ConnectionStatus, string> => ({
      connecting: t('terminal.status.connecting'),
      connected: t('terminal.status.connected'),
      disconnected: t('terminal.status.disconnected'),
      error: t('terminal.status.error'),
    }),
    [t],
  );

  if (terminalStore.tabs.length === 0) {
    return (
      <div className={styles.tabBar}>
        <span className={styles.empty}>{t('terminal.tabs.empty')}</span>
      </div>
    );
  }

  return (
    <div className={styles.tabBar}>
      {terminalStore.tabs.map((tab) => (
        <div
          key={tab.id}
          className={`${styles.tab} ${terminalStore.activeTabId === tab.id ? styles.tabActive : ''}`}
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
          <button
            type="button"
            className={styles.closeBtn}
            title={t('terminal.tabs.close')}
            aria-label={t('terminal.tabs.closeTab', { title: tab.title })}
            onClick={() => terminalStore.closeTab(tab.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
});
