import { useEffect } from 'react';
import { reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Sidebar } from '@components/sidebar/Sidebar/Sidebar';
import { TerminalWorkspace } from '@components/terminal/TerminalWorkspace/TerminalWorkspace';
import { StatusBar } from '@components/layout/StatusBar/StatusBar';
import { ConnectPasswordModal } from '@components/terminal/ConnectPasswordModal/ConnectPasswordModal';
import { SettingsModal } from '@components/settings/SettingsModal/SettingsModal';
import { useStores } from '@stores/index';
import { useAppShortcuts } from '@hooks/useAppShortcuts';
import { listenConnectionStatus } from '@ipc/events';
import styles from './AppShell.module.css';

export const AppShell = observer(function AppShell() {
  const {
    sessionStore,
    terminalStore,
    fileBrowserStore,
    fileConnectionStore,
    appStore,
    settingsStore,
  } = useStores();

  useAppShortcuts();

  useEffect(() => {
    sessionStore.load();
    void settingsStore.load();
    void terminalStore.initListeners();

    void listenConnectionStatus((payload) => {
      terminalStore.handleConnectionStatus(payload);
      fileConnectionStore.handleConnectionStatus(payload);
    });
  }, [sessionStore, terminalStore, fileConnectionStore, settingsStore]);

  useEffect(() => {
    const disposeBind = reaction(
      () => [
        terminalStore.activeConnectionId,
        terminalStore.activeTab?.status,
        terminalStore.activeTab?.sessionId,
        fileConnectionStore.activeSessionId,
        fileConnectionStore.activeConnection?.status,
        fileConnectionStore.activeConnection?.connectionId,
      ],
      () => {
        fileBrowserStore.bind(
          terminalStore,
          sessionStore,
          fileConnectionStore,
        );
      },
      { fireImmediately: true },
    );

    const disposeRefresh = reaction(
      () => appStore.sidebarTab,
      (tab) => {
        if (tab === 'files') {
          fileBrowserStore.refresh();
        }
      },
    );

    return () => {
      disposeBind();
      disposeRefresh();
    };
  }, [
    appStore,
    sessionStore,
    terminalStore,
    fileBrowserStore,
    fileConnectionStore,
  ]);

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
      <SettingsModal />
    </div>
  );
});
