import { makeAutoObservable, runInAction } from 'mobx';
import {
  appSettingsSchema,
  defaultAppSettings,
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
  type AppSettings,
} from '@/types/settings';
import * as settingsIpc from '@ipc/settings';

export class SettingsStore {
  settings: AppSettings = { ...defaultAppSettings };
  isLoading = false;
  isFormOpen = false;
  error: string | null = null;

  private saveSidebarTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  async load() {
    this.isLoading = true;
    try {
      const data = await settingsIpc.settingsLoad();
      const parsed = appSettingsSchema.safeParse(data);
      runInAction(() => {
        this.settings = parsed.success
          ? { ...defaultAppSettings, ...parsed.data }
          : { ...defaultAppSettings };
        this.isLoading = false;
        this.applyTheme();
        this.applySidebarWidth();
      });
    } catch (e) {
      runInAction(() => {
        this.settings = { ...defaultAppSettings };
        this.isLoading = false;
        this.applyTheme();
        this.applySidebarWidth();
      });
      console.error('[SettingsStore] load failed:', e);
    }
  }

  openForm() {
    this.isFormOpen = true;
    this.error = null;
  }

  closeForm() {
    this.isFormOpen = false;
    this.error = null;
  }

  async save(next: AppSettings) {
    const parsed = appSettingsSchema.safeParse(next);
    if (!parsed.success) {
      this.error = 'Некорректные настройки';
      return;
    }

    try {
      await settingsIpc.settingsSave(parsed.data);
      runInAction(() => {
        this.settings = parsed.data;
        this.isFormOpen = false;
        this.error = null;
        this.applyTheme();
        this.applySidebarWidth();
      });
    } catch (e) {
      runInAction(() => {
        this.error =
          e instanceof Error ? e.message : 'Не удалось сохранить настройки';
      });
    }
  }

  applyTheme() {
    document.documentElement.dataset.theme = this.settings.theme;
  }

  applySidebarWidth() {
    const width = this.settings.sidebarWidth ?? SIDEBAR_WIDTH_DEFAULT;
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
  }

  setSidebarWidth(width: number) {
    const clamped = Math.min(
      SIDEBAR_WIDTH_MAX,
      Math.max(SIDEBAR_WIDTH_MIN, Math.round(width)),
    );
    this.settings = { ...this.settings, sidebarWidth: clamped };
    this.applySidebarWidth();
  }

  async saveSidebarWidth() {
    if (this.saveSidebarTimer) {
      clearTimeout(this.saveSidebarTimer);
    }

    this.saveSidebarTimer = setTimeout(() => {
      this.saveSidebarTimer = null;
      void this.save(this.settings);
    }, 300);
  }
}
