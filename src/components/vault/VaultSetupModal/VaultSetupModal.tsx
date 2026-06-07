import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useAppErrorMessage } from '@i18n/useAppErrorMessage';
import { useStores } from '@stores/index';
import styles from '../VaultUnlockModal/VaultUnlockModal.module.css';

export const VaultSetupModal = observer(function VaultSetupModal() {
  const { t } = useTranslation();
  const { vaultStore } = useStores();
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const errorMessage = useAppErrorMessage(vaultStore.error);

  if (!vaultStore.isSetupOpen) return null;

  const canSubmit = masterPassword.length >= 8 && confirmPassword.length >= 8;

  const handleSetup = async () => {
    const ok = await vaultStore.setup(masterPassword, confirmPassword);
    if (ok) {
      setMasterPassword('');
      setConfirmPassword('');
    }
  };

  const handleCancel = () => {
    vaultStore.closeSetup();
    setMasterPassword('');
    setConfirmPassword('');
  };

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={styles.title}>{t('vault.setup.title')}</h2>
        <p className={styles.hint}>{t('vault.setup.hint')}</p>
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="vault-setup-password">
            {t('vault.masterPassword')}
          </label>
          <input
            id="vault-setup-password"
            type="password"
            className={styles.input}
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            autoFocus
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="vault-setup-confirm">
            {t('vault.confirmPassword')}
          </label>
          <input
            id="vault-setup-confirm"
            type="password"
            className={styles.input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) void handleSetup();
            }}
          />
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={handleCancel}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => void handleSetup()}
            disabled={!canSubmit}
          >
            {t('vault.setup.action')}
          </button>
        </div>
      </div>
    </div>
  );
});
