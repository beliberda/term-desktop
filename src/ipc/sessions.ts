import {
  migrateSessionsFile,
  sessionsFileV2Schema,
  type SessionsFile,
} from '@/types';
import { z } from 'zod';
import { safeInvoke } from './client';

export type SessionsImportResult = {
  file: SessionsFile;
  imported: number;
  skipped: number;
};

const sessionsImportResultSchema = z.object({
  file: sessionsFileV2Schema,
  imported: z.number(),
  skipped: z.number(),
});

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

export async function sessionsDownloadExample(): Promise<void> {
  await safeInvoke('sessions_download_example');
}

export async function sessionsImport(): Promise<SessionsImportResult> {
  const data = await safeInvoke<unknown>('sessions_import');
  const raw = data as {
    file: unknown;
    imported: number;
    skipped: number;
  };
  return sessionsImportResultSchema.parse({
    file: migrateSessionsFile(raw.file),
    imported: raw.imported,
    skipped: raw.skipped,
  });
}
