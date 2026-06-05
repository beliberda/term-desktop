import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import styles from './StatusBar.module.css';

export const StatusBar = observer(function StatusBar() {
  const { appStore } = useStores();

  return (
    <footer className={styles.statusBar}>
      <span className={styles.label}>ping:</span>
      <span className={styles.value}>
        {appStore.pingStatus || '...'}
      </span>
    </footer>
  );
});
