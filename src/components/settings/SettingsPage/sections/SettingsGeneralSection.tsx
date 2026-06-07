import { useTranslation } from 'react-i18next';
import { LOCALES } from '@i18n/config';
import type { AppSettings } from '@/types';
import styles from '../SettingsPage.module.css';

type Props = {
  values: AppSettings;
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
};

export function SettingsGeneralSection({ values, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className={styles.sectionTitle}>{t('settings.groups.general')}</h2>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="settings-language">
          {t('settings.language')}
        </label>
        <select
          id="settings-language"
          className={styles.input}
          value={values.locale}
          onChange={(e) =>
            onChange('locale', e.target.value as AppSettings['locale'])
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
            onChange('theme', e.target.value as AppSettings['theme'])
          }
        >
          <option value="dark">{t('settings.themeDark')}</option>
          <option value="light">{t('settings.themeLight')}</option>
        </select>
      </div>
    </>
  );
}
