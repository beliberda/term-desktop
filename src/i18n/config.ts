export const LOCALES = [
  { code: 'ru', label: 'Русский', nativeLabel: 'Русский' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'zh-CN', label: 'Chinese', nativeLabel: '简体中文' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
] as const;

export type AppLocale = (typeof LOCALES)[number]['code'];

export const LOCALE_CODES = LOCALES.map((l) => l.code) as [
  AppLocale,
  ...AppLocale[],
];

export const FALLBACK_LOCALE: AppLocale = 'ru';

export function isAppLocale(value: string): value is AppLocale {
  return LOCALE_CODES.includes(value as AppLocale);
}

export function detectLocale(): AppLocale {
  const preferred = navigator.language;

  const exact = LOCALES.find((l) => l.code === preferred);
  if (exact) return exact.code;

  const prefix = preferred.split('-')[0];
  const byPrefix = LOCALES.find(
    (l) => l.code === prefix || l.code.startsWith(`${prefix}-`),
  );
  if (byPrefix) return byPrefix.code;

  return FALLBACK_LOCALE;
}
