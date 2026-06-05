import { observer } from 'mobx-react-lite';
import { TerminalTabBar } from '@components/terminal/TerminalTabBar/TerminalTabBar';
import { TerminalView } from '@components/terminal/TerminalView/TerminalView';
import { useStores } from '@stores/index';
import styles from './TerminalWorkspace.module.css';

export const TerminalWorkspace = observer(function TerminalWorkspace() {
  const { terminalStore } = useStores();
  const activeTab = terminalStore.activeTab;

  return (
    <div className={styles.workspace}>
      <TerminalTabBar />
      <div className={styles.content}>
        {activeTab?.status === 'error' && activeTab.errorMessage && (
          <div className={styles.error}>{activeTab.errorMessage}</div>
        )}
        {activeTab ? (
          <TerminalView />
        ) : (
          <div className={styles.empty}>
            Двойной клик по сессии в sidebar для подключения
          </div>
        )}
      </div>
    </div>
  );
});
