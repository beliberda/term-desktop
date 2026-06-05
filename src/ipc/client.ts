import { invoke } from '@tauri-apps/api/core';
import * as commands from './commands';

export async function safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.error(`[IPC] ${command} failed:`, error);
    throw error;
  }
}

export async function invokePing(): Promise<string> {
  return commands.ping();
}
