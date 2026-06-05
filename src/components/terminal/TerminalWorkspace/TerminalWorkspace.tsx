import { observer } from 'mobx-react-lite';
import { TerminalTabBar } from '@components/terminal/TerminalTabBar/TerminalTabBar';
import { TerminalTabPanels } from '@components/terminal/TerminalTabPanels/TerminalTabPanels';
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
  const showReconnect =
    activeTab !== null && terminalStore.canReconnect(activeTab);

  return (
    <div className={styles.workspace}>
      <TerminalTabBar />
      <div className={styles.content}>
        {activeTab && bannerMessage && (
          <div
            className={`${styles.banner} ${activeTab.status === 'error' ? styles.bannerError : styles.bannerInfo}`}
          >
            <span className={styles.bannerMessage}>{bannerMessage}</span>
            <div className={styles.bannerActions}>
              {showReconnect && (
                <button
                  type="button"
                  className={styles.bannerReconnect}
                  onClick={() => void terminalStore.reconnectTab(activeTab.id)}
                >
                  Переподключить
                </button>
              )}
              <button
                type="button"
                className={styles.bannerClose}
                onClick={() => terminalStore.closeTab(activeTab.id)}
              >
                Закрыть вкладку
              </button>
            </div>
          </div>
        )}
        {terminalStore.tabs.length > 0 ? (
          <TerminalTabPanels />
        ) : (
          <div className={styles.empty}>
            Двойной клик по сессии в sidebar для подключения
          </div>
        )}
        {showReconnect && (
          <div className={styles.hintFooter}>Ctrl+R — переподключиться</div>
        )}
      </div>
    </div>
  );
});
