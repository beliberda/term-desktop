import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import styles from './SessionToolbar.module.css';

export const SessionToolbar = observer(function SessionToolbar() {
  const { sessionStore } = useStores();

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
        onClick={() => sessionStore.importSessions()}
      >
        Import
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => sessionStore.exportSessions()}
      >
        Export
      </button>
    </div>
  );
});
