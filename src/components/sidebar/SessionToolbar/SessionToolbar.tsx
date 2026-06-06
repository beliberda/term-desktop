import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useStores } from '@stores/index';
import styles from './SessionToolbar.module.css';

export const SessionToolbar = observer(function SessionToolbar() {
  const { t } = useTranslation();
  const { sessionStore, settingsStore } = useStores();

  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={`${styles.button} ${styles.buttonPrimary}`}
        title={t('sidebar.toolbar.newSession')}
        onClick={() => sessionStore.openCreateForm()}
      >
        +
      </button>
      <button
        type="button"
        className={styles.button}
        title={t('sidebar.toolbar.newFolder')}
        onClick={() => sessionStore.createFolder(null)}
      >
        📁
      </button>
      <div className={styles.importDropdown}>
        <button
          type="button"
          className={styles.button}
          title={t('sidebar.toolbar.importJson')}
          aria-haspopup="menu"
          aria-expanded={false}
        >
          {t('common.import')}
        </button>
        <div className={styles.importMenu} role="menu">
          <div className={styles.importMenuInner}>
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => sessionStore.importSessions()}
            >
              {t('sidebar.toolbar.importSessions')}
            </button>
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => sessionStore.downloadImportExample()}
            >
              {t('sidebar.toolbar.downloadExample')}
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        className={styles.button}
        onClick={() => sessionStore.exportSessions()}
      >
        {t('common.export')}
      </button>
      <button
        type="button"
        className={styles.button}
        title={t('sidebar.toolbar.settings')}
        onClick={() => settingsStore.openForm()}
      >
        ⚙
      </button>
    </div>
  );
});
