import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useStores } from '@stores/index';
import type { SidebarTab } from '@/types';
import styles from './SidebarTabs.module.css';

export const SidebarTabs = observer(function SidebarTabs() {
  const { t } = useTranslation();
  const { appStore } = useStores();

  const tabs = useMemo(
    (): { id: SidebarTab; label: string }[] => [
      { id: 'sessions', label: t('sidebar.tabs.sessions') },
      { id: 'files', label: t('sidebar.tabs.files') },
    ],
    [t],
  );

  return (
    <div className={styles.tabs}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`${styles.tab} ${appStore.sidebarTab === tab.id ? styles.tabActive : ''}`}
          onClick={() => appStore.setSidebarTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});
