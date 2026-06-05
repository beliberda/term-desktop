import { makeAutoObservable, runInAction } from 'mobx';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { ConnectionStatus, SftpEntry } from '@/types';
import * as sftpIpc from '@ipc/sftp';
import type { TerminalStore } from './TerminalStore';
import type { SessionStore } from './SessionStore';
import type { FileConnectionStore } from './FileConnectionStore';

function joinRemotePath(parent: string, name: string): string {
  const base = parent === '/' ? '' : parent.replace(/\/$/, '');
  const combined = `${base}/${name}`.replace(/\/+/g, '/');
  return combined.startsWith('/') ? combined : `/${combined}`;
}

function basename(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function joinLocalPath(dir: string, name: string): string {
  const separator = dir.includes('\\') ? '\\' : '/';
  const trimmed = dir.replace(/[/\\]+$/, '');
  return `${trimmed}${separator}${name}`;
}

export class FileBrowserStore {
  connectionId: string | null = null;
  sessionId: string | null = null;
  protocol: 'ssh' | 'sftp' | 'ftp' | null = null;
  cwd = '/';
  entries: SftpEntry[] = [];
  isLoading = false;
  error: string | null = null;
  selectedEntry: SftpEntry | null = null;
  private connectionStatus: ConnectionStatus | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  get breadcrumbs(): { label: string; path: string }[] {
    if (this.cwd === '/') {
      return [{ label: '/', path: '/' }];
    }

    const parts = this.cwd.split('/').filter(Boolean);
    const crumbs: { label: string; path: string }[] = [{ label: '/', path: '/' }];
    let acc = '';

    for (const part of parts) {
      acc += `/${part}`;
      crumbs.push({ label: part, path: acc });
    }

    return crumbs;
  }

  get canBrowse(): boolean {
    return this.connectionId !== null && this.connectionStatus === 'connected';
  }

  bind(
    terminalStore: TerminalStore,
    sessionStore: SessionStore,
    fileConnectionStore: FileConnectionStore,
  ) {
    const ftpConn = fileConnectionStore.activeConnection;
    if (
      fileConnectionStore.activeSessionId &&
      ftpConn &&
      (ftpConn.status === 'connected' || ftpConn.status === 'connecting')
    ) {
      this.bindFtp(fileConnectionStore.activeSessionId, ftpConn, sessionStore);
      return;
    }

    const activeTab = terminalStore.activeTab;
    if (!activeTab) {
      this.reset();
      return;
    }

    const session = sessionStore.sessions.find((s) => s.id === activeTab.sessionId);

    runInAction(() => {
      this.connectionStatus = activeTab.status;
      this.protocol = session?.protocol === 'ftp' ? 'ftp' : session?.protocol ?? 'ssh';
    });

    if (activeTab.status !== 'connected' || !activeTab.connectionId) {
      runInAction(() => {
        this.connectionId = activeTab.connectionId ?? null;
        this.sessionId = activeTab.sessionId;
        this.entries = [];
        this.selectedEntry = null;
        if (activeTab.status !== 'connecting') {
          this.error = null;
        }
      });
      return;
    }

    const rawDefault = session?.defaultPath?.trim();
    const defaultPath =
      rawDefault && rawDefault.length > 0
        ? rawDefault.startsWith('/')
          ? rawDefault
          : `/${rawDefault}`
        : '/';

    const connectionChanged =
      this.connectionId !== activeTab.connectionId ||
      this.sessionId !== activeTab.sessionId;

    runInAction(() => {
      this.connectionId = activeTab.connectionId!;
      this.sessionId = activeTab.sessionId;
      this.connectionStatus = activeTab.status;
      this.protocol = session?.protocol === 'sftp' ? 'sftp' : 'ssh';
      if (connectionChanged) {
        this.cwd = defaultPath;
        this.selectedEntry = null;
        this.error = null;
        this.entries = [];
      }
    });

    void this.loadDir();
  }

  private bindFtp(
    sessionId: string,
    ftpConn: NonNullable<FileConnectionStore['activeConnection']>,
    sessionStore: SessionStore,
  ) {
    const session = sessionStore.sessions.find((s) => s.id === sessionId);
    const rawDefault = session?.defaultPath?.trim();
    const defaultPath =
      rawDefault && rawDefault.length > 0
        ? rawDefault.startsWith('/')
          ? rawDefault
          : `/${rawDefault}`
        : '/';

    const connectionChanged =
      this.connectionId !== ftpConn.connectionId ||
      this.sessionId !== sessionId;

    runInAction(() => {
      this.sessionId = sessionId;
      this.protocol = 'ftp';
      this.connectionStatus = ftpConn.status;
      this.connectionId = ftpConn.connectionId || null;
      if (connectionChanged) {
        this.cwd = defaultPath;
        this.selectedEntry = null;
        this.error = ftpConn.errorMessage ?? null;
        this.entries = [];
      }
    });

    if (ftpConn.status === 'connected' && ftpConn.connectionId) {
      void this.loadDir();
    }
  }

  async loadDir(path?: string) {
    if (!this.connectionId) return;

    const target = path ?? this.cwd;

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const entries = await sftpIpc.sftpListDir(this.connectionId, target);
      runInAction(() => {
        this.cwd = target;
        this.entries = entries;
        this.isLoading = false;
      });
    } catch (e) {
      runInAction(() => {
        this.error =
          e instanceof Error ? e.message : 'Не удалось загрузить каталог';
        this.isLoading = false;
      });
    }
  }

  navigateTo(path: string) {
    void this.loadDir(path);
  }

  navigateUp() {
    if (this.cwd === '/') return;

    const parts = this.cwd.split('/').filter(Boolean);
    parts.pop();
    const parent = parts.length === 0 ? '/' : `/${parts.join('/')}`;
    void this.loadDir(parent);
  }

  refresh() {
    if (!this.canBrowse) return;
    void this.loadDir(this.cwd);
  }

  selectEntry(entry: SftpEntry | null) {
    this.selectedEntry = entry;
  }

  async upload() {
    if (!this.connectionId) return;

    const selected = await open({ multiple: false });
    if (!selected || Array.isArray(selected)) return;

    const remotePath = joinRemotePath(this.cwd, basename(selected));

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      await sftpIpc.sftpUpload(this.connectionId, selected, remotePath);
      await this.loadDir(this.cwd);
    } catch (e) {
      runInAction(() => {
        this.error =
          e instanceof Error ? e.message : 'Не удалось загрузить файл';
        this.isLoading = false;
      });
    }
  }

  async download(entry: SftpEntry) {
    if (!this.connectionId) return;

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      if (entry.isDirectory) {
        const localDir = await open({ directory: true });
        if (!localDir || Array.isArray(localDir)) {
          runInAction(() => {
            this.isLoading = false;
          });
          return;
        }

        const destPath = joinLocalPath(localDir, entry.name);
        await sftpIpc.sftpDownload(
          this.connectionId,
          entry.path,
          destPath,
          true,
        );
      } else {
        const localPath = await save({ defaultPath: entry.name });
        if (!localPath) {
          runInAction(() => {
            this.isLoading = false;
          });
          return;
        }

        await sftpIpc.sftpDownload(
          this.connectionId,
          entry.path,
          localPath,
          false,
        );
      }

      runInAction(() => {
        this.isLoading = false;
      });
    } catch (e) {
      runInAction(() => {
        this.error =
          e instanceof Error ? e.message : 'Не удалось скачать';
        this.isLoading = false;
      });
    }
  }

  async mkdir(name: string) {
    if (!this.connectionId || !name.trim()) return;

    const remotePath = joinRemotePath(this.cwd, name.trim());

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      await sftpIpc.sftpMkdir(this.connectionId, remotePath);
      await this.loadDir(this.cwd);
    } catch (e) {
      runInAction(() => {
        this.error =
          e instanceof Error ? e.message : 'Не удалось создать папку';
        this.isLoading = false;
      });
    }
  }

  reset() {
    this.connectionId = null;
    this.sessionId = null;
    this.protocol = null;
    this.connectionStatus = null;
    this.cwd = '/';
    this.entries = [];
    this.isLoading = false;
    this.error = null;
    this.selectedEntry = null;
  }
}
