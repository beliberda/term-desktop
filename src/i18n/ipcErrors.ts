import { i18n } from './index';
import type { AppError, IpcErrorPayload } from './types';

export function parseIpcError(error: unknown): IpcErrorPayload {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === 'object' &&
        'code' in parsed &&
        typeof (parsed as IpcErrorPayload).code === 'string'
      ) {
        const payload = parsed as IpcErrorPayload;
        return {
          code: payload.code,
          details: payload.details,
        };
      }
    } catch {
      // not JSON — fall through
    }

    return { code: 'unknown', details: { raw } };
  }

  return { code: 'unknown' };
}

export function translateError(error: AppError | null | undefined): string {
  if (!error) return '';
  const key = `errors.${error.code}`;
  const translated = i18n.t(key, error.details ?? {});
  if (translated !== key) return translated;
  const raw = error.details?.raw;
  return typeof raw === 'string' ? raw : i18n.t('errors.unknown');
}
