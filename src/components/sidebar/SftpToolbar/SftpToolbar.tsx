import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/index';
import styles from './SftpToolbar.module.css';

export const SftpToolbar = observer(function SftpToolbar() {
  const { sftpBrowserStore } = useStores();
  const [mkdirOpen, setMkdirOpen] = useState(false);
  const [mkdirName, setMkdirName] = useState('');

  const handleMkdirSubmit = () => {
    const name = mkdirName.trim();
    if (!name) return;
    void sftpBrowserStore.mkdir(name);
    setMkdirName('');
    setMkdirOpen(false);
  };

  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={styles.button}
        onClick={() => sftpBrowserStore.refresh()}
        disabled={sftpBrowserStore.isLoading}
      >
        Обновить
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => void sftpBrowserStore.upload()}
        disabled={sftpBrowserStore.isLoading}
      >
        Загрузить
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => setMkdirOpen((v) => !v)}
        disabled={sftpBrowserStore.isLoading}
      >
        Папка
      </button>
      {mkdirOpen && (
        <div className={styles.mkdirRow}>
          <input
            className={styles.mkdirInput}
            type="text"
            placeholder="Имя папки"
            value={mkdirName}
            onChange={(e) => setMkdirName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleMkdirSubmit();
              if (e.key === 'Escape') setMkdirOpen(false);
            }}
          />
          <button
            type="button"
            className={styles.mkdirSubmit}
            onClick={handleMkdirSubmit}
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
});
