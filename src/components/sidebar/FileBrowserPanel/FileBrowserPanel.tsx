import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import { SftpToolbar } from '@components/sidebar/SftpToolbar/SftpToolbar';
import { SftpBreadcrumbs } from '@components/sidebar/SftpBreadcrumbs/SftpBreadcrumbs';
import { SftpFileList } from '@components/sidebar/SftpFileList/SftpFileList';
import styles from './FileBrowserPanel.module.css';

export const FileBrowserPanel = observer(function FileBrowserPanel() {
  const {
    terminalStore,
    fileBrowserStore,
    fileConnectionStore,
    sessionStore,
  } = useStores();

  const ftpActive = fileConnectionStore.activeConnection;
  const activeTab = terminalStore.activeTab;

  if (ftpActive?.status === 'connecting') {
    return (
      <div className={styles.placeholder}>
        <p className={styles.title}>Файлы</p>
        <p className={styles.hint}>Подключение по FTP...</p>
      </div>
    );
  }

  if (ftpActive?.status === 'error') {
    return (
      <div className={styles.placeholder}>
        <p className={styles.title}>Файлы</p>
        <p className={styles.hint}>
          {ftpActive.errorMessage ?? 'Ошибка FTP-подключения'}
        </p>
      </div>
    );
  }

  if (!ftpActive && !activeTab) {
    return (
      <div className={styles.placeholder}>
        <p className={styles.title}>Файлы</p>
        <p className={styles.hint}>
          Подключите SSH или FTP сессию из списка
        </p>
      </div>
    );
  }

  if (!ftpActive && activeTab?.status === 'connecting') {
    return (
      <div className={styles.placeholder}>
        <p className={styles.title}>Файлы</p>
        <p className={styles.hint}>Подключение...</p>
      </div>
    );
  }

  if (
    !ftpActive &&
    (activeTab?.status === 'error' || activeTab?.status === 'disconnected')
  ) {
    return (
      <div className={styles.placeholder}>
        <p className={styles.title}>Файлы</p>
        <p className={styles.hint}>Сессия не подключена</p>
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
        {fileBrowserStore.error && (
          <p className={styles.error}>{fileBrowserStore.error}</p>
        )}
        {fileBrowserStore.isLoading && fileBrowserStore.entries.length > 0 && (
          <p className={styles.loading}>Обновление...</p>
        )}
        <SftpFileList />
      </div>
    );
  }

  return (
    <div className={styles.placeholder}>
      <p className={styles.title}>Файлы</p>
      <p className={styles.hint}>Подключите SSH или FTP сессию</p>
    </div>
  );
});
