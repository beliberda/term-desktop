import type { DragEvent, MouseEvent } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SftpEntry } from '@/types';
import styles from './FileTable.module.css';

export type FileSortKey = 'name' | 'size' | 'modifiedAt';
export type FileSortDir = 'asc' | 'desc';

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

interface FileTableProps {
  entries: SftpEntry[];
  cwd: string;
  selectedPaths: Set<string>;
  renameTargetPath: string | null;
  renameDraft: string;
  isLoading: boolean;
  focused: boolean;
  paneLabel: string;
  onSelect: (
    entry: SftpEntry,
    opts?: { additive?: boolean; range?: boolean },
  ) => void;
  onNavigateUp: () => void;
  onOpen: (entry: SftpEntry) => void;
  onContextMenu: (e: MouseEvent, entry: SftpEntry | null) => void;
  onRenameDraftChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onFocus: () => void;
  onDrop?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDragStart?: (e: DragEvent, entry: SftpEntry) => void;
  dropActive?: boolean;
}

export function FileTable({
  entries,
  cwd,
  selectedPaths,
  renameTargetPath,
  renameDraft,
  isLoading,
  focused,
  paneLabel,
  onSelect,
  onNavigateUp,
  onOpen,
  onContextMenu,
  onRenameDraftChange,
  onCommitRename,
  onCancelRename,
  onFocus,
  onDrop,
  onDragOver,
  onDragStart,
  dropActive,
}: FileTableProps) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<FileSortKey>('name');
  const [sortDir, setSortDir] = useState<FileSortDir>('asc');

  const sorted = useMemo(() => {
    const list = [...entries];
    list.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      } else if (sortKey === 'size') {
        cmp = a.size - b.size;
      } else {
        const at = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
        const bt = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
        cmp = at - bt;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [entries, sortKey, sortDir]);

  const toggleSort = (key: FileSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const showParent = cwd && cwd !== '/' && !/^[A-Za-z]:\\?$/.test(cwd);

  return (
    <div
      className={`${styles.tableWrap} ${focused ? styles.focused : ''} ${dropActive ? styles.dropActive : ''}`}
      onFocus={onFocus}
      tabIndex={0}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onContextMenu={(e) => onContextMenu(e, null)}
    >
      <div className={styles.header}>
        <span className={styles.paneLabel}>{paneLabel}</span>
        <button
          type="button"
          className={`${styles.col} ${styles.colName}`}
          onClick={() => toggleSort('name')}
        >
          {t('fileTransfer.columns.name')}
          {sortKey === 'name' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
        </button>
        <button
          type="button"
          className={`${styles.col} ${styles.colSize}`}
          onClick={() => toggleSort('size')}
        >
          {t('fileTransfer.columns.size')}
          {sortKey === 'size' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
        </button>
        <button
          type="button"
          className={`${styles.col} ${styles.colDate}`}
          onClick={() => toggleSort('modifiedAt')}
        >
          {t('fileTransfer.columns.modified')}
          {sortKey === 'modifiedAt' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
        </button>
      </div>
      <div className={styles.body}>
        {isLoading && entries.length === 0 && (
          <p className={styles.status}>{t('files.list.loading')}</p>
        )}
        {!isLoading && entries.length === 0 && !showParent && (
          <p className={styles.status}>{t('files.list.empty')}</p>
        )}
        {showParent && (
          <button
            type="button"
            className={styles.row}
            onDoubleClick={onNavigateUp}
          >
            <span className={`${styles.icon} ${styles.dir}`}>📁</span>
            <span className={styles.name}>..</span>
            <span className={styles.size}>—</span>
            <span className={styles.date}>—</span>
          </button>
        )}
        {sorted.map((entry) => {
          const selected = selectedPaths.has(entry.path);
          return (
            <button
              key={entry.path}
              type="button"
              className={`${styles.row} ${selected ? styles.selected : ''}`}
              draggable
              onDragStart={(e) => onDragStart?.(e, entry)}
              onClick={(e) =>
                onSelect(entry, {
                  additive: e.ctrlKey || e.metaKey,
                  range: e.shiftKey,
                })
              }
              onDoubleClick={() => onOpen(entry)}
              onContextMenu={(e) => {
                e.preventDefault();
                onSelect(entry);
                onContextMenu(e, entry);
              }}
            >
              <span
                className={`${styles.icon} ${entry.isDirectory ? styles.dir : styles.file}`}
              >
                {entry.isDirectory ? '📁' : '📄'}
              </span>
              {renameTargetPath === entry.path ? (
                <input
                  type="text"
                  className={styles.renameInput}
                  value={renameDraft}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) => onRenameDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onCommitRename();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      onCancelRename();
                    }
                  }}
                  onBlur={onCancelRename}
                />
              ) : (
                <span className={styles.name} title={entry.name}>
                  {entry.name}
                </span>
              )}
              <span className={styles.size}>
                {entry.isDirectory ? '—' : formatSize(entry.size)}
              </span>
              <span className={styles.date}>
                {formatDate(entry.modifiedAt)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
