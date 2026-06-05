import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import { SidebarTabs } from '@components/sidebar/SidebarTabs/SidebarTabs';
import { SessionList } from '@components/sidebar/SessionList/SessionList';
import { SftpBrowserPanel } from '@components/sidebar/SftpBrowserPanel/SftpBrowserPanel';
import styles from './Sidebar.module.css';

export const Sidebar = observer(function Sidebar() {
  const { appStore } = useStores();

  return (
    <aside className={styles.sidebar}>
      <SidebarTabs />
      <div className={styles.content}>
        {appStore.sidebarTab === 'sessions' ? (
          <SessionList />
        ) : (
          <SftpBrowserPanel />
        )}
      </div>
    </aside>
  );
});
