import { AppStore } from './AppStore';
import { SessionStore } from './SessionStore';
import { TerminalStore } from './TerminalStore';
import { FileBrowserStore } from './FileBrowserStore';
import { FileConnectionStore } from './FileConnectionStore';
import { SettingsStore } from './SettingsStore';

export class RootStore {
  appStore: AppStore;
  sessionStore: SessionStore;
  terminalStore: TerminalStore;
  fileBrowserStore: FileBrowserStore;
  fileConnectionStore: FileConnectionStore;
  settingsStore: SettingsStore;

  constructor() {
    this.appStore = new AppStore();
    this.sessionStore = new SessionStore();
    this.terminalStore = new TerminalStore();
    this.fileBrowserStore = new FileBrowserStore();
    this.fileConnectionStore = new FileConnectionStore();
    this.settingsStore = new SettingsStore();

    this.fileBrowserStore.setSettingsStore(this.settingsStore);
  }
}

export const rootStore = new RootStore();
