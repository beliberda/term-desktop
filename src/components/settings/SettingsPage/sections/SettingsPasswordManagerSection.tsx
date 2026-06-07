import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useAppErrorMessage } from '@i18n/useAppErrorMessage';
import { useStores } from '@stores/index';
import styles from '../SettingsPage.module.css';

export const SettingsPasswordManagerSection = observer(
  function SettingsPasswordManagerSection() {
    const { t } = useTranslation();
    const { vaultStore, sessionStore } = useStores();
    const errorMessage = useAppErrorMessage(vaultStore.error);

    const [masterPassword, setMasterPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showSetupForm, setShowSetupForm] = useState(false);
    const [showChangeMaster, setShowChangeMaster] = useState(false);
    const [oldMasterPassword, setOldMasterPassword] = useState('');
    const [newMasterPassword, setNewMasterPassword] = useState('');
    const [confirmNewMaster, setConfirmNewMaster] = useState('');
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(
      new Set(),
    );

    useEffect(() => {
      if (vaultStore.isUnlocked) {
        void vaultStore.loadCredentials();
      }
    }, [vaultStore, vaultStore.isUnlocked]);

    const togglePasswordVisibility = (sessionId: string) => {
      setVisiblePasswords((prev) => {
        const next = new Set(prev);
        if (next.has(sessionId)) {
          next.delete(sessionId);
        } else {
          next.add(sessionId);
        }
        return next;
      });
    };

    const handleUnlock = () => {
      void vaultStore.unlock(masterPassword).then(() => {
        if (vaultStore.isUnlocked) {
          setMasterPassword('');
        }
      });
    };

    const handleSetup = async () => {
      const ok = await vaultStore.setupInline(masterPassword, confirmPassword);
      if (ok) {
        setMasterPassword('');
        setConfirmPassword('');
        setShowSetupForm(false);
      }
    };

    const handleChangeMaster = async () => {
      const ok = await vaultStore.changeMaster(
        oldMasterPassword,
        newMasterPassword,
        confirmNewMaster,
      );
      if (ok) {
        setOldMasterPassword('');
        setNewMasterPassword('');
        setConfirmNewMaster('');
        setShowChangeMaster(false);
      }
    };

    const handleLock = () => {
      void vaultStore.lock();
      setVisiblePasswords(new Set());
    };

    const rows = vaultStore.credentialEntries.map((entry) => {
      const session = sessionStore.sessions.find(
        (s) => s.id === entry.sessionId,
      );
      return { entry, session };
    });

    return (
      <>
        <h2 className={styles.sectionTitle}>
          {t('settings.groups.passwordManager')}
        </h2>
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}

        {!vaultStore.exists && !showSetupForm && (
          <>
            <p className={styles.hint}>{t('vault.manager.noVault')}</p>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              onClick={() => setShowSetupForm(true)}
            >
              {t('vault.manager.createVault')}
            </button>
          </>
        )}

        {!vaultStore.exists && showSetupForm && (
          <div className={styles.changeMasterForm}>
            <p className={styles.hint}>{t('vault.setup.hint')}</p>
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
              />
            </div>
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => {
                  setShowSetupForm(false);
                  setMasterPassword('');
                  setConfirmPassword('');
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={() => void handleSetup()}
                disabled={
                  masterPassword.length < 8 || confirmPassword.length < 8
                }
              >
                {t('vault.setup.action')}
              </button>
            </div>
          </div>
        )}

        {vaultStore.exists && !vaultStore.isUnlocked && (
          <>
            <p className={styles.hint}>{t('vault.manager.unlockToView')}</p>
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
              />
            </div>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              onClick={handleUnlock}
              disabled={!masterPassword}
            >
              {t('vault.unlock.action')}
            </button>
          </>
        )}

        {vaultStore.exists && vaultStore.isUnlocked && (
          <>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={handleLock}
              >
                {t('vault.lock')}
              </button>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => setShowChangeMaster((v) => !v)}
              >
                {t('vault.changeMaster.action')}
              </button>
            </div>

            {showChangeMaster && (
              <div className={styles.changeMasterForm}>
                <p className={styles.hint}>{t('vault.changeMaster.hint')}</p>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="vault-change-old">
                    {t('vault.changeMaster.current')}
                  </label>
                  <input
                    id="vault-change-old"
                    type="password"
                    className={styles.input}
                    value={oldMasterPassword}
                    onChange={(e) => setOldMasterPassword(e.target.value)}
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
                    value={newMasterPassword}
                    onChange={(e) => setNewMasterPassword(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label
                    className={styles.label}
                    htmlFor="vault-change-confirm"
                  >
                    {t('vault.confirmPassword')}
                  </label>
                  <input
                    id="vault-change-confirm"
                    type="password"
                    className={styles.input}
                    value={confirmNewMaster}
                    onChange={(e) => setConfirmNewMaster(e.target.value)}
                  />
                </div>
                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => {
                      setShowChangeMaster(false);
                      setOldMasterPassword('');
                      setNewMasterPassword('');
                      setConfirmNewMaster('');
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                    onClick={() => void handleChangeMaster()}
                    disabled={
                      !oldMasterPassword ||
                      newMasterPassword.length < 8 ||
                      confirmNewMaster.length < 8
                    }
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            )}

            {rows.length === 0 ? (
              <p className={styles.hint}>{t('vault.manager.empty')}</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('vault.manager.session')}</th>
                    <th>{t('vault.manager.host')}</th>
                    <th>{t('vault.manager.username')}</th>
                    <th>{t('vault.manager.password')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ entry, session }) => {
                    const isVisible = visiblePasswords.has(entry.sessionId);
                    return (
                      <tr key={entry.sessionId}>
                        <td>
                          {session ? (
                            session.name
                          ) : (
                            <span className={styles.orphan}>
                              {t('vault.manager.orphanSession')}
                            </span>
                          )}
                        </td>
                        <td>{session?.host ?? '—'}</td>
                        <td>{session?.username ?? '—'}</td>
                        <td>
                          <div className={styles.passwordCell}>
                            <input
                              type={isVisible ? 'text' : 'password'}
                              className={styles.passwordInput}
                              value={entry.password}
                              readOnly
                            />
                            <button
                              type="button"
                              className={styles.toggleBtn}
                              onClick={() =>
                                togglePasswordVisibility(entry.sessionId)
                              }
                            >
                              {isVisible
                                ? t('vault.manager.hide')
                                : t('vault.manager.show')}
                            </button>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={() =>
                              void vaultStore.deleteCredential(entry.sessionId)
                            }
                          >
                            {t('vault.manager.delete')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </>
    );
  },
);
