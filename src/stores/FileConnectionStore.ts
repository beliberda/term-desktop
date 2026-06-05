import { makeAutoObservable, runInAction } from 'mobx';
import type { ConnectionStatus, ConnectionStatusPayload } from '@/types';
import * as ftpIpc from '@ipc/ftp';

export interface FtpConnectionState {
  connectionId: string;
  status: ConnectionStatus;
  errorMessage?: string;
  connectLatencyMs?: number;
}

export class FileConnectionStore {
  connections = new Map<string, FtpConnectionState>();
  activeSessionId: string | null = null;
  pendingConnect: { sessionId: string } | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  get activeConnection(): FtpConnectionState | null {
    if (!this.activeSessionId) return null;
    return this.connections.get(this.activeSessionId) ?? null;
  }

  requestConnect(sessionId: string) {
    this.pendingConnect = { sessionId };
  }

  cancelPendingConnect() {
    this.pendingConnect = null;
  }

  async connect(sessionId: string, password?: string) {
    this.activeSessionId = sessionId;
    this.pendingConnect = null;

    runInAction(() => {
      this.connections.set(sessionId, {
        connectionId: '',
        status: 'connecting',
      });
    });

    const startedAt = performance.now();

    try {
      const { connectionId } = await ftpIpc.ftpConnect(sessionId, password);
      runInAction(() => {
        this.connections.set(sessionId, {
          connectionId,
          status: 'connected',
          connectLatencyMs: Math.round(performance.now() - startedAt),
        });
      });
    } catch (e) {
      runInAction(() => {
        this.connections.set(sessionId, {
          connectionId: '',
          status: 'error',
          errorMessage:
            e instanceof Error ? e.message : 'Не удалось подключиться по FTP',
        });
      });
    }
  }

  handleConnectionStatus(payload: ConnectionStatusPayload) {
    for (const [sessionId, conn] of this.connections.entries()) {
      if (conn.connectionId === payload.connectionId) {
        runInAction(() => {
          this.connections.set(sessionId, {
            ...conn,
            status: payload.status,
            errorMessage: payload.message,
          });
        });
        return;
      }
    }
  }

  async disconnect(sessionId: string) {
    const conn = this.connections.get(sessionId);
    if (conn?.connectionId) {
      try {
        await ftpIpc.ftpDisconnect(conn.connectionId);
      } catch (e) {
        console.error('[FileConnectionStore] disconnect failed:', e);
      }
    }

    runInAction(() => {
      this.connections.delete(sessionId);
      if (this.activeSessionId === sessionId) {
        this.activeSessionId = null;
      }
    });
  }
}
