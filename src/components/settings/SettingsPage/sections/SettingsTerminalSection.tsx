import { useTranslation } from 'react-i18next';
import type { AppSettings } from '@/types';
import styles from '../SettingsPage.module.css';

type Props = {
  values: AppSettings;
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
};

export function SettingsTerminalSection({ values, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className={styles.sectionTitle}>{t('settings.groups.terminal')}</h2>
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
            onChange('terminalFontSize', Number(e.target.value) || 14)
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
          onChange={(e) => onChange('terminalFontFamily', e.target.value)}
        />
      </div>
    </>
  );
}
