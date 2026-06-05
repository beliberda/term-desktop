import { TerminalTabBar } from '@components/terminal/TerminalTabBar/TerminalTabBar';
import styles from './TerminalWorkspace.module.css';

export function TerminalWorkspace() {
  return (
    <div className={styles.workspace}>
      <TerminalTabBar />
      <div className={styles.content}>
        Нет открытых терминалов
      </div>
    </div>
  );
}
