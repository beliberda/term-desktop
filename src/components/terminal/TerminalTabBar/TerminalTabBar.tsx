import { observer } from 'mobx-react-lite';
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
  const { terminalStore } = useStores();

  if (terminalStore.tabs.length === 0) {
    return (
      <div className={styles.tabBar}>
        <span className={styles.empty}>Нет открытых вкладок</span>
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
              title={tab.status}
            />
            <span className={styles.tabTitle}>{tab.title}</span>
          </button>
          <button
            type="button"
            className={styles.closeBtn}
            title="Закрыть"
            aria-label={`Закрыть ${tab.title}`}
            onClick={() => terminalStore.closeTab(tab.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
});
