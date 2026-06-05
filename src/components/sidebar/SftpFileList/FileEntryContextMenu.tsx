import { useEffect, useLayoutEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import type { SftpEntry } from '@/types';
import { useStores } from '@stores/index';
import styles from './FileEntryContextMenu.module.css';

interface FileEntryContextMenuProps {
  entry: SftpEntry;
  anchor: { x: number; y: number };
  onClose: () => void;
}

export const FileEntryContextMenu = observer(function FileEntryContextMenu({
  entry,
  anchor,
  onClose,
}: FileEntryContextMenuProps) {
  const { fileBrowserStore } = useStores();
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    let left = anchor.x;
    let top = anchor.y;

    if (left + rect.width > window.innerWidth) {
      left = Math.max(0, window.innerWidth - rect.width - 4);
    }
    if (top + rect.height > window.innerHeight) {
      top = Math.max(0, window.innerHeight - rect.height - 4);
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }, [anchor.x, anchor.y]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={{ left: anchor.x, top: anchor.y }}
      role="menu"
    >
      <button
        type="button"
        className={styles.menuItem}
        onClick={() => {
          void fileBrowserStore.copyPath(entry.path);
          onClose();
        }}
      >
        Копировать путь
      </button>
      <button
        type="button"
        className={styles.menuItem}
        onClick={() => {
          void fileBrowserStore.openEntry(entry);
          onClose();
        }}
      >
        Открыть
      </button>
      <button
        type="button"
        className={styles.menuItem}
        onClick={() => {
          void fileBrowserStore.download(entry);
          onClose();
        }}
      >
        Скачать
      </button>
      <button
        type="button"
        className={styles.menuItem}
        onClick={() => {
          fileBrowserStore.startRename(entry);
          onClose();
        }}
      >
        Переименовать
      </button>
      <button
        type="button"
        className={`${styles.menuItem} ${styles.menuItemDanger}`}
        onClick={() => {
          void fileBrowserStore.deleteEntry(entry);
          onClose();
        }}
      >
        Удалить
      </button>
    </div>
  );
});

