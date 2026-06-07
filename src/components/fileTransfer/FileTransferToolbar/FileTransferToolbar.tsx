import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useStores } from '@stores/index';
import styles from './FileTransferToolbar.module.css';

export const FileTransferToolbar = observer(function FileTransferToolbar() {
  const { t } = useTranslation();
  const {
    localBrowserStore,
    remoteBrowserStore,
    transferStore,
  } = useStores();

  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={styles.btn}
        title={t('fileTransfer.shortcuts.refresh')}
        onClick={() => {
          localBrowserStore.refresh();
          remoteBrowserStore.refresh();
        }}
      >
        {t('common.refresh')} (F5)
      </button>
      <button
        type="button"
        className={styles.btn}
        title={t('fileTransfer.shortcuts.upload')}
        onClick={() => transferStore.uploadSelected()}
        disabled={localBrowserStore.selectedEntries.length === 0}
      >
        {t('common.upload')} (Ctrl+U)
      </button>
      <button
        type="button"
        className={styles.btn}
        title={t('fileTransfer.shortcuts.download')}
        onClick={() => transferStore.downloadSelected()}
        disabled={remoteBrowserStore.selectedEntries.length === 0}
      >
        {t('fileTransfer.download')} (Ctrl+D)
      </button>
      <button
        type="button"
        className={styles.btn}
        onClick={() => {
          const name = window.prompt(t('files.mkdir.prompt'));
          if (name) void remoteBrowserStore.mkdir(name);
        }}
      >
        {t('fileTransfer.remoteMkdir')}
      </button>
      <button
        type="button"
        className={styles.btn}
        onClick={() => remoteBrowserStore.manualSyncBrowse()}
      >
        {t('fileTransfer.syncBrowse')}
      </button>
    </div>
  );
});
