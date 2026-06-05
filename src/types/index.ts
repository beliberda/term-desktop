export type SidebarTab = 'sessions' | 'sftp';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export {
  protocolSchema,
  authTypeSchema,
  sessionSchema,
  sessionsFileSchema,
  getDefaultPort,
  createEmptySession,
  prepareSessionForSave,
} from './session';

export type {
  Protocol,
  AuthType,
  SessionConfig,
  SessionsFile,
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
