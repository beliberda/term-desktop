import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettings } from '@/types';
import {
  defaultShortcuts,
  SHORTCUT_IDS,
  SHORTCUT_SCOPES,
  type ShortcutId,
} from '@/types/shortcuts';
import {
  bindingFromKeyboardEvent,
  formatShortcutLabel,
  parseShortcutsJson,
  validateShortcuts,
} from '@utils/shortcuts';
import styles from '../SettingsPage.module.css';

type Props = {
  values: AppSettings;
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
};

type ViewMode = 'table' | 'json';

export function SettingsShortcutsSection({ values, onChange }: Props) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [capturingId, setCapturingId] = useState<ShortcutId | null>(null);
  const [jsonDraft, setJsonDraft] = useState(
    () => JSON.stringify(values.shortcuts, null, 2),
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (viewMode === 'json') {
      setJsonDraft(JSON.stringify(values.shortcuts, null, 2));
      setJsonError(null);
    }
  }, [values.shortcuts, viewMode]);

  useEffect(() => {
    if (!capturingId) return;

    const handleCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setCapturingId(null);
        return;
      }

      const binding = bindingFromKeyboardEvent(e);
      if (!binding) return;

      onChange('shortcuts', {
        ...values.shortcuts,
        [capturingId]: binding,
      });
      setCapturingId(null);
    };

    window.addEventListener('keydown', handleCapture, true);
    return () => window.removeEventListener('keydown', handleCapture, true);
  }, [capturingId, onChange, values.shortcuts]);

  const updateShortcut = (id: ShortcutId, binding: string) => {
    onChange('shortcuts', {
      ...values.shortcuts,
      [id]: binding,
    });
  };

  const handleJsonChange = (raw: string) => {
    setJsonDraft(raw);
    const result = parseShortcutsJson(raw);
    if (!result.ok) {
      setJsonError(
        result.code === 'shortcutsDuplicate' && result.binding
          ? t('errors.settings.shortcutsDuplicate', { binding: result.binding })
          : t('settings.shortcuts.invalidJson'),
      );
      return;
    }
    setJsonError(null);
    onChange('shortcuts', result.config);
  };

  const handleFormatJson = () => {
    const result = validateShortcuts(values.shortcuts);
    if (result.ok) {
      setJsonDraft(JSON.stringify(result.config, null, 2));
      setJsonError(null);
    }
  };

  const handleResetAll = () => {
    onChange('shortcuts', { ...defaultShortcuts });
    setJsonError(null);
  };

  return (
    <>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{t('settings.groups.shortcuts')}</h2>
        <div className={styles.sectionHeaderActions}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleResetAll}
          >
            {t('settings.shortcuts.resetAll')}
          </button>
        </div>
      </div>

      <div className={styles.viewTabs}>
        <button
          type="button"
          className={
            viewMode === 'table'
              ? `${styles.viewTab} ${styles.viewTabActive}`
              : styles.viewTab
          }
          onClick={() => setViewMode('table')}
        >
          {t('settings.shortcuts.table')}
        </button>
        <button
          type="button"
          className={
            viewMode === 'json'
              ? `${styles.viewTab} ${styles.viewTabActive}`
              : styles.viewTab
          }
          onClick={() => setViewMode('json')}
        >
          {t('settings.shortcuts.json')}
        </button>
      </div>

      {viewMode === 'table' ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('settings.shortcuts.action')}</th>
              <th>{t('settings.shortcuts.scope')}</th>
              <th>{t('settings.shortcuts.binding')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {SHORTCUT_IDS.map((id) => {
              const binding = values.shortcuts[id];
              const isCapturing = capturingId === id;
              const scope = SHORTCUT_SCOPES[id];
              return (
                <tr key={id}>
                  <td>{t(`settings.shortcuts.actions.${id}`)}</td>
                  <td>
                    {scope === 'global'
                      ? t('settings.shortcuts.scopeGlobal')
                      : t('settings.shortcuts.scopeFileMode')}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={
                        isCapturing
                          ? `${styles.bindingInput} ${styles.bindingInputCapturing}`
                          : styles.bindingInput
                      }
                      onClick={() => setCapturingId(id)}
                    >
                      {isCapturing
                        ? t('settings.shortcuts.captureHint')
                        : binding
                          ? formatShortcutLabel(binding)
                          : t('settings.shortcuts.disabled')}
                    </button>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.toggleBtn}
                        onClick={() => updateShortcut(id, defaultShortcuts[id])}
                      >
                        {t('settings.shortcuts.reset')}
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => updateShortcut(id, '')}
                      >
                        {t('settings.shortcuts.clear')}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className={styles.jsonEditor}>
          <textarea
            className={styles.jsonTextarea}
            value={jsonDraft}
            onChange={(e) => handleJsonChange(e.target.value)}
            spellCheck={false}
          />
          {jsonError && <p className={styles.error}>{jsonError}</p>}
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleFormatJson}
            >
              {t('settings.shortcuts.format')}
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleResetAll}
            >
              {t('settings.shortcuts.resetAll')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
