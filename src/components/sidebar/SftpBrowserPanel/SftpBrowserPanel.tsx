import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import { SftpToolbar } from '@components/sidebar/SftpToolbar/SftpToolbar';
import { SftpBreadcrumbs } from '@components/sidebar/SftpBreadcrumbs/SftpBreadcrumbs';
import { SftpFileList } from '@components/sidebar/SftpFileList/SftpFileList';
import styles from './SftpBrowserPanel.module.css';

export const SftpBrowserPanel = observer(function SftpBrowserPanel() {
  const { terminalStore, sftpBrowserStore } = useStores();
  const activeTab = terminalStore.activeTab;

  if (!activeTab) {
    return (
      <div className={styles.placeholder}>
        <p className={styles.title}>SSH Browser</p>
        <p className={styles.hint}>Выберите активную сессию в терминале</p>
      </div>
    );
  }

  if (activeTab.status === 'connecting') {
    return (
      <div className={styles.placeholder}>
        <p className={styles.title}>SSH Browser</p>
        <p className={styles.hint}>Подключение...</p>
      </div>
    );
  }

  if (activeTab.status === 'error' || activeTab.status === 'disconnected') {
    return (
      <div className={styles.placeholder}>
        <p className={styles.title}>SSH Browser</p>
        <p className={styles.hint}>Сессия не подключена</p>
      </div>
    );
  }

  return (
    <div className={styles.browser}>
      <SftpToolbar />
      <SftpBreadcrumbs />
      {sftpBrowserStore.error && (
        <p className={styles.error}>{sftpBrowserStore.error}</p>
      )}
      {sftpBrowserStore.isLoading && sftpBrowserStore.entries.length > 0 && (
        <p className={styles.loading}>Обновление...</p>
      )}
      <SftpFileList />
    </div>
  );
});
