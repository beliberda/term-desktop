import { z } from 'zod';
import type { AppError } from '@i18n/types';
import type { ConnectionStatus } from './index';

export const ipcErrorSchema = z.object({
  code: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const connectionStatusPayloadSchema = z.object({
  connectionId: z.string(),
  status: z.enum(['connecting', 'connected', 'disconnected', 'error']),
  error: ipcErrorSchema.optional(),
});

export const terminalOutputPayloadSchema = z.object({
  connectionId: z.string(),
  data: z.string(),
});

export interface TerminalTab {
  id: string;
  sessionId: string;
  connectionId?: string;
  title: string;
  status: ConnectionStatus;
  error?: AppError;
  connectStartedAt?: number;
  connectLatencyMs?: number;
  reconnecting?: boolean;
}

export type ConnectionStatusPayload = z.infer<typeof connectionStatusPayloadSchema>;
export type TerminalOutputPayload = z.infer<typeof terminalOutputPayloadSchema>;
