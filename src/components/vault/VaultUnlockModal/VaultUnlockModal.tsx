import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useAppErrorMessage } from '@i18n/useAppErrorMessage';
import { useStores } from '@stores/index';
import styles from './VaultUnlockModal.module.css';

export const VaultUnlockModal = observer(function VaultUnlockModal() {
  const { t } = useTranslation();
  const { vaultStore } = useStores();
  const [masterPassword, setMasterPassword] = useState('');
  const errorMessage = useAppErrorMessage(vaultStore.error);

  if (!vaultStore.isUnlockOpen) return null;

  const handleUnlock = () => {
    void vaultStore.unlock(masterPassword).then(() => {
      if (vaultStore.isUnlocked) {
        setMasterPassword('');
      }
    });
  };

  const handleSkip = () => {
    vaultStore.skipUnlock();
    setMasterPassword('');
  };

  return (
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={styles.title}>{t('vault.unlock.title')}</h2>
        <p className={styles.hint}>{t('vault.unlock.hint')}</p>
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="vault-unlock-password">
            {t('vault.masterPassword')}
          </label>
          <input
            id="vault-unlock-password"
            type="password"
            className={styles.input}
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && masterPassword) handleUnlock();
            }}
            autoFocus
          />
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={handleSkip}
          >
            {t('vault.unlock.skip')}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleUnlock}
            disabled={!masterPassword}
          >
            {t('vault.unlock.action')}
          </button>
        </div>
      </div>
    </div>
  );
});
