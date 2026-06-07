import { safeInvoke } from './client';

export async function vaultExists(): Promise<boolean> {
  return safeInvoke<boolean>('vault_exists');
}

export async function vaultIsUnlocked(): Promise<boolean> {
  return safeInvoke<boolean>('vault_is_unlocked');
}

export async function vaultSetup(masterPassword: string): Promise<void> {
  await safeInvoke('vault_setup', { masterPassword });
}

export async function vaultUnlock(masterPassword: string): Promise<void> {
  await safeInvoke('vault_unlock', { masterPassword });
}

export async function vaultLock(): Promise<void> {
  await safeInvoke('vault_lock');
}

export async function vaultChangeMaster(
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  await safeInvoke('vault_change_master', { oldPassword, newPassword });
}

export async function credentialsSet(
  sessionId: string,
  password: string,
): Promise<void> {
  await safeInvoke('credentials_set', { sessionId, password });
}

export async function credentialsDelete(sessionId: string): Promise<void> {
  await safeInvoke('credentials_delete', { sessionId });
}

export async function credentialsHas(sessionId: string): Promise<boolean> {
  return safeInvoke<boolean>('credentials_has', { sessionId });
}
