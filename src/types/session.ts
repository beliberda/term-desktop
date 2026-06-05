import { z } from 'zod';

export const protocolSchema = z.enum(['ssh', 'sftp', 'ftp']);
export const authTypeSchema = z.enum(['password', 'privateKey', 'agent']);

export const sessionSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1, 'Укажите название'),
    protocol: protocolSchema,
    host: z.string().min(1, 'Укажите host'),
    port: z.number().int().min(1).max(65535),
    username: z.string().min(1, 'Укажите username'),
    authType: authTypeSchema,
    privateKeyPath: z.string().optional(),
    defaultPath: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.authType === 'privateKey' && !data.privateKeyPath?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Укажите путь к ключу',
        path: ['privateKeyPath'],
      });
    }
  });

export const sessionFolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  parentId: z.string().uuid().nullable().optional(),
  collapsed: z.boolean().default(false),
  childOrder: z.array(z.string().uuid()).default([]),
});

export const sessionsFileV1Schema = z.object({
  schemaVersion: z.literal(1),
  sessions: z.array(sessionSchema),
});

export const sessionsFileV2Schema = z.object({
  schemaVersion: z.literal(2),
  rootOrder: z.array(z.string().uuid()),
  folders: z.array(sessionFolderSchema),
  sessions: z.array(sessionSchema),
});

export const sessionsFileSchema = z.union([
  sessionsFileV2Schema,
  sessionsFileV1Schema,
]);

export type Protocol = z.infer<typeof protocolSchema>;
export type AuthType = z.infer<typeof authTypeSchema>;
export type SessionConfig = z.infer<typeof sessionSchema>;
export type SessionFolder = z.infer<typeof sessionFolderSchema>;
export type SessionsFileV2 = z.infer<typeof sessionsFileV2Schema>;
export type SessionsFile = SessionsFileV2;

export function getDefaultPort(protocol: Protocol): number {
  return protocol === 'ftp' ? 21 : 22;
}

function newId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createEmptySession(): SessionConfig {
  const ts = nowIso();
  return {
    id: newId(),
    name: '',
    protocol: 'ssh',
    host: '',
    port: 22,
    username: '',
    authType: 'password',
    createdAt: ts,
    updatedAt: ts,
  };
}

export function createEmptyFolder(
  name = 'Новая папка',
  parentId: string | null = null,
): SessionFolder {
  return {
    id: newId(),
    name,
    parentId,
    collapsed: false,
    childOrder: [],
  };
}

export function createEmptySessionsFile(): SessionsFileV2 {
  return {
    schemaVersion: 2,
    rootOrder: [],
    folders: [],
    sessions: [],
  };
}

export function migrateSessionsFile(data: unknown): SessionsFileV2 {
  const v1 = sessionsFileV1Schema.safeParse(data);
  if (v1.success) {
    return {
      schemaVersion: 2,
      rootOrder: v1.data.sessions.map((s) => s.id),
      folders: [],
      sessions: v1.data.sessions,
    };
  }

  const v2 = sessionsFileV2Schema.safeParse(data);
  if (v2.success) {
    return v2.data;
  }

  throw new Error('Invalid sessions file format');
}

export function prepareSessionForSave(
  data: SessionConfig,
  isNew: boolean,
): SessionConfig {
  const ts = nowIso();
  return {
    ...data,
    port: data.port || getDefaultPort(data.protocol),
    createdAt: isNew ? ts : data.createdAt,
    updatedAt: ts,
    privateKeyPath:
      data.authType === 'privateKey' ? data.privateKeyPath?.trim() : undefined,
    defaultPath: data.defaultPath?.trim() || undefined,
  };
}
