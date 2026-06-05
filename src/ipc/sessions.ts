import {
  sessionSchema,
  sessionsFileSchema,
  type SessionConfig,
  type SessionsFile,
} from '@/types';
import { safeInvoke } from './client';

export async function sessionsList(): Promise<SessionsFile> {
  const data = await safeInvoke<unknown>('sessions_list');
  return sessionsFileSchema.parse(data);
}

export async function sessionsSave(sessions: SessionConfig[]): Promise<void> {
  const validated = sessions.map((s) => sessionSchema.parse(s));
  await safeInvoke('sessions_save', { sessions: validated });
}

export async function sessionsExport(): Promise<void> {
  await safeInvoke('sessions_export');
}

export async function sessionsImport(): Promise<SessionConfig[]> {
  const data = await safeInvoke<unknown>('sessions_import');
  return sessionSchema.array().parse(data);
}
