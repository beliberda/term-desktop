import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useAppErrorMessage } from '@i18n/useAppErrorMessage';
import { useStores } from '@stores/index';
import styles from '../VaultUnlockModal/VaultUnlockModal.module.css';

export const VaultChangeMasterModal = observer(function VaultChangeMasterModal() {
  const { t } = useTranslation();
  const { vaultStore } = useStores();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const errorMessage = useAppErrorMessage(vaultStore.error);

  if (!vaultStore.isChangeMasterOpen) return null;

  const canSubmit =
    oldPassword.length > 0 &&
    newPassword.length >= 8 &&
    confirmPassword.length >= 8;

  const handleChange = async () => {
    const ok = await vaultStore.changeMaster(
      oldPassword,
      newPassword,
      confirmPassword,
    );
    if (ok) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleCancel = () => {
    vaultStore.closeChangeMaster();
    setOldPassword('');
    setNewPassword('');
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
        <h2 className={styles.title}>{t('vault.changeMaster.title')}</h2>
        <p className={styles.hint}>{t('vault.changeMaster.hint')}</p>
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="vault-change-old">
            {t('vault.changeMaster.current')}
          </label>
          <input
            id="vault-change-old"
            type="password"
            className={styles.input}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            autoFocus
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="vault-change-new">
            {t('vault.changeMaster.new')}
          </label>
          <input
            id="vault-change-new"
            type="password"
            className={styles.input}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="vault-change-confirm">
            {t('vault.confirmPassword')}
          </label>
          <input
            id="vault-change-confirm"
            type="password"
            className={styles.input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) void handleChange();
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
            onClick={() => void handleChange()}
            disabled={!canSubmit}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
});
