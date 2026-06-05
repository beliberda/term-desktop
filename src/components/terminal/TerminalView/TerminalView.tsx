import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useStores } from '@stores/index';
import styles from './TerminalView.module.css';

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export const TerminalView = observer(function TerminalView() {
  const { terminalStore, settingsStore } = useStores();
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const activeTabId = terminalStore.activeTabId;
  const activeConnectionId = terminalStore.activeConnectionId;

  useEffect(() => {
    if (!containerRef.current || !activeTabId) return;

    const isLight = settingsStore.settings.theme === 'light';
    const term = new Terminal({
      cursorBlink: true,
      fontSize: settingsStore.settings.terminalFontSize,
      fontFamily: settingsStore.settings.terminalFontFamily,
      theme: {
        background: isLight ? '#ffffff' : '#1e1e1e',
        foreground: isLight ? '#1e1e1e' : '#cccccc',
        cursor: isLight ? '#1e1e1e' : '#cccccc',
      },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    const dataDisposable = term.onData((data) => {
      const bytes = new TextEncoder().encode(data);
      void terminalStore.writeToActive(bytes);
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      const connectionId = terminalStore.activeConnectionId;
      if (connectionId) {
        void terminalStore.resize(connectionId, term.cols, term.rows);
      }
    });
    resizeObserver.observe(containerRef.current);

    const unregisterOutput = terminalStore.registerOutputHandler((payload) => {
      if (payload.connectionId === terminalStore.activeConnectionId) {
        const bytes = base64ToBytes(payload.data);
        term.write(bytes);
      }
    });

    return () => {
      dataDisposable.dispose();
      resizeObserver.disconnect();
      unregisterOutput();
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [
    activeTabId,
    terminalStore,
    settingsStore.settings.theme,
    settingsStore.settings.terminalFontSize,
    settingsStore.settings.terminalFontFamily,
  ]);

  useEffect(() => {
    if (terminalRef.current && fitAddonRef.current && containerRef.current) {
      fitAddonRef.current.fit();
      if (activeConnectionId) {
        void terminalStore.resize(
          activeConnectionId,
          terminalRef.current.cols,
          terminalRef.current.rows,
        );
      }
    }
  }, [activeConnectionId, terminalStore]);

  if (!activeTabId) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div ref={containerRef} className={styles.terminal} />
    </div>
  );
});
