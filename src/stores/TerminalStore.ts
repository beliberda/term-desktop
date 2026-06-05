import { makeAutoObservable, runInAction } from 'mobx';
import type { ConnectionStatusPayload, TerminalOutputPayload, TerminalTab } from '@/types';
import type { SessionConfig } from '@/types';
import * as terminalIpc from '@ipc/terminal';
import { getIpcErrorMessage } from '@ipc/client';
import { listenTerminalOutput } from '@ipc/events';
import type { SessionStore } from './SessionStore';

type OutputHandler = (payload: TerminalOutputPayload) => void;

export type PendingConnect = {
  sessionId: string;
  passphraseRetry?: boolean;
};

function isSessionNotFoundError(message: string): boolean {
  return message.toLowerCase().includes('session not found');
}

function shouldPromptPassphrase(
  authType: string | undefined,
  password: string | undefined,
  message: string,
): boolean {
  if (authType !== 'privateKey') return false;
  const lower = message.toLowerCase();
  if (!password) {
    return (
      lower.includes('encrypted') ||
      lower.includes('failed to load private key')
    );
  }
  return lower.includes('failed to load private key');
}

export class TerminalStore {
  tabs: TerminalTab[] = [];
  activeTabId: string | null = null;
  pendingConnect: PendingConnect | null = null;
  private sessionStore: SessionStore | null = null;
  private listenersInitialized = false;
  private outputHandlers = new Set<OutputHandler>();
  private unlistenFns: Array<() => void> = [];

  constructor() {
    makeAutoObservable(this);
  }

  setSessionStore(sessionStore: SessionStore) {
    this.sessionStore = sessionStore;
  }

  clearStalePendingConnect(validSessionIds: Set<string>) {
    if (
      this.pendingConnect &&
      !validSessionIds.has(this.pendingConnect.sessionId)
    ) {
      this.pendingConnect = null;
    }
  }

  private resolveSession(
    sessionId: string,
    session?: SessionConfig,
  ): SessionConfig | undefined {
    return session ?? this.sessionStore?.getSessionById(sessionId);
  }

  private schedulePassphrasePrompt(sessionId: string, tabId: string) {
    this.tabs = this.tabs.filter((t) => t.id !== tabId);
    if (this.activeTabId === tabId) {
      this.activeTabId = this.tabs[this.tabs.length - 1]?.id ?? null;
    }
    this.pendingConnect = { sessionId, passphraseRetry: true };
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

    const unlistenOutput = await listenTerminalOutput((payload) => {
      this.outputHandlers.forEach((handler) => handler(payload));
    });

    this.unlistenFns.push(unlistenOutput);
  }

  registerOutputHandler(handler: OutputHandler) {
    this.outputHandlers.add(handler);
    return () => this.outputHandlers.delete(handler);
  }

  requestConnect(sessionId: string, session?: SessionConfig) {
    void this.beginConnect(sessionId, session);
  }

  private async beginConnect(sessionId: string, session?: SessionConfig) {
    await this.sessionStore?.flushPersist();
    const resolved = this.resolveSession(sessionId, session);
    if (!resolved) {
      runInAction(() => {
        this.pendingConnect = null;
        if (this.sessionStore) {
          this.sessionStore.error = 'Сессия не найдена в списке подключений.';
        }
      });
      return;
    }

    if (resolved.authType === 'password') {
      runInAction(() => {
        this.pendingConnect = { sessionId };
      });
      return;
    }

    await this.openTab(sessionId, undefined, resolved);
  }

  cancelPendingConnect() {
    this.pendingConnect = null;
  }

  async openTab(sessionId: string, password?: string, session?: SessionConfig) {
    await this.sessionStore?.flushPersist();
    const resolved = this.resolveSession(sessionId, session);
    if (!resolved) {
      runInAction(() => {
        this.pendingConnect = null;
        if (this.sessionStore) {
          this.sessionStore.error = 'Сессия не найдена в списке подключений.';
        }
      });
      return;
    }

    const tabId = crypto.randomUUID();
    const title = `${resolved.name} (${resolved.host})`;

    const tab: TerminalTab = {
      id: tabId,
      sessionId,
      title,
      status: 'connecting',
      connectStartedAt: performance.now(),
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
      const tabStillOpen = this.tabs.some((x) => x.id === tabId);
      if (!tabStillOpen) {
        void terminalIpc.terminalDisconnect(connectionId).catch((err) => {
          console.error('[TerminalStore] orphan disconnect failed:', err);
        });
        return;
      }
      runInAction(() => {
        const t = this.tabs.find((x) => x.id === tabId);
        if (t) {
          t.connectionId = connectionId;
        }
      });
    } catch (e) {
      const message = getIpcErrorMessage(e);

      if (shouldPromptPassphrase(resolved.authType, password, message)) {
        runInAction(() => {
          this.schedulePassphrasePrompt(sessionId, tabId);
        });
        return;
      }

      if (isSessionNotFoundError(message)) {
        await this.sessionStore?.load();
        runInAction(() => {
          this.tabs = this.tabs.filter((t) => t.id !== tabId);
          if (this.activeTabId === tabId) {
            this.activeTabId = this.tabs[this.tabs.length - 1]?.id ?? null;
          }
          this.pendingConnect = null;
          if (this.sessionStore) {
            this.sessionStore.error =
              'Сессия не найдена. Список сессий обновлён — попробуйте подключиться снова.';
          }
        });
        return;
      }

      runInAction(() => {
        const t = this.tabs.find((x) => x.id === tabId);
        if (t) {
          t.connectionId = undefined;
          t.status = 'error';
          t.errorMessage = message;
        }
      });
    }
  }

  async closeTabsForMissingSessions(validSessionIds: Set<string>) {
    const orphanTabIds = this.tabs
      .filter((tab) => !validSessionIds.has(tab.sessionId))
      .map((tab) => tab.id);

    for (const tabId of orphanTabIds) {
      await this.closeTab(tabId);
    }
  }

  closeTab(tabId: string) {
    const tab = this.tabs.find((t) => t.id === tabId);
    const connectionId = tab?.connectionId;

    runInAction(() => {
      this.tabs = this.tabs.filter((t) => t.id !== tabId);
      if (this.activeTabId === tabId) {
        this.activeTabId = this.tabs[this.tabs.length - 1]?.id ?? null;
      }
    });

    if (connectionId) {
      void terminalIpc.terminalDisconnect(connectionId).catch((e) => {
        console.error('[TerminalStore] disconnect failed:', e);
      });
    }
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
      if (payload.status === 'error' && payload.message) {
        const connectingTab =
          this.tabs.find(
            (t) =>
              !t.connectionId &&
              t.status === 'connecting' &&
              t.id === this.activeTabId,
          ) ??
          this.tabs.find((t) => !t.connectionId && t.status === 'connecting');

        if (connectingTab) {
          const session = this.resolveSession(connectingTab.sessionId);
          if (
            session &&
            shouldPromptPassphrase(session.authType, undefined, payload.message)
          ) {
            this.schedulePassphrasePrompt(
              connectingTab.sessionId,
              connectingTab.id,
            );
            return;
          }
        }
      }

      let tab = this.tabs.find(
        (t) => t.connectionId === payload.connectionId,
      );
      if (!tab && payload.status === 'connected') {
        tab = this.tabs.find(
          (t) => !t.connectionId && t.status === 'connecting',
        );
        if (tab) {
          tab.connectionId = payload.connectionId;
        }
      }
      if (!tab) return;

      if (payload.status === 'error' || payload.status === 'disconnected') {
        tab.connectionId = undefined;
      } else if (payload.status === 'connected') {
        tab.connectionId = payload.connectionId;
      }

      tab.status = payload.status;
      if (payload.message) {
        tab.errorMessage = payload.message;
      } else if (payload.status === 'connected') {
        tab.errorMessage = undefined;
        if (tab.connectStartedAt !== undefined) {
          tab.connectLatencyMs = Math.round(
            performance.now() - tab.connectStartedAt,
          );
        }
      }
    });
  }
}
