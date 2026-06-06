import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { DROP_TO_ROOT_ID } from './sessionListCollisionDetection';
import styles from './SessionList.module.css';

export function RootDropZone() {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: DROP_TO_ROOT_ID });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.rootDropZone} ${isOver ? styles.rootDropZoneOver : ''}`}
    >
      {t('sidebar.dropToRoot')}
    </div>
  );
}
