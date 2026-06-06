import { useTranslation } from 'react-i18next';
import type { AppError } from './types';

export function useAppErrorMessage(error: AppError | null | undefined): string {
  const { t } = useTranslation();
  if (!error) return '';
  const key = `errors.${error.code}`;
  const translated = t(key, { ...(error.details ?? {}), defaultValue: '' });
  if (translated) return translated;
  const raw = error.details?.raw;
  return typeof raw === 'string' ? raw : t('errors.unknown');
}
