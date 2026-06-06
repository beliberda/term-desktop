# TermaSSH

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white)](https://tauri.app/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)](#installation)

**Open-source desktop SSH client with built-in SFTP/FTP file browser.**

TermaSSH is a lightweight alternative to [MobaXterm](https://mobaxterm.mobatek.net/) — focused on the workflows developers use every day: multi-tab SSH terminals, session management, and remote file transfers. Built with **Tauri 2** (Rust backend + React frontend) for a small footprint and native performance.

## Features

- **Multi-tab SSH terminal** — run several connections side by side
- **Session manager** — save, organize, import/export connections (SSH, SFTP, FTP)
- **SFTP file browser** — browse and transfer files over the active SSH connection
- **FTP support** — standalone file browser without a terminal session
- **Authentication** — password or private key (SSH key path stored in session config)
- **Themes** — dark and light UI; customizable terminal font and size
- **Keyboard shortcuts** — quick connect, close tab, toggle sidebar
- **i18n** — English, Russian, German, Italian, Chinese

## Why TermaSSH?

| | TermaSSH | MobaXterm |
|---|----------|-----------|
| License | MIT, fully open source | Freemium / proprietary |
| Stack | Tauri + Rust + React | Native / bundled tools |
| Extensible | Fork, inspect, contribute | Closed source |
| Focus | SSH, SFTP, FTP essentials | All-in-one toolbox |

## Installation

### Pre-built binaries

Download the latest installer from [**GitHub Releases**](https://github.com/beliberda/term-desktop/releases):

| Platform | Files |
|----------|-------|
| **Windows** | `TermaSSH_*_x64-setup.exe` (NSIS) or `TermaSSH_*_x64_en-US.msi` |
| **macOS** | `.dmg` (Apple Silicon & Intel) |
| **Linux** | `.AppImage`, `.deb` |

On Windows: run the installer and launch TermaSSH from the Start menu.

### Build from source

**Requirements:** [Node.js 18+](https://nodejs.org/), [Rust stable](https://rustup.rs/), and [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

On Windows you also need [C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

```bash
git clone https://github.com/beliberda/term-desktop.git
cd term-desktop
npm install
npm run tauri:build
```

Installers are generated in `src-tauri/target/release/bundle/`.

See [docs/build-and-deploy.md](./docs/build-and-deploy.md) for detailed platform instructions.

## Usage

### Sessions

- **Sessions tab** — list of saved connections
- **+** — create a new session (SSH, SFTP, or FTP)
- **Click** a session — connect (SSH opens a terminal; FTP opens the file browser)
- **Right-click** — connect, edit, duplicate, or delete
- **Import / Export** — backup and restore `sessions.json`

> FTP sessions support password authentication only.

### Terminal

- Open multiple SSH tabs at once
- Password-protected sessions prompt for credentials on connect
- Key-based sessions connect automatically (key path configured in session settings)

### File browser

Switch to the **Files** tab in the sidebar:

- **SSH/SFTP** — uses the active terminal connection (SFTP over the same SSH session)
- **FTP** — standalone connection; opens automatically when you click an FTP session

Supported operations: navigation, breadcrumbs, upload, download (files and folders recursively), create folder.

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | Connect selected session (or focus session list) |
| `Ctrl+W` | Close active terminal tab |
| `Ctrl+B` | Toggle sidebar: Sessions ↔ Files |

### Settings

Click **⚙** in the sessions panel to configure:

- UI theme (dark / light)
- Terminal font and size
- Default SSH and FTP ports for new sessions

Settings are stored in `settings.json` in the application data directory.

## Tech stack

| Layer | Technology |
|-------|------------|
| Desktop shell | [Tauri 2](https://tauri.app/) |
| Backend | Rust — [russh](https://crates.io/crates/russh), [russh-sftp](https://crates.io/crates/russh-sftp), [suppaftp](https://crates.io/crates/suppaftp) |
| Frontend | React 18, TypeScript, Vite |
| State | MobX |
| Terminal | [xterm.js](https://xtermjs.org/) |

Credentials and network logic stay in the Rust backend — the UI never handles keys or passwords directly.

## Development

```bash
npm run tauri:dev   # dev mode with hot reload
npm run lint        # ESLint
```

Additional documentation (architecture, build details):

- [docs/architecture.md](./docs/architecture.md)
- [docs/build-and-deploy.md](./docs/build-and-deploy.md)
- [docs/tech-stack.md](./docs/tech-stack.md)

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions and guidelines.

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

This project is licensed under the [MIT License](./LICENSE).

## Acknowledgments

Inspired by the daily-driver workflow of MobaXterm, rebuilt as a transparent, community-driven alternative.
