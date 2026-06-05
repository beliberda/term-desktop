import { makeAutoObservable, runInAction } from 'mobx';
import {
  appSettingsSchema,
  defaultAppSettings,
  type AppSettings,
} from '@/types/settings';
import * as settingsIpc from '@ipc/settings';

export class SettingsStore {
  settings: AppSettings = { ...defaultAppSettings };
  isLoading = false;
  isFormOpen = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  async load() {
    this.isLoading = true;
    try {
      const data = await settingsIpc.settingsLoad();
      const parsed = appSettingsSchema.safeParse(data);
      runInAction(() => {
        this.settings = parsed.success ? parsed.data : { ...defaultAppSettings };
        this.isLoading = false;
        this.applyTheme();
      });
    } catch (e) {
      runInAction(() => {
        this.settings = { ...defaultAppSettings };
        this.isLoading = false;
        this.applyTheme();
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
}
