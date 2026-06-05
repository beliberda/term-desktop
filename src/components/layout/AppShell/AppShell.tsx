import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Sidebar } from '@components/sidebar/Sidebar/Sidebar';
import { TerminalWorkspace } from '@components/terminal/TerminalWorkspace/TerminalWorkspace';
import { StatusBar } from '@components/layout/StatusBar/StatusBar';
import { useStores } from '@stores/index';
import { invokePing } from '@ipc/client';
import styles from './AppShell.module.css';

export const AppShell = observer(function AppShell() {
  const { appStore } = useStores();

  useEffect(() => {
    invokePing()
      .then((result) => appStore.setPingStatus(result))
      .catch(() => appStore.setPingStatus('error'));
  }, [appStore]);

  return (
    <div className={styles.shell}>
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.main}>
          <TerminalWorkspace />
        </main>
      </div>
      <StatusBar />
    </div>
  );
});
