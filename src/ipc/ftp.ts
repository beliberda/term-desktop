import { safeInvoke } from './client';

export interface ConnectResponse {
  connectionId: string;
}

export async function ftpConnect(
  sessionId: string,
  password?: string,
): Promise<ConnectResponse> {
  return safeInvoke<ConnectResponse>('ftp_connect', {
    sessionId,
    password: password ?? null,
  });
}

export async function ftpDisconnect(connectionId: string): Promise<void> {
  await safeInvoke('ftp_disconnect', { connectionId });
}
