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

export async function sessionsExportToPath(path: string): Promise<void> {
  await safeInvoke('sessions_export_to_path', { path });
}

export async function sessionsWriteExampleAtPath(path: string): Promise<void> {
  await safeInvoke('sessions_write_example_at_path', { path });
}

export async function sessionsImportFromPath(
  path: string,
): Promise<SessionsImportResult> {
  const data = await safeInvoke<unknown>('sessions_import_from_path', { path });
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
