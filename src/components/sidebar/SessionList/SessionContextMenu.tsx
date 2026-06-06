import { useEffect, useLayoutEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import type { SessionConfig } from '@/types';
import { useStores } from '@stores/index';
import { connectSession } from '@utils/connectSession';
import styles from './SessionContextMenu.module.css';

interface SessionContextMenuProps {
  session: SessionConfig;
  anchor: { x: number; y: number };
  onClose: () => void;
}

export const SessionContextMenu = observer(function SessionContextMenu({
  session,
  anchor,
  onClose,
}: SessionContextMenuProps) {
  const { t } = useTranslation();
  const stores = useStores();
  const { sessionStore } = stores;
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

  const handleConnect = () => {
    connectSession(session, stores);
    onClose();
  };

  const handleEdit = () => {
    sessionStore.openEditForm(session.id);
    onClose();
  };

  const handleDuplicate = () => {
    void sessionStore.duplicateSession(session.id);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(t('sidebar.sessions.deleteConfirm', { name: session.name }))) {
      void sessionStore.deleteSession(session.id);
    }
    onClose();
  };

  const handleUngroup = () => {
    sessionStore.ungroupSession(session.id);
    onClose();
  };

  const isInFolder = sessionStore.getParentId(session.id) !== null;

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={{ left: anchor.x, top: anchor.y }}
      role="menu"
    >
      <button type="button" className={styles.menuItem} onClick={handleConnect}>
        {t('sidebar.sessions.connect')}
      </button>
      <button type="button" className={styles.menuItem} onClick={handleEdit}>
        {t('sidebar.sessions.edit')}
      </button>
      <button type="button" className={styles.menuItem} onClick={handleDuplicate}>
        {t('sidebar.sessions.duplicate')}
      </button>
      {isInFolder && (
        <button type="button" className={styles.menuItem} onClick={handleUngroup}>
          {t('sidebar.sessions.ungroup')}
        </button>
      )}
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
