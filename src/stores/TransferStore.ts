import { makeAutoObservable, runInAction } from 'mobx';
import type { FileConflictPolicy, SessionConfig } from '@/types';
import type {
  FileConflictInfo,
  TransferProgressPayload,
  TransferTask,
} from '@/types/transfer';
import * as localIpc from '@ipc/local';
import * as sftpIpc from '@ipc/sftp';
import { listenTransferProgress } from '@ipc/events';
import { basename, joinLocalPath, joinRemotePath } from '@utils/filePaths';
import type { LocalBrowserStore } from './LocalBrowserStore';
import type { RemoteBrowserStore } from './RemoteBrowserStore';
import type { SessionStore } from './SessionStore';
import type { SettingsStore } from './SettingsStore';

export class TransferStore {
  tasks: TransferTask[] = [];
  queueExpanded = true;
  processing = false;
  pendingConflict: FileConflictInfo | null = null;
  private conflictResolve: ((value: 'skip' | 'replace') => void) | null = null;
  private sessionOverridePolicy: FileConflictPolicy | null = null;
  private listenersInitialized = false;
  private unlistenFns: Array<() => void> = [];
  private localBrowserStore: LocalBrowserStore | null = null;
  private remoteBrowserStore: RemoteBrowserStore | null = null;
  private sessionStore: SessionStore | null = null;
  private settingsStore: SettingsStore | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  wire(
    localBrowserStore: LocalBrowserStore,
    remoteBrowserStore: RemoteBrowserStore,
    sessionStore: SessionStore,
    settingsStore: SettingsStore,
  ) {
    this.localBrowserStore = localBrowserStore;
    this.remoteBrowserStore = remoteBrowserStore;
    this.sessionStore = sessionStore;
    this.settingsStore = settingsStore;
  }

  async initListeners() {
    if (this.listenersInitialized) return;
    this.listenersInitialized = true;
    const unlisten = await listenTransferProgress((payload) => {
      this.handleProgress(payload);
    });
    this.unlistenFns.push(unlisten);
  }

  get activeCount(): number {
    return this.tasks.filter(
      (t) => t.status === 'running' || t.status === 'queued',
    ).length;
  }

  get hasActiveTransfers(): boolean {
    return this.activeCount > 0;
  }

  setQueueExpanded(value: boolean) {
    this.queueExpanded = value;
  }

  resolveConflict(action: 'skip' | 'replace' | 'replaceAll', remember?: boolean) {
    if (remember && this.remoteBrowserStore?.sessionId) {
      const policy: FileConflictPolicy =
        action === 'skip'
          ? 'replaceIfDifferentSizeOrNewer'
          : 'alwaysReplace';
      void this.sessionStore?.updateSessionPolicy(
        this.remoteBrowserStore.sessionId,
        policy,
      );
      this.sessionOverridePolicy = policy;
    }
    const result: 'skip' | 'replace' =
      action === 'skip' ? 'skip' : 'replace';
    this.pendingConflict = null;
    this.conflictResolve?.(result);
    this.conflictResolve = null;
  }

  cancelConflict() {
    this.pendingConflict = null;
    this.conflictResolve?.('skip');
    this.conflictResolve = null;
  }

  enqueueUpload(
    localPaths: string[],
    remoteDir: string,
    connectionId: string,
  ) {
    for (const localPath of localPaths) {
      const name = basename(localPath);
      const task: TransferTask = {
        id: crypto.randomUUID(),
        connectionId,
        fileName: name,
        direction: 'upload',
        localPath,
        remotePath: joinRemotePath(remoteDir, name),
        isDirectory: false,
        status: 'queued',
        bytesDone: 0,
        bytesTotal: 0,
      };
      this.tasks.push(task);
    }
    void this.processQueue();
  }

  enqueueDownload(
    entries: { path: string; name: string; isDirectory: boolean; size: number; modifiedAt?: string }[],
    localDir: string,
    connectionId: string,
    session?: SessionConfig | null,
  ) {
    for (const entry of entries) {
      const task: TransferTask = {
        id: crypto.randomUUID(),
        connectionId,
        fileName: entry.name,
        direction: 'download',
        localPath: joinLocalPath(localDir, entry.name),
        remotePath: entry.path,
        isDirectory: entry.isDirectory,
        status: 'queued',
        bytesDone: 0,
        bytesTotal: entry.size,
      };
      this.tasks.push(task);
    }
    void this.processQueueWithConflicts(session ?? null);
  }

  uploadSelected() {
    const remote = this.remoteBrowserStore;
    const local = this.localBrowserStore;
    if (!remote?.connectionId || !local) return;
    const selected = local.selectedEntries;
    if (selected.length === 0) return;
    this.enqueueUpload(
      selected.map((e) => e.path),
      remote.cwd,
      remote.connectionId,
    );
  }

  downloadSelected() {
    const remote = this.remoteBrowserStore;
    const local = this.localBrowserStore;
    if (!remote?.connectionId || !local?.cwd) return;
    const selected = remote.selectedEntries;
    if (selected.length === 0) return;
    this.enqueueDownload(
      selected.map((e) => ({
        path: e.path,
        name: e.name,
        isDirectory: e.isDirectory,
        size: e.size,
        modifiedAt: e.modifiedAt,
      })),
      local.cwd,
      remote.connectionId,
      remote.session,
    );
  }

  clearCompleted() {
    this.tasks = this.tasks.filter(
      (t) => t.status !== 'done' && t.status !== 'skipped' && t.status !== 'cancelled',
    );
  }

  private handleProgress(payload: TransferProgressPayload) {
    const task = this.tasks.find((t) => t.id === payload.transferId);
    if (!task) return;
    runInAction(() => {
      task.bytesDone = payload.bytesDone;
      task.bytesTotal = payload.bytesTotal;
      if (payload.status === 'running') task.status = 'running';
      if (payload.status === 'done') task.status = 'done';
      if (payload.status === 'error') task.status = 'error';
    });
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;
    try {
      let task = this.tasks.find((t) => t.status === 'queued');
      while (task) {
        await this.runTask(task);
        task = this.tasks.find((t) => t.status === 'queued');
      }
    } finally {
      this.processing = false;
      this.remoteBrowserStore?.refresh();
      this.localBrowserStore?.refresh();
    }
  }

  private async processQueueWithConflicts(session: SessionConfig | null) {
    if (this.processing) return;
    this.processing = true;
    try {
      let task = this.tasks.find((t) => t.status === 'queued');
      while (task) {
        if (task.direction === 'download' && !task.isDirectory) {
          const action = await this.checkConflict(task, session);
          if (action === 'skip') {
            runInAction(() => {
              task!.status = 'skipped';
            });
            task = this.tasks.find((t) => t.status === 'queued');
            continue;
          }
        }
        await this.runTask(task);
        task = this.tasks.find((t) => t.status === 'queued');
      }
    } finally {
      this.processing = false;
      this.remoteBrowserStore?.refresh();
      this.localBrowserStore?.refresh();
    }
  }

  private getEffectivePolicy(session: SessionConfig | null): FileConflictPolicy {
    if (this.sessionOverridePolicy) return this.sessionOverridePolicy;
    if (session?.fileConflictPolicy) return session.fileConflictPolicy;
    return this.settingsStore?.settings.defaultFileConflictPolicy ?? 'ask';
  }

  private async checkConflict(
    task: TransferTask,
    session: SessionConfig | null,
  ): Promise<'skip' | 'replace'> {
    const localStat = await localIpc.localStat(task.localPath);
    if (!localStat.exists || localStat.isDirectory) return 'replace';

    const policy = this.getEffectivePolicy(session);
    if (policy === 'alwaysReplace') return 'replace';
    if (policy === 'replaceIfDifferentSize') {
      return localStat.size !== task.bytesTotal ? 'replace' : 'skip';
    }
    if (policy === 'replaceIfDifferentSizeOrNewer') {
      if (localStat.size !== task.bytesTotal) return 'replace';
      if (task.bytesTotal === 0) return 'skip';
      const localTime = localStat.modifiedAt
        ? new Date(localStat.modifiedAt).getTime()
        : 0;
      const remoteTime = 0;
      return remoteTime > localTime ? 'replace' : 'skip';
    }

    return new Promise<'skip' | 'replace'>((resolve) => {
      runInAction(() => {
        this.pendingConflict = {
          fileName: task.fileName,
          localPath: task.localPath,
          remotePath: task.remotePath,
          localSize: localStat.size,
          remoteSize: task.bytesTotal,
          localModifiedAt: localStat.modifiedAt,
        };
      });
      this.conflictResolve = resolve;
    });
  }

  private async runTask(task: TransferTask) {
    runInAction(() => {
      task.status = 'running';
    });
    try {
      if (task.direction === 'upload') {
        await sftpIpc.sftpUpload(
          task.connectionId,
          task.localPath,
          task.remotePath,
          task.id,
        );
      } else {
        await sftpIpc.sftpDownload(
          task.connectionId,
          task.remotePath,
          task.localPath,
          task.isDirectory,
          task.id,
        );
      }
      runInAction(() => {
        if (task.status === 'running') task.status = 'done';
      });
    } catch (e) {
      runInAction(() => {
        task.status = 'error';
        task.error = e instanceof Error ? e.message : String(e);
      });
    }
  }
}
