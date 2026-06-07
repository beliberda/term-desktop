import { useEffect } from 'react';
import { useStores } from '@stores/index';
import { connectSession } from '@utils/connectSession';

function isTypingInInput(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

export function useAppShortcuts() {
  const {
    appStore,
    sessionStore,
    terminalStore,
    fileConnectionStore,
    workspaceStore,
    localBrowserStore,
    remoteBrowserStore,
    transferStore,
  } = useStores();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const inInput = isTypingInInput();

      const fileMode = workspaceStore.isFileMode(
        terminalStore,
        fileConnectionStore,
        sessionStore,
      );

      if (fileMode && !inInput) {
        if (key === 'f5') {
          e.preventDefault();
          localBrowserStore.refresh();
          remoteBrowserStore.refresh();
          return;
        }
        if (key === 'f2') {
          e.preventDefault();
          const entry =
            remoteBrowserStore.focused
              ? remoteBrowserStore.selectedEntries[0]
              : localBrowserStore.selectedEntries[0];
          if (entry) {
            if (remoteBrowserStore.focused) {
              remoteBrowserStore.startRename(entry);
            } else {
              localBrowserStore.startRename(entry);
            }
          }
          return;
        }
        if (e.ctrlKey && key === 'u') {
          e.preventDefault();
          transferStore.uploadSelected();
          return;
        }
        if (e.ctrlKey && key === 'd') {
          e.preventDefault();
          transferStore.downloadSelected();
          return;
        }
        if (e.ctrlKey && key === '1') {
          e.preventDefault();
          localBrowserStore.setFocused(true);
          remoteBrowserStore.setFocused(false);
          return;
        }
        if (e.ctrlKey && key === '2') {
          e.preventDefault();
          remoteBrowserStore.setFocused(true);
          localBrowserStore.setFocused(false);
          return;
        }
        if (e.ctrlKey && key === 'a') {
          e.preventDefault();
          if (remoteBrowserStore.focused) {
            remoteBrowserStore.selectAll();
          } else {
            localBrowserStore.selectAll();
          }
          return;
        }
        if (e.ctrlKey && e.shiftKey && key === 't') {
          e.preventDefault();
          const tab = terminalStore.activeTab;
          if (tab) terminalStore.toggleWorkspaceView(tab.id);
          return;
        }
      }

      if (!e.ctrlKey || inInput) return;

      if (key === 't') {
        e.preventDefault();
        const selected = sessionStore.selectedId
          ? sessionStore.sessions.find((s) => s.id === sessionStore.selectedId)
          : null;
        if (selected) {
          connectSession(selected, {
            sessionStore,
            terminalStore,
            fileConnectionStore,
            appStore,
          });
        } else {
          appStore.setSidebarTab('sessions');
        }
        return;
      }

      if (key === 'r') {
        const tab = terminalStore.activeTab;
        if (tab && terminalStore.canReconnect(tab)) {
          e.preventDefault();
          void terminalStore.reconnectTab(tab.id);
        }
        return;
      }

      if (key === 'w') {
        if (workspaceStore.active?.kind === 'ftp' && fileConnectionStore.activeTabId) {
          e.preventDefault();
          void fileConnectionStore.closeTab(fileConnectionStore.activeTabId);
        } else if (terminalStore.activeTabId) {
          e.preventDefault();
          void terminalStore.closeTab(terminalStore.activeTabId);
        }
        return;
      }

      if (key === 'b') {
        e.preventDefault();
        appStore.setSidebarTab(
          appStore.sidebarTab === 'sessions' ? 'files' : 'sessions',
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    appStore,
    sessionStore,
    terminalStore,
    fileConnectionStore,
    workspaceStore,
    localBrowserStore,
    remoteBrowserStore,
    transferStore,
  ]);
}
