import styles from './SftpBrowserPanel.module.css';

export function SftpBrowserPanel() {
  return (
    <div className={styles.container}>
      <p className={styles.title}>SSH Browser</p>
      <p className={styles.hint}>
        Выберите активную сессию в терминале
      </p>
    </div>
  );
}
