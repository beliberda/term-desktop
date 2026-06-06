import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { FALLBACK_LOCALE, type AppLocale } from './config';
import ru from './locales/ru.json';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import it from './locales/it.json';
import de from './locales/de.json';

export { i18n };

export function initI18n(locale: AppLocale = FALLBACK_LOCALE): void {
  if (i18n.isInitialized) {
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
    return;
  }

  void i18n.use(initReactI18next).init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
      'zh-CN': { translation: zhCN },
      it: { translation: it },
      de: { translation: de },
    },
    lng: locale,
    fallbackLng: FALLBACK_LOCALE,
    interpolation: { escapeValue: false },
  });

  document.documentElement.lang = locale;
}

export async function changeLocale(locale: AppLocale): Promise<void> {
  await i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
}
