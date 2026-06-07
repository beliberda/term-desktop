import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './PaneResizeHandle.module.css';

const MIN_PANE = 180;
const MAX_RATIO = 0.75;

interface PaneResizeHandleProps {
  onResize: (localPercent: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function PaneResizeHandle({
  onResize,
  containerRef,
}: PaneResizeHandleProps) {
  const { t } = useTranslation();
  const draggingRef = useRef(false);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!draggingRef.current || !containerRef.current) return;
        const r = containerRef.current.getBoundingClientRect();
        const x = moveEvent.clientX - r.left;
        const percent = Math.min(
          MAX_RATIO * 100,
          Math.max(
            (MIN_PANE / r.width) * 100,
            (x / r.width) * 100,
          ),
        );
        onResize(percent);
      };

      const handlePointerUp = () => {
        draggingRef.current = false;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      void rect;
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [containerRef, onResize],
  );

  return (
    <div
      className={styles.handle}
      role="separator"
      aria-orientation="vertical"
      aria-label={t('fileTransfer.resizePanes')}
      onPointerDown={handlePointerDown}
    />
  );
}
