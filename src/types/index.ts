export type SidebarTab = 'sessions' | 'files';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export {
  protocolSchema,
  authTypeSchema,
  sessionSchema,
  sessionFolderSchema,
  sessionsFileSchema,
  sessionsFileV2Schema,
  getDefaultPort,
  createEmptySession,
  createEmptyFolder,
  createEmptySessionsFile,
  migrateSessionsFile,
  prepareSessionForSave,
  translateSessionValidationMessage,
} from './session';

export type {
  Protocol,
  AuthType,
  SessionConfig,
  SessionFolder,
  SessionsFile,
  SessionsFileV2,
} from './session';

export {
  connectionStatusPayloadSchema,
  terminalOutputPayloadSchema,
} from './terminal';

export type {
  TerminalTab,
  ConnectionStatusPayload,
  TerminalOutputPayload,
} from './terminal';

export { sftpEntrySchema } from './sftp';

export type { SftpEntry } from './sftp';

export { appSettingsSchema, defaultAppSettings } from './settings';

export type { AppSettings } from './settings';
