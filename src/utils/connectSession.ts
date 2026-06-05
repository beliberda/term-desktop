import type { SessionConfig } from '@/types';
import type { AppStore } from '@stores/AppStore';
import type { FileConnectionStore } from '@stores/FileConnectionStore';
import type { SessionStore } from '@stores/SessionStore';
import type { TerminalStore } from '@stores/TerminalStore';

export function connectSession(
  session: SessionConfig,
  stores: {
    sessionStore: SessionStore;
    terminalStore: TerminalStore;
    fileConnectionStore: FileConnectionStore;
    appStore: AppStore;
  },
) {
  stores.sessionStore.selectSession(session.id);

  if (session.protocol === 'ftp') {
    stores.fileConnectionStore.requestConnect(session.id);
    stores.appStore.setSidebarTab('files');
    return;
  }

  stores.terminalStore.requestConnect(session.id, session);
}
