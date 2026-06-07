import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useStores } from '@stores/index';
import styles from './FileConflictModal.module.css';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export const FileConflictModal = observer(function FileConflictModal() {
  const { t } = useTranslation();
  const { transferStore } = useStores();
  const [remember, setRemember] = useState(false);

  const conflict = transferStore.pendingConflict;
  if (!conflict) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <h2 className={styles.title}>{t('fileTransfer.conflict.title')}</h2>
        <p className={styles.fileName}>{conflict.fileName}</p>
        <div className={styles.compare}>
          <div>
            <strong>{t('fileTransfer.conflict.local')}</strong>
            <p>{formatSize(conflict.localSize)}</p>
            <p className={styles.date}>{conflict.localModifiedAt ?? '—'}</p>
          </div>
          <div>
            <strong>{t('fileTransfer.conflict.remote')}</strong>
            <p>{formatSize(conflict.remoteSize)}</p>
            <p className={styles.date}>{conflict.remoteModifiedAt ?? '—'}</p>
          </div>
        </div>
        <label className={styles.remember}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          {t('fileTransfer.conflict.remember')}
        </label>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btn}
            onClick={() => transferStore.resolveConflict('skip', remember)}
          >
            {t('fileTransfer.conflict.skip')}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => transferStore.resolveConflict('replace', remember)}
          >
            {t('fileTransfer.conflict.replace')}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() =>
              transferStore.resolveConflict('replaceAll', remember)
            }
          >
            {t('fileTransfer.conflict.replaceAll')}
          </button>
        </div>
      </div>
    </div>
  );
});
