# TermaSSH — План разработки

Краткий поэтапный план от текущего состояния (пустой Vite + React) до MVP с полным заявленным функционалом.

## Текущее состояние

- [x] React 18 + TypeScript + Vite
- [ ] Tauri
- [ ] MobX, xterm.js
- [ ] Rust backend

**Оценка MVP:** 6–10 недель (1 разработчик), при условии POC SSH в фазе 1.

---

## Фаза 0 — Подготовка (3–5 дней)

**Цель:** рабочий каркас desktop-приложения.

| # | Задача | Результат |
|---|--------|-----------|
| 0.1 | `tauri init`, настройка `tauri.conf.json` | `npm run tauri dev` открывает окно |
| 0.2 | Структура папок (`components`, `stores`, `ipc`, `src-tauri/src/services`) | Согласно [architecture.md](./architecture.md) |
| 0.3 | AppShell: sidebar + main area + tab bar заглушки | Визуальный layout |
| 0.4 | MobX root, пустые stores | Подключение observer |
| 0.5 | IPC-заглушка `ping` Rust ↔ React | Проверка моста |

**Критерий готовности:** окно приложения с sidebar и пустой рабочей областью.

---

## Фаза 1 — Сессии и конфигурации (1–1.5 недели)

**Цель:** CRUD сессий, сохранение на диск, import/export.

| # | Задача | Результат |
|---|--------|-----------|
| 1.1 | Модель `SessionConfig` + Zod-схема | Типы TS + валидация |
| 1.2 | `ConfigService` в Rust (read/write JSON) | `sessions.json` в app_data |
| 1.3 | Tauri commands: `config_list`, `config_save`, `config_import`, `config_export` | IPC |
| 1.4 | `SessionStore` + `SessionList` UI | Список сессий в sidebar |
| 1.5 | `SessionForm` modal | host, username, port, authType, privateKeyPath |
| 1.6 | Import/Export через dialog | Загрузка и сохранение конфигов |

**Критерий готовности:** сессии создаются, редактируются, переживают перезапуск, экспортируются в файл.

---

## Фаза 2 — SSH терминал (2–3 недели)

**Цель:** подключение по SSH, интерактивный терминал, несколько вкладок.

| # | Задача | Результат |
|---|--------|-----------|
| 2.1 | **POC** `russh`: connect + shell + read/write | Проверка до UI |
| 2.2 | `ConnectionPool` + `SshService` | Управление жизненным циклом |
| 2.3 | Auth: password, private key (path), agent (опционально) | По конфигу сессии |
| 2.4 | IPC: `connect`, `disconnect`, `write_terminal`, `resize_terminal` | |
| 2.5 | Events: `terminal-output`, `connection-status` | Поток в UI |
| 2.6 | `TerminalStore` + xterm.js интеграция | |
| 2.7 | `TerminalWorkspace`: вкладки, новый/закрыть | |
| 2.8 | Dblclick на сессии → `openTab` + auto-connect | Требование п.4, п.6 |
| 2.9 | Обработка ошибок (timeout, auth failed, host unreachable) | UX сообщения |

**Критерий готовности:** несколько параллельных SSH-сессий в отдельных вкладках, ввод/вывод работает.

---

## Фаза 3 — SFTP Browser (1.5–2 недели)

**Цель:** просмотр файлов, навигация, загрузка/скачивание.

| # | Задача | Результат |
|---|--------|-----------|
| 3.1 | `SftpService` поверх существующего SSH-соединения | Multiplexing |
| 3.2 | IPC: `sftp_list_dir`, `sftp_download`, `sftp_upload`, `sftp_mkdir` | |
| 3.3 | `SftpBrowserStore` привязан к `activeTab.connectionId` | |
| 3.4 | UI: breadcrumbs, список файлов, иконки dir/file | Sidebar tab «SSH Browser» |
| 3.5 | Upload: dialog → remote path | |
| 3.6 | Download в выбранную локальную папку | |
| 3.7 | Placeholder когда нет активной сессии | |

**Критерий готовности:** при активном SSH-терминале SFTP-таб показывает удалённые файлы, переход по папкам, upload работает.

---

## Фаза 4 — FTP (1 неделя)

**Цель:** подключение по FTP, базовый файловый браузер.

| # | Задача | Результат |
|---|--------|-----------|
| 4.1 | `FtpService` (suppaftp) | connect/list/transfer |
| 4.2 | Расширить `SessionConfig.protocol = 'ftp'` | |
| 4.3 | Переиспользовать SftpBrowser UI с адаптером по протоколу | Или `FileBrowser` generic |
| 4.4 | FTP-only сессии без терминала (опционально) | |

**Критерий готовности:** FTP-сессия из списка, просмотр и загрузка файлов.

---

## Фаза 5 — Полировка и релиз (1–1.5 недели)

| # | Задача | Результат |
|---|--------|-----------|
| 5.1 | Глобальные настройки (тема, шрифт терминала, default port) | `settings.json` |
| 5.2 | Keyboard shortcuts (new tab, close tab, focus sidebar) | |
| 5.3 | Статус-бар: host, latency, connection state | |
| 5.4 | Логирование (`tracing` + файл логов в dev) | |
| 5.5 | `tauri build` Windows installer | MSI |
| 5.6 | README пользователя (отдельно от dev docs) | |

---

## Backlog (после MVP)

- OS keychain для паролей
- SFTP: rename, delete, chmod
- Скроллбэк терминала на диск
- Поиск по сессиям
- Туннели / port forwarding
- Snippets / saved commands
- Темы xterm (Solarized, Dracula)
- macOS / Linux сборки

---

## Порядок приоритетов (MoSCoW)

| Must | Should | Could |
|------|--------|-------|
| SSH терминал | FTP | Port forwarding |
| Множественные вкладки | Download SFTP | Keychain |
| Сохранение сессий | Import merge (не только replace) | Темы |
| SFTP browser + upload | Agent auth | |
| Sidebar: сессии + SFTP tab | | |
| host, user, key path в настройках | | |

---

## Контрольные точки

```
Неделя 1   → Фаза 0 + 1 (сессии на диске)
Неделя 3   → Фаза 2 (первый рабочий SSH терминал)
Неделя 5   → Фаза 2 завершена (multi-tab)
Неделя 7   → Фаза 3 (SFTP browser)
Неделя 8   → Фаза 4 (FTP)
Неделя 9–10 → Фаза 5 (polish + build)
```

---

## Первые три задачи для старта кодирования

1. **Tauri init** — встроить в существующий Vite-проект.
2. **AppShell + SessionForm + SessionStore** — UI сессий без сети.
3. **Rust POC** — одна команда `test_ssh_connect` с хардкод host/user/key для проверки `russh` на целевой ОС.
