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
  } = useStores();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || isTypingInInput()) return;

      const key = e.key.toLowerCase();

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

      if (key === 'w') {
        if (terminalStore.activeTabId) {
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
  }, [appStore, sessionStore, terminalStore, fileConnectionStore]);
}
