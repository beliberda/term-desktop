import styles from './TerminalTabBar.module.css';

export function TerminalTabBar() {
  return (
    <div className={styles.tabBar}>
      <span className={styles.empty}>Нет открытых вкладок</span>
    </div>
  );
}
