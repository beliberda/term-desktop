import { observer } from 'mobx-react-lite';
import { TerminalPanel } from '@components/terminal/TerminalPanel/TerminalPanel';
import { useStores } from '@stores/index';
import styles from './TerminalTabPanels.module.css';

export const TerminalTabPanels = observer(function TerminalTabPanels() {
  const { terminalStore } = useStores();
  const activeTabId = terminalStore.activeTabId;

  if (terminalStore.tabs.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {terminalStore.tabs.map((tab) => (
        <TerminalPanel
          key={tab.id}
          tabId={tab.id}
          isActive={tab.id === activeTabId}
        />
      ))}
    </div>
  );
});
