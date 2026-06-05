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

export const sessionsFileSchema = z.object({
  schemaVersion: z.literal(1),
  sessions: z.array(sessionSchema),
});

export type Protocol = z.infer<typeof protocolSchema>;
export type AuthType = z.infer<typeof authTypeSchema>;
export type SessionConfig = z.infer<typeof sessionSchema>;
export type SessionsFile = z.infer<typeof sessionsFileSchema>;

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
