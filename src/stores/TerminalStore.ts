import { makeAutoObservable, runInAction } from 'mobx';
import type { ConnectionStatusPayload, TerminalOutputPayload, TerminalTab } from '@/types';
import type { SessionConfig } from '@/types';
import * as terminalIpc from '@ipc/terminal';
import { listenConnectionStatus, listenTerminalOutput } from '@ipc/events';

type OutputHandler = (payload: TerminalOutputPayload) => void;

export class TerminalStore {
  tabs: TerminalTab[] = [];
  activeTabId: string | null = null;
  pendingConnect: { sessionId: string } | null = null;
  private listenersInitialized = false;
  private outputHandlers = new Set<OutputHandler>();
  private unlistenFns: Array<() => void> = [];

  constructor() {
    makeAutoObservable(this);
  }

  get activeTab(): TerminalTab | null {
    if (!this.activeTabId) return null;
    return this.tabs.find((t) => t.id === this.activeTabId) ?? null;
  }

  get activeConnectionId(): string | null {
    return this.activeTab?.connectionId ?? null;
  }

  async initListeners() {
    if (this.listenersInitialized) return;
    this.listenersInitialized = true;

    const unlistenStatus = await listenConnectionStatus((payload) => {
      this.handleConnectionStatus(payload);
    });
    const unlistenOutput = await listenTerminalOutput((payload) => {
      this.outputHandlers.forEach((handler) => handler(payload));
    });

    this.unlistenFns.push(unlistenStatus, unlistenOutput);
  }

  registerOutputHandler(handler: OutputHandler) {
    this.outputHandlers.add(handler);
    return () => this.outputHandlers.delete(handler);
  }

  requestConnect(sessionId: string, session?: SessionConfig) {
    if (session?.protocol === 'ftp') {
      window.alert('FTP-сессии не поддерживают терминал');
      return;
    }
    if (session?.authType === 'password') {
      this.pendingConnect = { sessionId };
      return;
    }
    void this.openTab(sessionId);
  }

  cancelPendingConnect() {
    this.pendingConnect = null;
  }

  async openTab(sessionId: string, password?: string, session?: SessionConfig) {
    const tabId = crypto.randomUUID();
    const title = session
      ? `${session.name} (${session.host})`
      : `Session ${sessionId.slice(0, 8)}`;

    const tab: TerminalTab = {
      id: tabId,
      sessionId,
      title,
      status: 'connecting',
    };

    runInAction(() => {
      this.tabs.push(tab);
      this.activeTabId = tabId;
      this.pendingConnect = null;
    });

    try {
      const { connectionId } = await terminalIpc.terminalConnect(
        sessionId,
        password,
      );
      runInAction(() => {
        const t = this.tabs.find((x) => x.id === tabId);
        if (t) {
          t.connectionId = connectionId;
        }
      });
    } catch (e) {
      runInAction(() => {
        const t = this.tabs.find((x) => x.id === tabId);
        if (t) {
          t.status = 'error';
          t.errorMessage =
            e instanceof Error ? e.message : 'Не удалось подключиться';
        }
      });
    }
  }

  async closeTab(tabId: string) {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (tab?.connectionId) {
      try {
        await terminalIpc.terminalDisconnect(tab.connectionId);
      } catch (e) {
        console.error('[TerminalStore] disconnect failed:', e);
      }
    }

    runInAction(() => {
      this.tabs = this.tabs.filter((t) => t.id !== tabId);
      if (this.activeTabId === tabId) {
        this.activeTabId = this.tabs[this.tabs.length - 1]?.id ?? null;
      }
    });
  }

  setActiveTab(tabId: string) {
    this.activeTabId = tabId;
  }

  async writeToActive(data: Uint8Array) {
    const connectionId = this.activeConnectionId;
    if (!connectionId) return;

    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    const base64 = btoa(binary);
    try {
      await terminalIpc.terminalWrite(connectionId, base64);
    } catch (e) {
      console.error('[TerminalStore] write failed:', e);
    }
  }

  async resize(connectionId: string, cols: number, rows: number) {
    try {
      await terminalIpc.terminalResize(connectionId, cols, rows);
    } catch (e) {
      console.error('[TerminalStore] resize failed:', e);
    }
  }

  handleConnectionStatus(payload: ConnectionStatusPayload) {
    runInAction(() => {
      let tab = this.tabs.find(
        (t) => t.connectionId === payload.connectionId,
      );
      if (!tab) {
        tab = this.tabs.find(
          (t) => !t.connectionId && t.status === 'connecting',
        );
        if (tab) {
          tab.connectionId = payload.connectionId;
        }
      }
      if (!tab) return;
      tab.status = payload.status;
      if (payload.message) {
        tab.errorMessage = payload.message;
      } else if (payload.status === 'connected') {
        tab.errorMessage = undefined;
      }
    });
  }
}
