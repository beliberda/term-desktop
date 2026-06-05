import { observer } from "mobx-react-lite";
import { useStores } from "@stores/index";
import styles from "./SftpBreadcrumbs.module.css";

export const SftpBreadcrumbs = observer(function SftpBreadcrumbs() {
  const { fileBrowserStore } = useStores();

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.rootBtn}
        title="В корень"
        aria-label="В корень"
        onClick={() => fileBrowserStore.navigateTo("/")}
      >
        /
      </button>
      <nav className={styles.breadcrumbs} aria-label="Путь">
        {fileBrowserStore.breadcrumbs.map((crumb, index) => {
          const isLast = index === fileBrowserStore.breadcrumbs.length - 1;
          return (
            <span key={crumb.path} className={styles.item}>
              {index > 0 && <span className={styles.sep}>/</span>}
              {isLast && <span className={styles.current}>{crumb.label}</span>}
            </span>
          );
        })}
      </nav>
      <button
        type="button"
        className={styles.copyBtn}
        title="Копировать текущий путь"
        aria-label="Копировать текущий путь"
        onClick={() => void fileBrowserStore.copyPath(fileBrowserStore.cwd)}
      >
        ⧉
      </button>
    </div>
  );
});
