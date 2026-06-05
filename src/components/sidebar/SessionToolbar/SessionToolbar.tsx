import { observer } from "mobx-react-lite";
import { useStores } from "@stores/index";
import styles from "./SessionToolbar.module.css";

export const SessionToolbar = observer(function SessionToolbar() {
  const { sessionStore, settingsStore } = useStores();

  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={`${styles.button} ${styles.buttonPrimary}`}
        title="Новая сессия"
        onClick={() => sessionStore.openCreateForm()}
      >
        +
      </button>
      <button
        type="button"
        className={styles.button}
        title="Новая папка"
        onClick={() => sessionStore.createFolder(null)}
      >
        📁
      </button>
      <div className={styles.importDropdown}>
        <button
          type="button"
          className={styles.button}
          title="Импорт сессий из JSON"
          aria-haspopup="menu"
          aria-expanded={false}
        >
          Import
        </button>
        <div className={styles.importMenu} role="menu">
          <div className={styles.importMenuInner}>
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => sessionStore.importSessions()}
            >
              Импортировать…
            </button>
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => sessionStore.downloadImportExample()}
            >
              Скачать пример
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        className={styles.button}
        onClick={() => sessionStore.exportSessions()}
      >
        Export
      </button>
      <button
        type="button"
        className={styles.button}
        title="Настройки"
        onClick={() => settingsStore.openForm()}
      >
        ⚙
      </button>
    </div>
  );
});
