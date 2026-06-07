import { AppStore } from "./AppStore";
import { SessionStore } from "./SessionStore";
import { TerminalStore } from "./TerminalStore";
import { FileBrowserStore } from "./FileBrowserStore";
import { FileConnectionStore } from "./FileConnectionStore";
import { SettingsStore } from "./SettingsStore";
import { LocalBrowserStore } from "./LocalBrowserStore";
import { RemoteBrowserStore } from "./RemoteBrowserStore";
import { TransferStore } from "./TransferStore";
import { WorkspaceStore } from "./WorkspaceStore";

export class RootStore {
  appStore: AppStore;
  sessionStore: SessionStore;
  terminalStore: TerminalStore;
  fileBrowserStore: FileBrowserStore;
  fileConnectionStore: FileConnectionStore;
  settingsStore: SettingsStore;
  localBrowserStore: LocalBrowserStore;
  remoteBrowserStore: RemoteBrowserStore;
  transferStore: TransferStore;
  workspaceStore: WorkspaceStore;

  constructor() {
    this.appStore = new AppStore();
    this.sessionStore = new SessionStore();
    this.terminalStore = new TerminalStore();
    this.fileBrowserStore = new FileBrowserStore();
    this.fileConnectionStore = new FileConnectionStore();
    this.settingsStore = new SettingsStore();
    this.localBrowserStore = new LocalBrowserStore();
    this.remoteBrowserStore = new RemoteBrowserStore();
    this.transferStore = new TransferStore();
    this.workspaceStore = new WorkspaceStore();

    this.fileBrowserStore.setSettingsStore(this.settingsStore);
    this.localBrowserStore.setSettingsStore(this.settingsStore);
    this.remoteBrowserStore.setSettingsStore(this.settingsStore);
    this.remoteBrowserStore.setLocalBrowserStore(this.localBrowserStore);
    this.localBrowserStore.setRemoteBrowserStore(this.remoteBrowserStore);
    this.sessionStore.setTerminalStore(this.terminalStore);
    this.terminalStore.setSessionStore(this.sessionStore);
    this.terminalStore.setWorkspaceStore(this.workspaceStore);
    this.fileConnectionStore.setSessionStore(this.sessionStore);
    this.fileConnectionStore.setWorkspaceStore(this.workspaceStore);
    this.transferStore.wire(
      this.localBrowserStore,
      this.remoteBrowserStore,
      this.sessionStore,
      this.settingsStore,
    );
  }
}

export const rootStore = new RootStore();
