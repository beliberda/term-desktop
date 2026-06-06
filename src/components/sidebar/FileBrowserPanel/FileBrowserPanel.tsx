import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useAppErrorMessage } from '@i18n/useAppErrorMessage';
import { useStores } from '@stores/index';
import { SftpToolbar } from '@components/sidebar/SftpToolbar/SftpToolbar';
import { SftpBreadcrumbs } from '@components/sidebar/SftpBreadcrumbs/SftpBreadcrumbs';
import { SftpFileList } from '@components/sidebar/SftpFileList/SftpFileList';
import styles from './FileBrowserPanel.module.css';

export const FileBrowserPanel = observer(function FileBrowserPanel() {
  const { t } = useTranslation();
  const {
    terminalStore,
    fileBrowserStore,
    fileConnectionStore,
    sessionStore,
  } = useStores();

  const fileErrorMessage = useAppErrorMessage(fileBrowserStore.error);
  const ftpActive = fileConnectionStore.activeConnection;
  const ftpErrorMessage = useAppErrorMessage(ftpActive?.error);
  const activeTab = terminalStore.activeTab;

  if (ftpActive?.status === 'connecting') {
    return (
      <div className={styles.placeholder}>
        <p className={styles.title}>{t('files.title')}</p>
        <p className={styles.hint}>{t('files.ftpConnecting')}</p>
      </div>
    );
  }

  if (ftpActive?.status === 'error') {
    return (
      <div className={styles.placeholder}>
        <p className={styles.title}>{t('files.title')}</p>
        <p className={styles.hint}>
          {ftpErrorMessage || t('files.ftpError')}
        </p>
      </div>
    );
  }

  if (!ftpActive && !activeTab) {
    return (
      <div className={styles.placeholder}>
        <p className={styles.title}>{t('files.title')}</p>
        <p className={styles.hint}>{t('files.noSession')}</p>
      </div>
    );
  }

  if (!ftpActive && activeTab?.status === 'connecting') {
    return (
      <div className={styles.placeholder}>
        <p className={styles.title}>{t('files.title')}</p>
        <p className={styles.hint}>{t('files.connecting')}</p>
      </div>
    );
  }

  if (
    !ftpActive &&
    (activeTab?.status === 'error' || activeTab?.status === 'disconnected')
  ) {
    return (
      <div className={styles.placeholder}>
        <p className={styles.title}>{t('files.title')}</p>
        <p className={styles.hint}>{t('files.notConnected')}</p>
      </div>
    );
  }

  if (fileBrowserStore.canBrowse) {
    const session = fileBrowserStore.sessionId
      ? sessionStore.sessions.find((s) => s.id === fileBrowserStore.sessionId)
      : null;
    const protocolLabel =
      fileBrowserStore.protocol === 'ftp' ? 'FTP' : 'SFTP';

    return (
      <div className={styles.browser}>
        <p className={styles.protocol}>
          {protocolLabel}
          {session ? ` — ${session.name}` : ''}
        </p>
        <SftpToolbar />
        <SftpBreadcrumbs />
        {fileErrorMessage && (
          <p className={styles.error}>{fileErrorMessage}</p>
        )}
        <SftpFileList />
        {fileBrowserStore.isLoading && fileBrowserStore.entries.length > 0 && (
          <p className={styles.loadingBottom}>{t('files.updating')}</p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.placeholder}>
      <p className={styles.title}>{t('files.title')}</p>
      <p className={styles.hint}>{t('files.noSession')}</p>
    </div>
  );
});
