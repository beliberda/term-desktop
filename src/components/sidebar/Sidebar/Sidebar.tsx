import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import { SidebarTabs } from '@components/sidebar/SidebarTabs/SidebarTabs';
import { SessionToolbar } from '@components/sidebar/SessionToolbar/SessionToolbar';
import { SessionList } from '@components/sidebar/SessionList/SessionList';
import { SessionForm } from '@components/sidebar/SessionForm/SessionForm';
import { SftpBrowserPanel } from '@components/sidebar/SftpBrowserPanel/SftpBrowserPanel';
import styles from './Sidebar.module.css';

export const Sidebar = observer(function Sidebar() {
  const { appStore } = useStores();

  return (
    <aside className={styles.sidebar}>
      <SidebarTabs />
      {appStore.sidebarTab === 'sessions' && <SessionToolbar />}
      <div className={styles.content}>
        {appStore.sidebarTab === 'sessions' ? (
          <SessionList />
        ) : (
          <SftpBrowserPanel />
        )}
      </div>
      <SessionForm />
    </aside>
  );
});
