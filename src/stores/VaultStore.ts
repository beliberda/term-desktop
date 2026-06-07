import { makeAutoObservable, runInAction } from 'mobx';
import type { AppError } from '@i18n/types';
import { getIpcErrorPayload } from '@ipc/client';
import * as credentialsIpc from '@ipc/credentials';
import type { CredentialEntry } from '@ipc/credentials';

export type PendingCredentialSave = {
  sessionId: string;
  password: string;
};

export class VaultStore {
  exists = false;
  isUnlocked = false;
  isUnlockOpen = false;
  isSetupOpen = false;
  error: AppError | null = null;
  pendingSave: PendingCredentialSave | null = null;
  credentialEntries: CredentialEntry[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  async init() {
    try {
      const [exists, isUnlocked] = await Promise.all([
        credentialsIpc.vaultExists(),
        credentialsIpc.vaultIsUnlocked(),
      ]);
      runInAction(() => {
        this.exists = exists;
        this.isUnlocked = isUnlocked;
        this.isUnlockOpen = exists && !isUnlocked;
        this.error = null;
      });
    } catch (e) {
      runInAction(() => {
        this.error = getIpcErrorPayload(e);
      });
    }
  }

  clearCredentials() {
    this.credentialEntries = [];
  }

  async loadCredentials() {
    if (!this.isUnlocked) {
      this.clearCredentials();
      return;
    }
    try {
      const entries = await credentialsIpc.credentialsList();
      runInAction(() => {
        this.credentialEntries = entries;
        this.error = null;
      });
    } catch (e) {
      runInAction(() => {
        this.error = getIpcErrorPayload(e);
        this.credentialEntries = [];
      });
    }
  }

  skipUnlock() {
    this.isUnlockOpen = false;
    this.error = null;
  }

  openSetup(pendingSave?: PendingCredentialSave) {
    this.pendingSave = pendingSave ?? null;
    this.isSetupOpen = true;
    this.error = null;
  }

  closeSetup() {
    this.isSetupOpen = false;
    this.pendingSave = null;
    this.error = null;
  }

  async unlock(masterPassword: string) {
    try {
      await credentialsIpc.vaultUnlock(masterPassword);
      runInAction(() => {
        this.isUnlocked = true;
        this.isUnlockOpen = false;
        this.error = null;
      });
      await this.loadCredentials();
    } catch (e) {
      runInAction(() => {
        this.error = getIpcErrorPayload(e);
      });
    }
  }

  async setup(masterPassword: string, confirmPassword: string) {
    if (masterPassword.length < 8) {
      runInAction(() => {
        this.error = { code: 'vault.masterPasswordTooShort' };
      });
      return false;
    }
    if (masterPassword !== confirmPassword) {
      runInAction(() => {
        this.error = { code: 'vault.passwordMismatch' };
      });
      return false;
    }

    try {
      await credentialsIpc.vaultSetup(masterPassword);
      const pending = this.pendingSave;
      if (pending) {
        await credentialsIpc.credentialsSet(pending.sessionId, pending.password);
      }
      runInAction(() => {
        this.exists = true;
        this.isUnlocked = true;
        this.isSetupOpen = false;
        this.pendingSave = null;
        this.error = null;
      });
      await this.loadCredentials();
      return true;
    } catch (e) {
      runInAction(() => {
        this.error = getIpcErrorPayload(e);
      });
      return false;
    }
  }

  async setupInline(masterPassword: string, confirmPassword: string) {
    return this.setup(masterPassword, confirmPassword);
  }

  async lock() {
    try {
      await credentialsIpc.vaultLock();
      runInAction(() => {
        this.isUnlocked = false;
        this.error = null;
      });
      this.clearCredentials();
    } catch (e) {
      runInAction(() => {
        this.error = getIpcErrorPayload(e);
      });
    }
  }

  async saveCredential(sessionId: string, password: string) {
    try {
      await credentialsIpc.credentialsSet(sessionId, password);
      runInAction(() => {
        this.exists = true;
        this.error = null;
      });
      await this.loadCredentials();
    } catch (e) {
      runInAction(() => {
        this.error = getIpcErrorPayload(e);
      });
      throw e;
    }
  }

  async deleteCredential(sessionId: string) {
    try {
      await credentialsIpc.credentialsDelete(sessionId);
      const exists = await credentialsIpc.vaultExists();
      runInAction(() => {
        this.exists = exists;
        if (!exists) {
          this.isUnlocked = false;
        }
        this.error = null;
      });
      if (this.isUnlocked) {
        await this.loadCredentials();
      } else {
        this.clearCredentials();
      }
    } catch (e) {
      runInAction(() => {
        this.error = getIpcErrorPayload(e);
      });
    }
  }

  async changeMaster(
    oldPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword.length < 8) {
      runInAction(() => {
        this.error = { code: 'vault.masterPasswordTooShort' };
      });
      return false;
    }
    if (newPassword !== confirmPassword) {
      runInAction(() => {
        this.error = { code: 'vault.passwordMismatch' };
      });
      return false;
    }

    try {
      await credentialsIpc.vaultChangeMaster(oldPassword, newPassword);
      runInAction(() => {
        this.isUnlocked = true;
        this.error = null;
      });
      await this.loadCredentials();
      return true;
    } catch (e) {
      runInAction(() => {
        this.error = getIpcErrorPayload(e);
      });
      return false;
    }
  }
}
