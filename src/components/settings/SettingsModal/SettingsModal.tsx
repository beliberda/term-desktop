import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import type { AppSettings } from '@/types';
import styles from './SettingsModal.module.css';

export const SettingsModal = observer(function SettingsModal() {
  const { settingsStore } = useStores();
  const [draft, setDraft] = useState<AppSettings | null>(null);

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

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={styles.title}>Настройки</h2>
        {settingsStore.error && (
          <p className={styles.error}>{settingsStore.error}</p>
        )}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="settings-theme">
            Тема
          </label>
          <select
            id="settings-theme"
            className={styles.input}
            value={values.theme}
            onChange={(e) =>
              update('theme', e.target.value as AppSettings['theme'])
            }
          >
            <option value="dark">Тёмная</option>
            <option value="light">Светлая</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="settings-font-size">
            Размер шрифта терминала
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
            Шрифт терминала
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
          <label className={styles.label} htmlFor="settings-ssh-port">
            Порт SSH по умолчанию
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
            Порт FTP по умолчанию
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
            Отмена
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSave}`}
            onClick={handleSave}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
});
