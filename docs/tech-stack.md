# TermaSSH — Технологический стек

## Рекомендация

Предложенный стек **React + TypeScript + Tauri + MobX** — оптимальный выбор для данного проекта. Ниже — конкретные версии, библиотеки и обоснование. Альтернативы указаны там, где есть осмысленный выбор.

## Сводная таблица

| Слой | Технология | Версия (ориентир) |
|------|------------|-------------------|
| Desktop shell | **Tauri** | 2.x |
| UI framework | **React** | 18.x |
| Язык | **TypeScript** | 5.x |
| Сборка frontend | **Vite** | 5.x (уже в проекте) |
| State management | **MobX** | 6.x + mobx-react-lite |
| Терминал | **xterm.js** | 5.x + addons (fit, web-links) |
| Backend | **Rust** | edition 2021, stable |
| SSH/SFTP | **russh** + **russh-sftp** | latest compatible |
| FTP | **suppaftp** | async |
| Валидация конфигов | **Zod** | 3.x |
| Стили | **CSS Modules** или **Tailwind** | на выбор команды |
| Линтинг | ESLint + Prettier | уже частично есть |

## Почему Tauri, а не Electron

| Критерий | Tauri | Electron |
|----------|-------|----------|
| Размер бинарника | ~5–15 MB | ~150+ MB |
| SSH/FTP в native | Rust crates — зрелые, быстрые | node-ssh2 — ок, но тяжелее runtime |
| Безопасность | IPC whitelist, minimal surface | Node в renderer — больше рисков |
| Память | Ниже | Выше |

Для SSH-клиента сетевой стек в Rust — главное преимущество Tauri.

## Почему MobX, а не Redux / Zustand

| Критерий | MobX | Zustand | Redux Toolkit |
|----------|------|---------|---------------|
| Множество терминалов с потоковым output | Observables + auto re-render | Ручные подписки | Много boilerplate |
| Связанные stores (session ↔ tab ↔ sftp) | `reaction`, `computed` | compose вручную | slices + middleware |
| Сложность | Средняя | Низкая | Высокая |

MobX хорошо ложится на модель «много живых подключений с частыми обновлениями». Zustand допустим при желании упростить, но для MobaXterm-подобного UI MobX предпочтительнее.

## Frontend — детали

### React + TypeScript + Vite

Уже инициализирован в репозитории. Vite даёт быстрый HMR при разработке с `tauri dev`.

### MobX

```
mobx
mobx-react-lite    # observer() HOC / hook
```

Паттерн: один store на домен (`SessionStore`, `TerminalStore`, `SftpBrowserStore`), root store при необходимости.

### xterm.js

```
@xterm/xterm
@xterm/addon-fit
@xterm/addon-web-links
```

- `FitAddon` — resize под контейнер
- Данные из Rust → `term.write Uint8Array`
- Ввод пользователя → IPC `write_terminal`

### UI-компоненты

Минимальные зависимости на старте (нативные элементы + CSS). Опционально:

- **Radix UI** — доступные примитивы (Dialog, Tabs) без тяжёлого дизайн-системы
- **lucide-react** — иконки

Tailwind — если нужна скорость вёрстки; CSS Modules — если важен минимальный bundle.

### Zod

Валидация `SessionConfig` при import и в формах до отправки в Rust.

## Backend (Rust / Tauri 2)

### Основные crates

```toml
[dependencies]
tauri = { version = "2", features = [...] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
russh = "..."
russh-keys = "..."
russh-sftp = "..."
suppaftp = "..."
tracing = "0.1"
uuid = { version = "1", features = ["v4"] }
anyhow = "1"
thiserror = "1"
```

### Tauri plugins

| Plugin | Назначение |
|--------|------------|
| `dialog` | Выбор файлов (ключ, upload, import config) |
| `fs` | Чтение/запись конфигов (с scope) |
| `store` | Опционально для мелких UI-настроек |

### Потоковая передача терминала

Rust async read loop на PTY → `app.emit("terminal-output", { connectionId, data })`  
Альтернатива: Tauri channels (2.x) для высокочастотного binary stream.

## Протоколы

| Протокол | Реализация | Примечание |
|----------|------------|------------|
| SSH shell | russh + PTY | Основной сценарий |
| SFTP | russh-sftp на том же SSH | Browser + transfer |
| FTP | suppaftp | Отдельное соединение, отдельная ветка UI |

## Хранение данных

| Данные | Место | Формат |
|--------|-------|--------|
| Сессии | `app_data_dir/sessions.json` | JSON, schema v1 |
| Настройки приложения | `app_data_dir/settings.json` | JSON |
| Пароли | Не в plain text (фаза 2: keychain) | — |
| Пути к ключам | В SessionConfig | string path |

## Инструменты разработки

| Инструмент | Назначение |
|------------|------------|
| `tauri dev` | Dev с hot reload |
| `tauri build` | Production bundle |
| `cargo clippy` | Rust lint |
| ESLint | TS/React lint |
| `rustfmt` | Форматирование Rust |

## Что сознательно не берём на старте

| Технология | Причина |
|------------|---------|
| Electron | Тяжёлый runtime |
| Redux | Избыточен для connection-oriented UI |
| node-ssh2 в renderer | Нарушает модель безопасности Tauri |
| Полный UI-kit (MUI, Ant) | Лишний вес; достаточно примитивов |
| Встроенный RDP/VNC | Вне scope MVP |

## Совместимость с текущим репозиторием

Сейчас: React 18 + TS + Vite (без Tauri, без MobX).

Шаги интеграции:

1. `npm create tauri-app` / `tauri init` поверх существующего Vite
2. `npm install mobx mobx-react-lite @xterm/xterm zod`
3. Добавить `src-tauri/` с Rust-сервисами
4. Обновить `package.json` scripts: `tauri dev`, `tauri build`
