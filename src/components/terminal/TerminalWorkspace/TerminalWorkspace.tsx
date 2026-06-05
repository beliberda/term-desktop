import { observer } from 'mobx-react-lite';
import { TerminalTabBar } from '@components/terminal/TerminalTabBar/TerminalTabBar';
import { TerminalView } from '@components/terminal/TerminalView/TerminalView';
import { useStores } from '@stores/index';
import styles from './TerminalWorkspace.module.css';

function statusBannerMessage(
  status: string,
  errorMessage?: string,
): string | null {
  if (status === 'error') {
    return errorMessage ?? 'Не удалось подключиться';
  }
  if (status === 'connecting') {
    return 'Подключение…';
  }
  if (status === 'disconnected') {
    return 'Соединение разорвано';
  }
  return null;
}

export const TerminalWorkspace = observer(function TerminalWorkspace() {
  const { terminalStore } = useStores();
  const activeTab = terminalStore.activeTab;
  const bannerMessage = activeTab
    ? statusBannerMessage(activeTab.status, activeTab.errorMessage)
    : null;

  return (
    <div className={styles.workspace}>
      <TerminalTabBar />
      <div className={styles.content}>
        {activeTab && bannerMessage && (
          <div
            className={`${styles.banner} ${activeTab.status === 'error' ? styles.bannerError : styles.bannerInfo}`}
          >
            <span className={styles.bannerMessage}>{bannerMessage}</span>
            <button
              type="button"
              className={styles.bannerClose}
              onClick={() => terminalStore.closeTab(activeTab.id)}
            >
              Закрыть вкладку
            </button>
          </div>
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
