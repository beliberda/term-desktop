import { AppStore } from './AppStore';
import { SessionStore } from './SessionStore';
import { TerminalStore } from './TerminalStore';
import { SftpBrowserStore } from './SftpBrowserStore';

export class RootStore {
  appStore: AppStore;
  sessionStore: SessionStore;
  terminalStore: TerminalStore;
  sftpBrowserStore: SftpBrowserStore;

  constructor() {
    this.appStore = new AppStore();
    this.sessionStore = new SessionStore();
    this.terminalStore = new TerminalStore();
    this.sftpBrowserStore = new SftpBrowserStore();
  }
}

export const rootStore = new RootStore();
