import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import styles from './AnchorPopup.module.css';

interface AnchorPopupProps {
  anchor: { x: number; y: number };
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function AnchorPopup({
  anchor,
  onClose,
  children,
  className,
}: AnchorPopupProps) {
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
      className={`${styles.popup} ${className ?? ''}`}
      style={{ left: anchor.x, top: anchor.y }}
      role="menu"
    >
      {children}
    </div>
  );
}
