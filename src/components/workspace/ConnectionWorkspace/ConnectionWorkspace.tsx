import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { TerminalTabPanels } from '@components/terminal/TerminalTabPanels/TerminalTabPanels';
import { FileTransferWorkspace } from '@components/fileTransfer/FileTransferWorkspace/FileTransferWorkspace';
import { ConnectionTabBar } from '@components/workspace/ConnectionTabBar/ConnectionTabBar';
import { useStores } from '@stores/index';
import type { AppError } from '@i18n/types';
import styles from './ConnectionWorkspace.module.css';

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

export const ConnectionWorkspace = observer(function ConnectionWorkspace() {
  const { t } = useTranslation();
  const {
    terminalStore,
    fileConnectionStore,
    workspaceStore,
    sessionStore,
  } = useStores();

  const showFileTransfer = workspaceStore.isFileMode(
    terminalStore,
    fileConnectionStore,
    sessionStore,
  );
  const showTerminal = workspaceStore.isTerminalMode(
    terminalStore,
    fileConnectionStore,
    sessionStore,
  );

  const activeTerminalTab = terminalStore.activeTab;
  const activeFtpTab = fileConnectionStore.activeTab;

  const bannerTab = showTerminal ? activeTerminalTab : activeFtpTab;

  const translateTabError = (error: AppError) => {
    const key = `errors.${error.code}`;
    const translated = t(key, { ...(error.details ?? {}), defaultValue: '' });
    if (translated) return translated;
    const raw = error.details?.raw;
    return typeof raw === 'string' ? raw : t('errors.unknown');
  };

  const bannerMessage = bannerTab
    ? statusBannerMessage(
        t,
        bannerTab.status,
        bannerTab.error,
        translateTabError,
      )
    : null;

  const showReconnect =
    showTerminal &&
    activeTerminalTab !== null &&
    terminalStore.canReconnect(activeTerminalTab);

  const hasAnyTab =
    terminalStore.tabs.length > 0 || fileConnectionStore.tabs.length > 0;

  return (
    <div className={styles.workspace}>
      <ConnectionTabBar />
      <div className={styles.content}>
        {bannerTab && bannerMessage && (
          <div
            className={`${styles.banner} ${bannerTab.status === 'error' ? styles.bannerError : styles.bannerInfo}`}
          >
            <span className={styles.bannerMessage}>{bannerMessage}</span>
            {showReconnect && activeTerminalTab && (
              <button
                type="button"
                className={styles.bannerReconnect}
                onClick={() =>
                  void terminalStore.reconnectTab(activeTerminalTab.id)
                }
              >
                {t('terminal.workspace.reconnect')}
              </button>
            )}
          </div>
        )}
        {showFileTransfer && <FileTransferWorkspace />}
        {showTerminal && terminalStore.tabs.length > 0 && (
          <div className={styles.terminalArea}>
            <TerminalTabPanels />
          </div>
        )}
        {!hasAnyTab && (
          <div className={styles.empty}>{t('terminal.workspace.emptyHint')}</div>
        )}
        {!showFileTransfer && !showTerminal && hasAnyTab && (
          <div className={styles.empty}>{t('files.connecting')}</div>
        )}
      </div>
    </div>
  );
});
