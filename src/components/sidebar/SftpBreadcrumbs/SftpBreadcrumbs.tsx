import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import styles from './SftpBreadcrumbs.module.css';

export const SftpBreadcrumbs = observer(function SftpBreadcrumbs() {
  const { sftpBrowserStore } = useStores();

  return (
    <nav className={styles.breadcrumbs} aria-label="Путь">
      {sftpBrowserStore.breadcrumbs.map((crumb, index) => {
        const isLast = index === sftpBrowserStore.breadcrumbs.length - 1;
        return (
          <span key={crumb.path} className={styles.item}>
            {index > 0 && <span className={styles.sep}>/</span>}
            {isLast ? (
              <span className={styles.current}>{crumb.label}</span>
            ) : (
              <button
                type="button"
                className={styles.link}
                onClick={() => sftpBrowserStore.navigateTo(crumb.path)}
              >
                {crumb.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
});
