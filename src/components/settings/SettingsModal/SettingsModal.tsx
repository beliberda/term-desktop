import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { LOCALES } from '@i18n/config';
import { useAppErrorMessage } from '@i18n/useAppErrorMessage';
import { useStores } from '@stores/index';
import type { AppSettings } from '@/types';
import styles from './SettingsModal.module.css';

export const SettingsModal = observer(function SettingsModal() {
  const { t } = useTranslation();
  const { settingsStore } = useStores();
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const errorMessage = useAppErrorMessage(settingsStore.error);

  if (!settingsStore.isFormOpen) return null;

  const values = draft ?? settingsStore.settings;

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setDraft({ ...values, [key]: value });
  };

  const handleSave = () => {
    void settingsStore.save(values);
    setDraft(null);
  };

  const handleClose = () => {
    settingsStore.closeForm();
    setDraft(null);
  };

  const handleBrowseEditor = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: t('common.executable'), extensions: ['exe'] }],
    });
    if (typeof selected === 'string') {
      update('defaultEditorPath', selected);
    }
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={styles.title}>{t('settings.title')}</h2>
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="settings-language">
            {t('settings.language')}
          </label>
          <select
            id="settings-language"
            className={styles.input}
            value={values.locale}
            onChange={(e) =>
              update('locale', e.target.value as AppSettings['locale'])
            }
          >
            {LOCALES.map((locale) => (
              <option key={locale.code} value={locale.code}>
                {locale.nativeLabel}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="settings-theme">
            {t('settings.theme')}
          </label>
          <select
            id="settings-theme"
            className={styles.input}
            value={values.theme}
            onChange={(e) =>
              update('theme', e.target.value as AppSettings['theme'])
            }
          >
            <option value="dark">{t('settings.themeDark')}</option>
            <option value="light">{t('settings.themeLight')}</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="settings-font-size">
            {t('settings.fontSize')}
          </label>
          <input
            id="settings-font-size"
            type="number"
            min={8}
            max={32}
            className={styles.input}
            value={values.terminalFontSize}
            onChange={(e) =>
              update('terminalFontSize', Number(e.target.value) || 14)
            }
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="settings-font-family">
            {t('settings.fontFamily')}
          </label>
          <input
            id="settings-font-family"
            type="text"
            className={styles.input}
            value={values.terminalFontFamily}
            onChange={(e) => update('terminalFontFamily', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="settings-editor-path">
            {t('settings.editorPath')}
          </label>
          <div className={styles.keyRow}>
            <input
              id="settings-editor-path"
              type="text"
              className={styles.input}
              value={values.defaultEditorPath}
              onChange={(e) => update('defaultEditorPath', e.target.value)}
              placeholder={t('settings.editorPlaceholder')}
            />
            <button
              type="button"
              className={styles.browseBtn}
              onClick={() => void handleBrowseEditor()}
            >
              {t('common.browse')}
            </button>
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="settings-ssh-port">
            {t('settings.sshPort')}
          </label>
          <input
            id="settings-ssh-port"
            type="number"
            min={1}
            max={65535}
            className={styles.input}
            value={values.defaultSshPort}
            onChange={(e) =>
              update('defaultSshPort', Number(e.target.value) || 22)
            }
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="settings-ftp-port">
            {t('settings.ftpPort')}
          </label>
          <input
            id="settings-ftp-port"
            type="number"
            min={1}
            max={65535}
            className={styles.input}
            value={values.defaultFtpPort}
            onChange={(e) =>
              update('defaultFtpPort', Number(e.target.value) || 21)
            }
          />
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnCancel}`}
            onClick={handleClose}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSave}`}
            onClick={handleSave}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
});
