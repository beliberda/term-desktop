import { useEffect, useLayoutEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    const nextName = window
      .prompt(t('sidebar.folder.namePrompt'), folder.name)
      ?.trim();
    if (nextName) {
      sessionStore.renameFolder(folder.id, nextName);
    }
    onClose();
  };

  const handleDelete = () => {
    if (
      window.confirm(
        t('sidebar.folder.deleteConfirm', { name: folder.name }),
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
        {folder.collapsed
          ? t('sidebar.folder.expand')
          : t('sidebar.folder.collapse')}
      </button>
      <button type="button" className={styles.menuItem} onClick={handleRename}>
        {t('sidebar.folder.rename')}
      </button>
      <button
        type="button"
        className={styles.menuItem}
        onClick={() => {
          void sessionStore.createFolder(folder.id);
          onClose();
        }}
      >
        {t('sidebar.folder.createSubfolder')}
      </button>
      <button
        type="button"
        className={`${styles.menuItem} ${styles.menuItemDanger}`}
        onClick={handleDelete}
      >
        {t('common.delete')}
      </button>
    </div>
  );
});
