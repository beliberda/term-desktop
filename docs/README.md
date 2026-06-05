# TermaSSH — Документация

Desktop SSH/SFTP/FTP клиент (аналог MobaXterm).

## Содержание

| Документ | Описание |
|----------|----------|
| [architecture.md](./architecture.md) | Архитектура: слои, модули, потоки данных, модели |
| [tech-stack.md](./tech-stack.md) | Стек технологий и обоснование выбора |
| [development-plan.md](./development-plan.md) | Поэтапный план разработки MVP |

## Краткое резюме

**Стек:** React 18, TypeScript, Vite, Tauri 2, MobX, xterm.js, Rust (russh, russh-sftp, suppaftp).

**Архитектура:** UI на React + MobX → Tauri IPC → Rust-сервисы (SSH/SFTP/FTP, конфиги, пул соединений).

**MVP:** сессии с persist → SSH multi-tab терминал → SFTP browser → FTP → сборка installer.
