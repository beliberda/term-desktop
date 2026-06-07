import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { useStores } from "@stores/index";
import {
  getDefaultPort,
  translateSessionValidationMessage,
  type AuthType,
  type FileConflictPolicy,
  type Protocol,
  type SessionConfig,
} from "@/types";
import styles from "./SessionForm.module.css";

export const SessionForm = observer(function SessionForm() {
  const { t } = useTranslation();
  const { sessionStore, settingsStore } = useStores();
  const [draft, setDraft] = useState<SessionConfig | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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

  const handleBrowseLocalPath = async () => {
    const selected = await open({ directory: true });
    if (typeof selected === "string") {
      update({ localPath: selected });
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
          {isNew ? t("session.newSession") : t("session.editSession")}
        </h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="session-name">
              {t("session.form.name")}
            </label>
            <input
              id="session-name"
              className={styles.input}
              value={session.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            {errors.name && (
              <span className={styles.error}>
                {translateSessionValidationMessage("name", errors.name)}
              </span>
            )}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="session-protocol">
                {t("session.form.protocol")}
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
                {t("session.form.port")}
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
                <span className={styles.error}>
                  {translateSessionValidationMessage("port", errors.port)}
                </span>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="session-host">
              {t("session.form.host")}
            </label>
            <input
              id="session-host"
              className={styles.input}
              value={session.host}
              onChange={(e) => update({ host: e.target.value })}
            />
            {errors.host && (
              <span className={styles.error}>
                {translateSessionValidationMessage("host", errors.host)}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="session-username">
              {t("session.form.username")}
            </label>
            <input
              id="session-username"
              className={styles.input}
              value={session.username}
              onChange={(e) => update({ username: e.target.value })}
            />
            {errors.username && (
              <span className={styles.error}>
                {translateSessionValidationMessage("username", errors.username)}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="session-auth">
              {t("session.form.auth")}
            </label>
            <select
              id="session-auth"
              className={styles.select}
              value={session.protocol === "ftp" ? "password" : session.authType}
              disabled={session.protocol === "ftp"}
              onChange={(e) => update({ authType: e.target.value as AuthType })}
            >
              <option value="password">{t("session.form.authPassword")}</option>
              {session.protocol !== "ftp" && (
                <>
                  <option value="privateKey">{t("session.form.authPrivateKey")}</option>
                  <option value="agent">{t("session.form.authAgent")}</option>
                </>
              )}
            </select>
          </div>

          {session.authType === "privateKey" && session.protocol !== "ftp" && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="session-key">
                {t("session.form.keyPath")}
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
                  {t("common.browse")}
                </button>
              </div>
              {errors.privateKeyPath && (
                <span className={styles.error}>
                  {translateSessionValidationMessage(
                    "privateKeyPath",
                    errors.privateKeyPath,
                  )}
                </span>
              )}
            </div>
          )}

          {(session.protocol === "ssh" || session.protocol === "sftp") && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="session-default-path">
                {t("session.form.defaultPath")}
              </label>
              <input
                id="session-default-path"
                className={styles.input}
                value={session.defaultPath ?? ""}
                onChange={(e) => update({ defaultPath: e.target.value })}
                placeholder={t("session.form.defaultPathPlaceholder")}
              />
            </div>
          )}

          {(session.protocol === "ftp" || session.protocol === "sftp") && (
            <div className={styles.advanced}>
              <button
                type="button"
                className={styles.advancedToggle}
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                {t("session.form.advanced")}
                {advancedOpen ? " ▲" : " ▼"}
              </button>
              {advancedOpen && (
                <div className={styles.advancedBody}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="session-local-path">
                      {t("session.form.localPath")}
                    </label>
                    <div className={styles.keyRow}>
                      <input
                        id="session-local-path"
                        className={styles.input}
                        value={session.localPath ?? ""}
                        onChange={(e) => update({ localPath: e.target.value })}
                        placeholder={t("session.form.localPathPlaceholder")}
                      />
                      <button
                        type="button"
                        className={styles.browseBtn}
                        onClick={handleBrowseLocalPath}
                      >
                        {t("common.browse")}
                      </button>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="session-remote-path">
                      {t("session.form.remotePath")}
                    </label>
                    <input
                      id="session-remote-path"
                      className={styles.input}
                      value={session.remotePath ?? session.defaultPath ?? ""}
                      onChange={(e) =>
                        update({
                          remotePath: e.target.value,
                          defaultPath: e.target.value,
                        })
                      }
                      placeholder={t("session.form.defaultPathPlaceholder")}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={session.syncBrowse !== false}
                        onChange={(e) => update({ syncBrowse: e.target.checked })}
                      />
                      {t("session.form.syncBrowse")}
                    </label>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="session-conflict-policy">
                      {t("session.form.conflictPolicy")}
                    </label>
                    <select
                      id="session-conflict-policy"
                      className={styles.select}
                      value={session.fileConflictPolicy ?? "ask"}
                      onChange={(e) =>
                        update({
                          fileConflictPolicy: e.target.value as FileConflictPolicy,
                        })
                      }
                    >
                      <option value="ask">{t("session.form.conflictAsk")}</option>
                      <option value="alwaysReplace">
                        {t("session.form.conflictAlwaysReplace")}
                      </option>
                      <option value="replaceIfDifferentSize">
                        {t("session.form.conflictIfSize")}
                      </option>
                      <option value="replaceIfDifferentSizeOrNewer">
                        {t("session.form.conflictIfSizeOrNewer")}
                      </option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnCancel}`}
              onClick={handleClose}
            >
              {t("common.cancel")}
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnSave}`}>
              {t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
