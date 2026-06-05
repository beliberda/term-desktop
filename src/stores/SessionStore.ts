import { makeAutoObservable, runInAction } from 'mobx';
import {
  createEmptySession,
  prepareSessionForSave,
  sessionSchema,
  type SessionConfig,
} from '@/types';
import * as sessionsIpc from '@ipc/sessions';

export class SessionStore {
  sessions: SessionConfig[] = [];
  selectedId: string | null = null;
  isLoading = false;
  error: string | null = null;
  isFormOpen = false;
  editingSession: SessionConfig | null = null;
  formErrors: Record<string, string> = {};

  constructor() {
    makeAutoObservable(this);
  }

  async load() {
    this.isLoading = true;
    this.error = null;
    try {
      const data = await sessionsIpc.sessionsList();
      runInAction(() => {
        this.sessions = data.sessions;
        this.isLoading = false;
      });
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Не удалось загрузить сессии';
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

  openEditForm(id: string) {
    const session = this.sessions.find((s) => s.id === id);
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
    const next = isNew
      ? [...this.sessions, result.data]
      : this.sessions.map((s) => (s.id === result.data.id ? result.data : s));

    try {
      await sessionsIpc.sessionsSave(next);
      runInAction(() => {
        this.sessions = next;
        this.isFormOpen = false;
        this.editingSession = null;
        this.error = null;
      });
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Не удалось сохранить сессию';
      });
    }
  }

  async deleteSession(id: string) {
    const next = this.sessions.filter((s) => s.id !== id);
    try {
      await sessionsIpc.sessionsSave(next);
      runInAction(() => {
        this.sessions = next;
        if (this.selectedId === id) {
          this.selectedId = null;
        }
        this.error = null;
      });
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Не удалось удалить сессию';
      });
    }
  }

  async exportSessions() {
    try {
      await sessionsIpc.sessionsExport();
      this.error = null;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Не удалось экспортировать сессии';
    }
  }

  async importSessions() {
    try {
      const merged = await sessionsIpc.sessionsImport();
      runInAction(() => {
        this.sessions = merged;
        this.error = null;
      });
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Не удалось импортировать сессии';
      });
    }
  }
}
