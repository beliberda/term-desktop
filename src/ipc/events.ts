import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import {
  connectionStatusPayloadSchema,
  terminalOutputPayloadSchema,
  type ConnectionStatusPayload,
  type TerminalOutputPayload,
} from '@/types';

export async function listenConnectionStatus(
  handler: (payload: ConnectionStatusPayload) => void,
): Promise<UnlistenFn> {
  return listen<unknown>('connection-status', (event) => {
    const parsed = connectionStatusPayloadSchema.safeParse(event.payload);
    if (parsed.success) {
      handler(parsed.data);
    }
  });
}

export async function listenTerminalOutput(
  handler: (payload: TerminalOutputPayload) => void,
): Promise<UnlistenFn> {
  return listen<unknown>('terminal-output', (event) => {
    const parsed = terminalOutputPayloadSchema.safeParse(event.payload);
    if (parsed.success) {
      handler(parsed.data);
    }
  });
}
