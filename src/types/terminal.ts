import { z } from 'zod';
import type { ConnectionStatus } from './index';

export const connectionStatusPayloadSchema = z.object({
  connectionId: z.string(),
  status: z.enum(['connecting', 'connected', 'disconnected', 'error']),
  message: z.string().optional(),
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
  errorMessage?: string;
  connectStartedAt?: number;
  connectLatencyMs?: number;
  reconnecting?: boolean;
}

export type ConnectionStatusPayload = z.infer<typeof connectionStatusPayloadSchema>;
export type TerminalOutputPayload = z.infer<typeof terminalOutputPayloadSchema>;
