import * as commands from './commands';

export async function invokePing(): Promise<string> {
  try {
    return await commands.ping();
  } catch (error) {
    console.error('[IPC] ping failed:', error);
    throw error;
  }
}
