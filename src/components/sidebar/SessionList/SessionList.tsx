import styles from './SessionList.module.css';

export function SessionList() {
  return (
    <div className={styles.container}>
      <p className={styles.title}>Нет сессий</p>
      <p className={styles.hint}>
        Сессии появятся после настройки подключений
      </p>
    </div>
  );
}
