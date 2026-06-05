import { invoke } from '@tauri-apps/api/core';
import * as commands from './commands';

export function getIpcErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Неизвестная ошибка';
}

export async function safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    const message = getIpcErrorMessage(error);
    console.error(`[IPC] ${command} failed:`, message);
    throw new Error(message);
  }
}

export async function invokePing(): Promise<string> {
  return commands.ping();
}
