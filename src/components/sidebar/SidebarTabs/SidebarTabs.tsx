import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import type { SidebarTab } from '@/types';
import styles from './SidebarTabs.module.css';

const TABS: { id: SidebarTab; label: string }[] = [
  { id: 'sessions', label: 'Сессии' },
  { id: 'files', label: 'Файлы' },
];

export const SidebarTabs = observer(function SidebarTabs() {
  const { appStore } = useStores();

  return (
    <div className={styles.tabs}>
      {TABS.map((tab) => (
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
