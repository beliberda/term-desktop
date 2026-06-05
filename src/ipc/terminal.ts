import { safeInvoke } from './client';

export interface ConnectResponse {
  connectionId: string;
}

export async function terminalConnect(
  sessionId: string,
  password?: string,
): Promise<ConnectResponse> {
  return safeInvoke<ConnectResponse>('terminal_connect', {
    sessionId,
    password: password ?? null,
  });
}

export async function terminalDisconnect(connectionId: string): Promise<void> {
  await safeInvoke('terminal_disconnect', { connectionId });
}

export async function terminalWrite(
  connectionId: string,
  data: string,
): Promise<void> {
  await safeInvoke('terminal_write', { connectionId, data });
}

export async function terminalResize(
  connectionId: string,
  cols: number,
  rows: number,
): Promise<void> {
  await safeInvoke('terminal_resize', {
    connectionId,
    cols,
    rows,
  });
}
