import { useEffect } from 'react';
import { reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Sidebar } from '@components/sidebar/Sidebar/Sidebar';
import { TerminalWorkspace } from '@components/terminal/TerminalWorkspace/TerminalWorkspace';
import { StatusBar } from '@components/layout/StatusBar/StatusBar';
import { ConnectPasswordModal } from '@components/terminal/ConnectPasswordModal/ConnectPasswordModal';
import { useStores } from '@stores/index';
import { invokePing } from '@ipc/client';
import styles from './AppShell.module.css';

export const AppShell = observer(function AppShell() {
  const { appStore, sessionStore, terminalStore, sftpBrowserStore } =
    useStores();

  useEffect(() => {
    invokePing()
      .then((result) => appStore.setPingStatus(result))
      .catch(() => appStore.setPingStatus('error'));
    sessionStore.load();
    void terminalStore.initListeners();
  }, [appStore, sessionStore, terminalStore]);

  useEffect(() => {
    const disposeBind = reaction(
      () => [
        terminalStore.activeConnectionId,
        terminalStore.activeTab?.status,
        terminalStore.activeTab?.sessionId,
      ],
      () => {
        sftpBrowserStore.bindToActiveTab(terminalStore, sessionStore);
      },
      { fireImmediately: true },
    );

    const disposeRefresh = reaction(
      () => appStore.sidebarTab,
      (tab) => {
        if (tab === 'sftp') {
          sftpBrowserStore.refresh();
        }
      },
    );

    return () => {
      disposeBind();
      disposeRefresh();
    };
  }, [appStore, sessionStore, terminalStore, sftpBrowserStore]);

  return (
    <div className={styles.shell}>
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.main}>
          <TerminalWorkspace />
        </main>
      </div>
      <StatusBar />
      <ConnectPasswordModal />
    </div>
  );
});
