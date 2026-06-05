import { useEffect, useLayoutEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import type { SessionConfig } from '@/types';
import { useStores } from '@stores/index';
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
  const { sessionStore, terminalStore } = useStores();
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
    sessionStore.selectSession(session.id);
    terminalStore.requestConnect(session.id, session);
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
    if (window.confirm(`Удалить сессию «${session.name}»?`)) {
      void sessionStore.deleteSession(session.id);
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
      <button type="button" className={styles.menuItem} onClick={handleConnect}>
        Подключиться
      </button>
      <button type="button" className={styles.menuItem} onClick={handleEdit}>
        Редактировать
      </button>
      <button type="button" className={styles.menuItem} onClick={handleDuplicate}>
        Дублировать
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
