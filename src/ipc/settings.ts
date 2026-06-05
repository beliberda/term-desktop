import type { AppSettings } from '@/types';
import { safeInvoke } from './client';

export async function settingsLoad(): Promise<AppSettings> {
  return safeInvoke<AppSettings>('settings_load');
}

export async function settingsSave(settings: AppSettings): Promise<void> {
  await safeInvoke('settings_save', { settings });
}
