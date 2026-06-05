import { useEffect, useLayoutEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import type { SessionFolder } from '@/types';
import { useStores } from '@stores/index';
import styles from './SessionContextMenu.module.css';

interface FolderContextMenuProps {
  folder: SessionFolder;
  anchor: { x: number; y: number };
  onClose: () => void;
}

export const FolderContextMenu = observer(function FolderContextMenu({
  folder,
  anchor,
  onClose,
}: FolderContextMenuProps) {
  const { sessionStore } = useStores();
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

  const handleRename = () => {
    const nextName = window.prompt('Название папки', folder.name)?.trim();
    if (nextName) {
      sessionStore.renameFolder(folder.id, nextName);
    }
    onClose();
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `Удалить папку «${folder.name}»? Содержимое будет перемещено в корень.`,
      )
    ) {
      sessionStore.deleteFolder(folder.id);
    }
    onClose();
  };

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
          sessionStore.toggleFolderCollapsed(folder.id);
          onClose();
        }}
      >
        {folder.collapsed ? 'Развернуть' : 'Свернуть'}
      </button>
      <button type="button" className={styles.menuItem} onClick={handleRename}>
        Переименовать
      </button>
      <button
        type="button"
        className={styles.menuItem}
        onClick={() => {
          void sessionStore.createFolder(folder.id);
          onClose();
        }}
      >
        Создать подпапку
      </button>
      <button
        type="button"
        className={`${styles.menuItem} ${styles.menuItemDanger}`}
        onClick={handleDelete}
      >
        Удалить
      </button>
    </div>
  );
});
