# TermaSSH — Архитектура

## Обзор

TermaSSH — desktop-приложение (аналог MobaXterm) для SSH-терминалов, SFTP/FTP-браузера и управления сессиями подключения. Архитектура строится на разделении UI (React) и сетевой/системной логики (Rust через Tauri).

## Цели архитектуры

- **Безопасность** — ключи и пароли не покидают backend; UI получает только результаты операций.
- **Множественные сессии** — каждый терминал = независимое подключение с собственным жизненным циклом.
- **Расширяемость** — протоколы (SSH, SFTP, FTP) изолированы в отдельных сервисах Rust.
- **Переносимость конфигов** — сериализуемые сессии в JSON с версионированием схемы.

## Высокоуровневая схема

```
┌──────────────────────────────────────────────────────────────────┐
│                        Presentation (React)                       │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │
│  │ AppShell    │  │ TerminalWorkspace │  │ SessionSettingsModal│  │
│  │ Sidebar     │  │ (xterm.js tabs)   │  │ Import/Export       │  │
│  │ - Sessions  │  │                   │  │                     │  │
│  │ - SFTP tab  │  │                   │  │                     │  │
│  └─────────────┘  └──────────────────┘  └─────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ SftpBrowser (дерево файлов, upload/download, breadcrumbs)   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬──────────────────────────────────┘
                                │ Tauri IPC
                    invoke (commands) + listen (events/stream)
┌───────────────────────────────┴──────────────────────────────────┐
│                         Application (MobX)                          │
│  SessionStore │ TerminalStore │ SftpBrowserStore │ AppStore         │
└───────────────────────────────┬──────────────────────────────────┘
                                │ typed IPC adapter (TypeScript)
┌───────────────────────────────┴──────────────────────────────────┐
│                      Backend (Rust / Tauri 2)                       │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ ConnectionPool │  │ ConfigService  │  │ CredentialVault  │  │
│  │ (session map)  │  │ (JSON I/O)     │  │ (key paths)      │  │
│  └───────┬────────┘  └────────────────┘  └──────────────────┘  │
│          │                                                        │
│  ┌───────┴────────┬─────────────────┬──────────────────────┐    │
│  │ SshService     │ SftpService     │ FtpService           │    │
│  │ (PTY + shell)  │ (list/read/     │ (list/upload/        │    │
│  │                │  write/upload)  │  download)           │    │
│  └────────────────┘ └─────────────────┴──────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Слои и ответственность

### 1. Presentation (React + TypeScript)

| Модуль | Назначение |
|--------|------------|
| `AppShell` | Layout: sidebar + main area + status bar |
| `Sidebar` | Табы «Сессии» / «SSH Browser» |
| `SessionList` | Список сохранённых сессий; dblclick → новый терминал |
| `TerminalWorkspace` | Tab bar + активный xterm; создание/закрытие вкладок |
| `SftpBrowser` | Файловый браузер привязан к **активной** сессии |
| `SessionForm` | CRUD сессии: host, username, port, auth type, key path |
| `ConfigImportExport` | Загрузка/сохранение конфигов (файл) |

UI не содержит сетевой логики — только вызывает stores и отображает observable-состояние.

### 2. State (MobX)

| Store | Состояние | Действия |
|-------|-----------|----------|
| `SessionStore` | `sessions[]`, выбранная сессия | CRUD, import/export, persist |
| `TerminalStore` | `tabs[]`, `activeTabId`, статус подключения | open/close tab, connect, send input |
| `SftpBrowserStore` | cwd, entries, loading, привязка к `sessionId` | listDir, navigate, upload, download |
| `AppStore` | sidebar tab, theme, глобальные настройки | UI preferences |

**Связь сессия ↔ терминал ↔ SFTP:**

```
Session (config) ──dblclick──► TerminalTab (runtime connection)
                                      │
                                      ▼
                              activeTab.sessionId
                                      │
                    SSH Browser tab reads this id
```

SFTP-браузер всегда работает с `TerminalStore.activeTab.sessionId`. Если активной вкладки нет — показывается placeholder.

### 3. IPC Bridge (TypeScript)

Тонкий слой `src/ipc/` с типизированными обёртками над `invoke` и `listen`:

```typescript
// Пример контракта
connectSession(sessionId: string): Promise<{ connectionId: string }>
disconnect(connectionId: string): Promise<void>
writeTerminal(connectionId: string, data: string): Promise<void>
// events: terminal-output, connection-status
listSftpDir(connectionId: string, path: string): Promise<SftpEntry[]>
uploadSftpFile(connectionId: string, localPath: string, remotePath: string): Promise<void>
```

Типы команд дублируются в Rust (`serde`) и TypeScript (`zod` или hand-written interfaces).

### 4. Backend (Rust)

#### ConnectionPool

Центральный реестр активных подключений:

```rust
HashMap<ConnectionId, ConnectionHandle>
```

`ConnectionHandle` хранит тип протокола, канал PTY (SSH) или SFTP-сессию, метаданные (host, session config id).

#### Сервисы протоколов

| Сервис | Crate (рекомендация) | Операции |
|--------|----------------------|----------|
| SSH + PTY | `russh`, `russh-keys` | connect, shell, resize, disconnect |
| SFTP | `russh-sftp` (поверх SSH) | readdir, stat, get, put, mkdir |
| FTP | `suppaftp` (async) | connect, list, retr, stor |

SSH и SFTP используют **одно** SSH-соединение на `ConnectionId`: при открытии терминала поднимается shell; SFTP-канал открывается по тому же соединению (multiplexing).

#### ConfigService

- Путь: `{app_data}/sessions.json`, `{app_data}/settings.json`
- Версия схемы в файле для миграций
- Import/export — чтение/запись через Tauri dialog + fs

#### CredentialVault

- Хранит **пути** к ключам, не содержимое ключей в конфиге
- Опционально: OS keychain для passphrase (фаза 2)
- Валидация существования файла ключа перед connect

## Модели данных

### SessionConfig (сохраняемая сессия)

```typescript
interface SessionConfig {
  id: string;
  name: string;
  protocol: 'ssh' | 'sftp' | 'ftp';
  host: string;
  port: number;           // default: 22 / 21
  username: string;
  authType: 'password' | 'privateKey' | 'agent';
  privateKeyPath?: string;  // абсолютный или ~-expanded путь
  // password не сохраняется в plain JSON по умолчанию
  defaultPath?: string;     // начальный cwd для SFTP browser
  createdAt: string;
  updatedAt: string;
}
```

### TerminalTab (runtime)

```typescript
interface TerminalTab {
  id: string;
  sessionId: string;        // ссылка на SessionConfig
  connectionId?: string;    // id в ConnectionPool после connect
  title: string;            // name + host
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}
```

### SftpEntry

```typescript
interface SftpEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt?: string;
}
```

## Потоки (ключевые сценарии)

### Открытие терминала по сессии

```
User dblclick Session
  → TerminalStore.openTab(sessionId)
  → IPC connectSession(sessionId)
  → Rust: resolve config, auth, SshService::connect
  → emit connection-status: connected
  → spawn read loop → emit terminal-output chunks
  → xterm.write(data)
```

### SSH Browser (активная сессия)

```
User switches to SFTP tab
  → SftpBrowserStore.setConnection(activeTab.connectionId)
  → IPC listSftpDir(connectionId, cwd)
  → render tree + breadcrumbs
User click folder → navigate
User upload → dialog pick file → IPC uploadSftpFile
```

### Сохранение конфигов

```
SessionStore.save()
  → IPC config_save(sessions)
  → Rust ConfigService writes JSON

Import: dialog → read file → validate schema → merge/replace sessions
```

## Структура репозитория (целевая)

```
TermaSSH/
├── src/                          # React frontend
│   ├── components/
│   │   ├── layout/
│   │   ├── sidebar/
│   │   ├── terminal/
│   │   └── sftp/
│   ├── stores/                   # MobX
│   ├── ipc/                      # Tauri bridge
│   ├── types/
│   └── App.tsx
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── commands/             # Tauri #[tauri::command]
│   │   ├── services/
│   │   │   ├── ssh.rs
│   │   │   ├── sftp.rs
│   │   │   ├── ftp.rs
│   │   │   └── config.rs
│   │   ├── connection_pool.rs
│   │   └── lib.rs
│   └── Cargo.toml
├── docs/
└── package.json
```

## Нефункциональные требования

| Аспект | Решение |
|--------|---------|
| Производительность терминала | Stream output через events; буферизация в Rust |
| Большие каталоги SFTP | Пагинация / virtual list (TanStack Virtual) |
| Ошибки сети | Retry policy только по явному действию пользователя |
| Логирование | `tracing` в Rust; dev-only console в UI |
| Сборка | Tauri bundler → MSI (Windows), deb/AppImage (Linux), dmg (macOS) |

## Риски и митигация

| Риск | Митигация |
|------|-----------|
| Сложность `russh` API | POC подключения в фазе 1 до UI |
| Windows paths для ключей | Нормализация путей в CredentialVault |
| FTP vs SFTP разная модель | Отдельные ветки в SftpBrowserStore по `protocol` |
| Утечка соединений при закрытии tab | `Drop` на ConnectionHandle + explicit disconnect IPC |
