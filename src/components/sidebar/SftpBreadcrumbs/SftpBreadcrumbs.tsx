import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useStores } from '@stores/index';
import styles from './SftpBreadcrumbs.module.css';

export const SftpBreadcrumbs = observer(function SftpBreadcrumbs() {
  const { t } = useTranslation();
  const { fileBrowserStore } = useStores();

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.rootBtn}
        title={t('files.breadcrumbs.root')}
        aria-label={t('files.breadcrumbs.root')}
        onClick={() => fileBrowserStore.navigateTo('/')}
      >
        /
      </button>
      <nav className={styles.breadcrumbs} aria-label={t('files.breadcrumbs.path')}>
        {fileBrowserStore.breadcrumbs.map((crumb, index) => {
          const isLast = index === fileBrowserStore.breadcrumbs.length - 1;
          return (
            <span key={crumb.path} className={styles.item}>
              {index > 0 && <span className={styles.sep}>/</span>}
              {isLast ? (
                <span className={styles.current}>{crumb.label}</span>
              ) : (
                <>
                  {crumb.label !== '/' && (
                    <button
                      type="button"
                      className={styles.link}
                      onClick={() => fileBrowserStore.navigateTo(crumb.path)}
                    >
                      {crumb.label}
                    </button>
                  )}
                </>
              )}
            </span>
          );
        })}
      </nav>
      <button
        type="button"
        className={styles.copyBtn}
        title={t('files.breadcrumbs.copyPath')}
        aria-label={t('files.breadcrumbs.copyPath')}
        onClick={() => void fileBrowserStore.copyPath(fileBrowserStore.cwd)}
      >
        ⧉
      </button>
    </div>
  );
});
