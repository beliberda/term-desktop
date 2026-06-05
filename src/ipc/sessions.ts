import {
  migrateSessionsFile,
  sessionsFileV2Schema,
  type SessionsFile,
} from '@/types';
import { safeInvoke } from './client';

export async function sessionsList(): Promise<SessionsFile> {
  const data = await safeInvoke<unknown>('sessions_list');
  return sessionsFileV2Schema.parse(migrateSessionsFile(data));
}

export async function sessionsSave(data: SessionsFile): Promise<void> {
  const validated = sessionsFileV2Schema.parse(data);
  await safeInvoke('sessions_save', { data: validated });
}

export async function sessionsExport(): Promise<void> {
  await safeInvoke('sessions_export');
}

export async function sessionsImport(): Promise<SessionsFile> {
  const data = await safeInvoke<unknown>('sessions_import');
  return sessionsFileV2Schema.parse(migrateSessionsFile(data));
}
