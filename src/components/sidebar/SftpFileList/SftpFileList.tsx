import type { MouseEvent } from 'react';
import { observer } from 'mobx-react-lite';
import type { SftpEntry } from '@/types';
import { useStores } from '@stores/index';
import styles from './SftpFileList.module.css';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export const SftpFileList = observer(function SftpFileList() {
  const { fileBrowserStore } = useStores();

  const handleClick = (entry: SftpEntry) => {
    if (entry.isDirectory) {
      fileBrowserStore.navigateTo(entry.path);
      return;
    }
    fileBrowserStore.selectEntry(entry);
  };

  const handleDoubleClick = (entry: SftpEntry) => {
    if (entry.isDirectory) {
      fileBrowserStore.navigateTo(entry.path);
      return;
    }
    void fileBrowserStore.download(entry);
  };

  const handleContextMenu = (e: MouseEvent, entry: SftpEntry) => {
    e.preventDefault();
    fileBrowserStore.selectEntry(entry);
    void fileBrowserStore.download(entry);
  };

  if (fileBrowserStore.isLoading && fileBrowserStore.entries.length === 0) {
    return <p className={styles.status}>Загрузка...</p>;
  }

  if (fileBrowserStore.entries.length === 0) {
    return <p className={styles.status}>Папка пуста</p>;
  }

  return (
    <ul className={styles.list}>
      {fileBrowserStore.cwd !== '/' && (
        <li>
          <button
            type="button"
            className={styles.row}
            onClick={() => fileBrowserStore.navigateUp()}
          >
            <span className={`${styles.icon} ${styles.dir}`}>📁</span>
            <span className={styles.name}>..</span>
            <span className={styles.meta} />
          </button>
        </li>
      )}
      {fileBrowserStore.entries.map((entry) => {
        const selected =
          fileBrowserStore.selectedEntry?.path === entry.path;
        return (
          <li key={entry.path}>
            <button
              type="button"
              className={`${styles.row} ${selected ? styles.selected : ''}`}
              onClick={() => handleClick(entry)}
              onDoubleClick={() => handleDoubleClick(entry)}
              onContextMenu={(e) => handleContextMenu(e, entry)}
            >
              <span
                className={`${styles.icon} ${entry.isDirectory ? styles.dir : styles.file}`}
              >
                {entry.isDirectory ? '📁' : '📄'}
              </span>
              <span className={styles.name} title={entry.name}>
                {entry.name}
              </span>
              <span className={styles.meta}>
                {entry.isDirectory ? '—' : formatSize(entry.size)}
              </span>
              <span className={styles.date}>{formatDate(entry.modifiedAt)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
});
