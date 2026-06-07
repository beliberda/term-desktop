import { open, save } from '@tauri-apps/plugin-dialog';
import { makeAutoObservable, runInAction } from 'mobx';
import {
  createEmptyFolder,
  createEmptySession,
  prepareSessionForSave,
  sessionSchema,
  type SessionConfig,
  type SessionFolder,
  type SessionsFile,
} from '@/types';
import type { AppError } from '@i18n/types';
import { i18n } from '@i18n/index';
import { getIpcErrorPayload } from '@ipc/client';
import * as sessionsIpc from '@ipc/sessions';
import type { TerminalStore } from './TerminalStore';
import {
  canMoveIntoFolder,
  deleteFolderFromTree,
  findParentId,
  getChildOrder,
  getTreeNodes,
  insertIntoParent,
  isFolderId,
  removeFromTree,
  toSessionsFile,
  type TreeNode,
} from '@utils/sessionTree';

const PERSIST_DEBOUNCE_MS = 250;

export class SessionStore {
  sessions: SessionConfig[] = [];
  folders: SessionFolder[] = [];
  rootOrder: string[] = [];
  selectedId: string | null = null;
  isLoading = false;
  error: AppError | null = null;
  isFormOpen = false;
  editingSession: SessionConfig | null = null;
  formErrors: Record<string, string> = {};

  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private terminalStore: TerminalStore | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setTerminalStore(terminalStore: TerminalStore) {
    this.terminalStore = terminalStore;
  }

  get hasItems(): boolean {
    return this.sessions.length > 0 || this.folders.length > 0;
  }

  getSessionById(id: string): SessionConfig | undefined {
    return this.sessions.find((session) => session.id === id);
  }

  async updateSessionPolicy(sessionId: string, policy: SessionConfig['fileConflictPolicy']) {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session || !policy) return;
    runInAction(() => {
      session.fileConflictPolicy = policy;
    });
    this.schedulePersist();
    await this.flushPersist();
  }

  getFolderById(id: string): SessionFolder | undefined {
    return this.folders.find((folder) => folder.id === id);
  }

  getChildren(parentId: string | null): TreeNode[] {
    return getTreeNodes(this.toFile(), parentId);
  }

  getParentId(itemId: string): string | null {
    return findParentId(this.toFile(), itemId);
  }

  isInRoot(itemId: string): boolean {
    return this.rootOrder.includes(itemId);
  }

  toFile(): SessionsFile {
    return toSessionsFile(this.rootOrder, this.folders, this.sessions);
  }

  private applyFile(file: SessionsFile) {
    this.rootOrder = file.rootOrder;
    this.folders = file.folders;
    this.sessions = file.sessions;
  }

  private schedulePersist() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.persist();
    }, PERSIST_DEBOUNCE_MS);
  }

  async flushPersist() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
      await this.persist();
    }
  }

  clearPendingConnectForSession(sessionId: string) {
    const pending = this.terminalStore?.pendingConnect;
    if (pending?.sessionId === sessionId) {
      this.terminalStore?.cancelPendingConnect();
    }
  }

  private async persist() {
    const file = this.toFile();
    try {
      await sessionsIpc.sessionsSave(file);
      runInAction(() => {
        this.error = null;
      });
    } catch (e) {
      runInAction(() => {
        this.error = getIpcErrorPayload(e);
        if (this.error.code === 'unknown') {
          this.error = { code: 'session.saveFailed' };
        }
      });
    }
  }

  async load() {
    this.isLoading = true;
    this.error = null;
    try {
      const data = await sessionsIpc.sessionsList();
      runInAction(() => {
        this.applyFile(data);
        this.isLoading = false;
      });
    } catch (e) {
      runInAction(() => {
        this.error = getIpcErrorPayload(e);
        if (this.error.code === 'unknown') {
          this.error = { code: 'session.loadFailed' };
        }
        this.isLoading = false;
      });
    }
  }

  openCreateForm() {
    this.editingSession = createEmptySession();
    this.isFormOpen = true;
    this.formErrors = {};
    this.error = null;
  }

  selectSession(id: string) {
    this.selectedId = id;
  }

  openEditForm(id: string) {
    const session = this.getSessionById(id);
    if (!session) return;
    this.editingSession = { ...session };
    this.selectedId = id;
    this.isFormOpen = true;
    this.formErrors = {};
    this.error = null;
  }

  closeForm() {
    this.isFormOpen = false;
    this.editingSession = null;
    this.formErrors = {};
  }

  async createFolder(parentId: string | null = null) {
    const folder = createEmptyFolder();
    folder.parentId = parentId;

    let file = this.toFile();
    file = {
      ...file,
      folders: [...file.folders, folder],
    };
    file = insertIntoParent(file, folder.id, parentId, getChildOrder(file, parentId).length);

    runInAction(() => {
      this.applyFile(file);
    });
    this.schedulePersist();
  }

  renameFolder(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    runInAction(() => {
      this.folders = this.folders.map((folder) =>
        folder.id === id ? { ...folder, name: trimmed } : folder,
      );
    });
    this.schedulePersist();
  }

  deleteFolder(id: string) {
    const file = deleteFolderFromTree(this.toFile(), id);
    runInAction(() => {
      this.applyFile(file);
    });
    this.schedulePersist();
  }

  toggleFolderCollapsed(id: string) {
    runInAction(() => {
      this.folders = this.folders.map((folder) =>
        folder.id === id ? { ...folder, collapsed: !folder.collapsed } : folder,
      );
    });
    this.schedulePersist();
  }

  moveItem(itemId: string, targetParentId: string | null, index: number) {
    if (
      isFolderId(this.toFile(), itemId) &&
      targetParentId &&
      !canMoveIntoFolder(this.toFile(), itemId, targetParentId)
    ) {
      return;
    }

    const file = insertIntoParent(this.toFile(), itemId, targetParentId, index);
    runInAction(() => {
      this.applyFile(file);
    });
    this.schedulePersist();
  }

  reorderInParent(parentId: string | null, activeId: string, overId: string) {
    const order = [...getChildOrder(this.toFile(), parentId)];
    const oldIndex = order.indexOf(activeId);
    const newIndex = order.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
      return;
    }

    order.splice(oldIndex, 1);
    order.splice(newIndex, 0, activeId);

    let file = this.toFile();
    if (parentId === null) {
      file = { ...file, rootOrder: order };
    } else {
      file = {
        ...file,
        folders: file.folders.map((folder) =>
          folder.id === parentId ? { ...folder, childOrder: order } : folder,
        ),
      };
    }

    runInAction(() => {
      this.applyFile(file);
    });
    this.schedulePersist();
  }

  ungroupSession(sessionId: string) {
    this.ungroupItem(sessionId);
  }

  ungroupFolder(folderId: string) {
    this.ungroupItem(folderId);
  }

  ungroupItem(itemId: string) {
    const parentId = this.getParentId(itemId);
    if (parentId === null) {
      return;
    }

    const file = insertIntoParent(
      this.toFile(),
      itemId,
      null,
      this.rootOrder.length,
    );
    runInAction(() => {
      this.applyFile(file);
    });
    this.schedulePersist();
  }

  async duplicateSession(id: string) {
    const source = this.getSessionById(id);
    if (!source) return;

    const copy = prepareSessionForSave(
      {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} ${i18n.t('session.copySuffix')}`,
      },
      true,
    );

    let file = this.toFile();
    file = {
      ...file,
      sessions: [...file.sessions, copy],
    };
    const parentId = findParentId(file, id);
    const index = getChildOrder(file, parentId).length;
    file = insertIntoParent(file, copy.id, parentId, index);

    try {
      await sessionsIpc.sessionsSave(file);
      runInAction(() => {
        this.applyFile(file);
        this.selectedId = copy.id;
        this.error = null;
      });
    } catch (e) {
      runInAction(() => {
        this.error = getIpcErrorPayload(e);
        if (this.error.code === 'unknown') {
          this.error = { code: 'session.duplicateFailed' };
        }
      });
    }
  }

  async saveForm(data: SessionConfig) {
    const isNew = !this.sessions.some((s) => s.id === data.id);
    const prepared = prepareSessionForSave(data, isNew);
    const result = sessionSchema.safeParse(prepared);

    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString() ?? 'form';
        errors[key] = issue.message;
      }
      this.formErrors = errors;
      return;
    }

    this.formErrors = {};

    let file = this.toFile();
    if (isNew) {
      file = {
        ...file,
        sessions: [...file.sessions, result.data],
      };
      file = insertIntoParent(file, result.data.id, null, file.rootOrder.length);
    } else {
      file = {
        ...file,
        sessions: file.sessions.map((session) =>
          session.id === result.data.id ? result.data : session,
        ),
      };
    }

    try {
      await sessionsIpc.sessionsSave(file);
      runInAction(() => {
        this.applyFile(file);
        this.isFormOpen = false;
        this.editingSession = null;
        this.error = null;
      });
    } catch (e) {
      runInAction(() => {
        this.error = getIpcErrorPayload(e);
        if (this.error.code === 'unknown') {
          this.error = { code: 'session.saveFormFailed' };
        }
      });
    }
  }

  async deleteSession(id: string) {
    let file = this.toFile();
    file = removeFromTree(file, id);
    file = {
      ...file,
      sessions: file.sessions.filter((session) => session.id !== id),
    };

    try {
      await sessionsIpc.sessionsSave(file);
      runInAction(() => {
        this.applyFile(file);
        if (this.selectedId === id) {
          this.selectedId = null;
        }
        this.error = null;
      });
      this.clearPendingConnectForSession(id);
      await this.terminalStore?.closeTabsForMissingSessions(
        new Set(file.sessions.map((s) => s.id)),
      );
    } catch (e) {
      runInAction(() => {
        this.error = getIpcErrorPayload(e);
        if (this.error.code === 'unknown') {
          this.error = { code: 'session.deleteFailed' };
        }
      });
    }
  }

  async exportSessions() {
    try {
      const path = await save({
        defaultPath: 'sessions.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!path) return;

      await sessionsIpc.sessionsExportToPath(path);
      this.error = null;
    } catch (e) {
      this.error = getIpcErrorPayload(e);
      if (this.error.code === 'unknown') {
        this.error = { code: 'session.exportFailed' };
      }
    }
  }

  async downloadImportExample() {
    try {
      const path = await save({
        defaultPath: 'sessions-import-example.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!path) return;

      await sessionsIpc.sessionsWriteExampleAtPath(path);
      this.error = null;
    } catch (e) {
      this.error = getIpcErrorPayload(e);
      if (this.error.code === 'unknown') {
        this.error = { code: 'session.importExampleFailed' };
      }
    }
  }

  async importSessions() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!selected || Array.isArray(selected)) return;

      const result = await sessionsIpc.sessionsImportFromPath(selected);
      const validSessionIds = new Set(result.file.sessions.map((s) => s.id));

      runInAction(() => {
        this.applyFile(result.file);

        if (result.imported === 0 && result.skipped === 0) {
          this.error = null;
        } else if (result.imported === 0) {
          this.error = {
            code: 'session.importNone',
            details: { skipped: result.skipped },
          };
        } else if (result.skipped > 0) {
          this.error = {
            code: 'session.importPartial',
            details: { imported: result.imported, skipped: result.skipped },
          };
        } else {
          this.error = null;
        }
      });

      await this.terminalStore?.closeTabsForMissingSessions(validSessionIds);
      this.terminalStore?.clearStalePendingConnect(validSessionIds);
    } catch (e) {
      runInAction(() => {
        this.error = getIpcErrorPayload(e);
        if (this.error.code === 'unknown') {
          this.error = { code: 'session.importFailed' };
        }
      });
    }
  }
}
