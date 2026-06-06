import { useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import {
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
} from '@/types/settings';
import { useStores } from '@stores/index';
import styles from './SidebarResizeHandle.module.css';

export const SidebarResizeHandle = observer(function SidebarResizeHandle() {
  const { t } = useTranslation();
  const { settingsStore } = useStores();
  const draggingRef = useRef(false);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);

      const startX = event.clientX;
      const startWidth = settingsStore.settings.sidebarWidth;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!draggingRef.current) return;
        const delta = moveEvent.clientX - startX;
        const nextWidth = Math.round(
          Math.min(
            SIDEBAR_WIDTH_MAX,
            Math.max(SIDEBAR_WIDTH_MIN, startWidth + delta),
          ),
        );
        settingsStore.setSidebarWidth(nextWidth);
      };

      const handlePointerUp = () => {
        draggingRef.current = false;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        void settingsStore.saveSidebarWidth();
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [settingsStore],
  );

  return (
    <div
      className={styles.handle}
      role="separator"
      aria-orientation="vertical"
      aria-label={t('sidebar.resize')}
      onPointerDown={handlePointerDown}
    />
  );
});
