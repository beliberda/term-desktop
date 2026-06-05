import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { open } from "@tauri-apps/plugin-dialog";
import { useStores } from "@stores/index";
import {
  getDefaultPort,
  type AuthType,
  type Protocol,
  type SessionConfig,
} from "@/types";
import styles from "./SessionForm.module.css";

export const SessionForm = observer(function SessionForm() {
  const { sessionStore, settingsStore } = useStores();
  const [draft, setDraft] = useState<SessionConfig | null>(null);

  useEffect(() => {
    if (sessionStore.isFormOpen) {
      setDraft(null);
    }
  }, [sessionStore.isFormOpen, sessionStore.editingSession?.id]);

  const session = draft ?? sessionStore.editingSession;

  if (!sessionStore.isFormOpen || !session) {
    return null;
  }

  const update = (patch: Partial<SessionConfig>) => {
    const next = { ...session, ...patch };
    setDraft(next);
  };

  const handleProtocolChange = (protocol: Protocol) => {
    const port =
      protocol === "ftp"
        ? settingsStore.settings.defaultFtpPort
        : settingsStore.settings.defaultSshPort;
    update({
      protocol,
      port: port || getDefaultPort(protocol),
      ...(protocol === "ftp" ? { authType: "password" as const } : {}),
    });
  };

  const handleBrowseKey = async () => {
    const selected = await open({
      multiple: false,
    });
    if (typeof selected === "string") {
      update({ privateKeyPath: selected });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDraft(null);
    sessionStore.saveForm(session);
  };

  const handleClose = () => {
    setDraft(null);
    sessionStore.closeForm();
  };

  const isNew = !sessionStore.sessions.some((s) => s.id === session.id);
  const errors = sessionStore.formErrors;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={styles.title}>
          {isNew ? "Новая сессия" : "Редактирование сессии"}
        </h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="session-name">
              Название
            </label>
            <input
              id="session-name"
              className={styles.input}
              value={session.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            {errors.name && <span className={styles.error}>{errors.name}</span>}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="session-protocol">
                Протокол
              </label>
              <select
                id="session-protocol"
                className={styles.select}
                value={session.protocol}
                onChange={(e) =>
                  handleProtocolChange(e.target.value as Protocol)
                }
              >
                <option value="ssh">SSH</option>
                <option value="sftp">SFTP</option>
                <option value="ftp">FTP</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="session-port">
                Порт
              </label>
              <input
                id="session-port"
                className={styles.input}
                type="number"
                min={1}
                max={65535}
                value={session.port}
                onChange={(e) => update({ port: Number(e.target.value) })}
              />
              {errors.port && (
                <span className={styles.error}>{errors.port}</span>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="session-host">
              Host
            </label>
            <input
              id="session-host"
              className={styles.input}
              value={session.host}
              onChange={(e) => update({ host: e.target.value })}
            />
            {errors.host && <span className={styles.error}>{errors.host}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="session-username">
              Username
            </label>
            <input
              id="session-username"
              className={styles.input}
              value={session.username}
              onChange={(e) => update({ username: e.target.value })}
            />
            {errors.username && (
              <span className={styles.error}>{errors.username}</span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="session-auth">
              Аутентификация
            </label>
            <select
              id="session-auth"
              className={styles.select}
              value={session.protocol === "ftp" ? "password" : session.authType}
              disabled={session.protocol === "ftp"}
              onChange={(e) => update({ authType: e.target.value as AuthType })}
            >
              <option value="password">Password</option>
              {session.protocol !== "ftp" && (
                <>
                  <option value="privateKey">Private Key</option>
                  <option value="agent">SSH Agent</option>
                </>
              )}
            </select>
          </div>

          {session.authType === "privateKey" && session.protocol !== "ftp" && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="session-key">
                Путь к ключу
              </label>
              <div className={styles.keyRow}>
                <input
                  id="session-key"
                  className={styles.input}
                  value={session.privateKeyPath ?? ""}
                  onChange={(e) => update({ privateKeyPath: e.target.value })}
                />
                <button
                  type="button"
                  className={styles.browseBtn}
                  onClick={handleBrowseKey}
                >
                  Обзор
                </button>
              </div>
              {errors.privateKeyPath && (
                <span className={styles.error}>{errors.privateKeyPath}</span>
              )}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="session-default-path">
              Начальный путь (опционально)
            </label>
            <input
              id="session-default-path"
              className={styles.input}
              value={session.defaultPath ?? ""}
              onChange={(e) => update({ defaultPath: e.target.value })}
              placeholder="/home/user"
            />
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnCancel}`}
              onClick={handleClose}
            >
              Отмена
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnSave}`}>
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
