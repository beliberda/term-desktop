import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { TerminalTabBar } from '@components/terminal/TerminalTabBar/TerminalTabBar';
import { TerminalTabPanels } from '@components/terminal/TerminalTabPanels/TerminalTabPanels';
import { useStores } from '@stores/index';
import type { AppError } from '@i18n/types';
import styles from './TerminalWorkspace.module.css';

function statusBannerMessage(
  t: (key: string) => string,
  status: string,
  error?: AppError,
  translateError?: (error: AppError) => string,
): string | null {
  if (status === 'error') {
    return error && translateError
      ? translateError(error)
      : t('terminal.workspace.connectFailed');
  }
  if (status === 'connecting') {
    return t('terminal.workspace.connecting');
  }
  if (status === 'disconnected') {
    return t('terminal.workspace.disconnected');
  }
  return null;
}

export const TerminalWorkspace = observer(function TerminalWorkspace() {
  const { t } = useTranslation();
  const { terminalStore } = useStores();
  const activeTab = terminalStore.activeTab;

  const translateTabError = (error: AppError) => {
    const key = `errors.${error.code}`;
    const translated = t(key, { ...(error.details ?? {}), defaultValue: '' });
    if (translated) return translated;
    const raw = error.details?.raw;
    return typeof raw === 'string' ? raw : t('errors.unknown');
  };

  const bannerMessage = activeTab
    ? statusBannerMessage(
        t,
        activeTab.status,
        activeTab.error,
        translateTabError,
      )
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
                  {t('terminal.workspace.reconnect')}
                </button>
              )}
              <button
                type="button"
                className={styles.bannerClose}
                onClick={() => terminalStore.closeTab(activeTab.id)}
              >
                {t('terminal.workspace.closeTab')}
              </button>
            </div>
          </div>
        )}
        {terminalStore.tabs.length > 0 ? (
          <TerminalTabPanels />
        ) : (
          <div className={styles.empty}>{t('terminal.workspace.emptyHint')}</div>
        )}
        {showReconnect && (
          <div className={styles.hintFooter}>
            {t('terminal.workspace.reconnectShortcut')}
          </div>
        )}
      </div>
    </div>
  );
});
