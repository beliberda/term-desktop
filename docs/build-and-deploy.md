# TermaSSH — Сборка и развёртывание

Руководство по установке зависимостей, локальной сборке и подготовке релизов.

## Общие требования

| Компонент | Минимальная версия | Назначение |
|-----------|-------------------|------------|
| [Node.js](https://nodejs.org/) | 18+ (рекомендуется 20 LTS или 22) | Frontend, npm-скрипты, Tauri CLI |
| [Rust](https://www.rust-lang.org/tools/install) | stable ≥ 1.77 (см. `rust-version` в `src-tauri/Cargo.toml`) | Backend Tauri, SSH/SFTP/FTP |
| npm | поставляется с Node.js | Установка зависимостей и запуск скриптов |
| Git | любая актуальная | Клонирование репозитория |

Установка Rust (все платформы):

```bash
# https://rustup.rs/
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable
```

Проверка окружения:

```bash
node -v
npm -v
rustc --version
cargo --version
```

## Зависимости по операционным системам

### Windows

TermaSSH ориентирован на Windows (аналог MobaXterm). Сборка и запуск поддерживаются на Windows 10/11.

| Зависимость | Обязательна | Описание |
|-------------|-------------|----------|
| [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) или Visual Studio 2022 | да | Компонент **Desktop development with C++** (MSVC, Windows SDK) |
| [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) | да (для запуска) | Рендер UI; обычно уже установлен в Windows 10/11 |
| VBScript | только для MSI | Нужен для WiX/MSI; включён по умолчанию в большинстве установок Windows |

После установки Build Tools, если Rust уже был установлен ранее:

```powershell
rustup default stable-msvc
```

**Ссылки:**

- [Tauri — Prerequisites (Windows)](https://v2.tauri.app/start/prerequisites/#windows)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
- [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/#download-section)

### macOS

| Зависимость | Обязательна | Описание |
|-------------|-------------|----------|
| Xcode Command Line Tools | да | Компилятор Clang, линковщик |
| Xcode (полный) | только для iOS | Для desktop достаточно CLI Tools |

```bash
xcode-select --install
```

**Ссылки:**

- [Tauri — Prerequisites (macOS)](https://v2.tauri.app/start/prerequisites/#macos)
- [Apple Developer — Command Line Tools](https://developer.apple.com/xcode/resources/)

### Linux

Системные библиотеки зависят от дистрибутива. Нужны WebKit2GTK, OpenSSL, инструменты сборки и зависимости для system tray.

#### Debian / Ubuntu

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

#### Arch Linux

```bash
sudo pacman -Syu
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  base-devel \
  curl \
  wget \
  file \
  openssl \
  appmenu-gtk-module \
  libappindicator-gtk3 \
  librsvg \
  xdotool
```

#### Fedora

```bash
sudo dnf check-update
sudo dnf install webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  libxdo-devel
sudo dnf group install "c-development"
```

#### openSUSE

```bash
sudo zypper up
sudo zypper in webkit2gtk3-devel \
  libopenssl-devel \
  curl \
  wget \
  file \
  libappindicator3-1 \
  librsvg-devel
sudo zypper in -t pattern devel_basis
```

**Ссылки:**

- [Tauri — Prerequisites (Linux)](https://v2.tauri.app/start/prerequisites/#linux)
- [Tauri — Linux setup (подробно)](https://v2.tauri.app/start/prerequisites/)

## Первичная настройка проекта

```bash
git clone https://github.com/beliberda/term-desktop.git TermaSSH
cd TermaSSH
npm install
```

Команда `npm install` устанавливает:

- frontend: React 18, Vite 5, TypeScript 5, MobX, xterm.js, Zod;
- dev: `@tauri-apps/cli` 2.x, ESLint;
- Rust-зависимости подтягиваются при первом `cargo build` / `tauri build`.

## Разработка

```bash
npm run tauri:dev
```

Запускает Vite dev-сервер (`http://localhost:5173`) и Tauri в режиме hot reload.

Дополнительно:

```bash
npm run lint          # ESLint для TypeScript/React
cargo clippy          # из каталога src-tauri/
cargo fmt             # форматирование Rust
```

## Production-сборка

```bash
npm run tauri:build
```

Последовательность:

1. `npm run build` — TypeScript + Vite → каталог `build/`;
2. `cargo build --release` — Rust backend;
3. упаковка инсталляторов (см. `bundle.targets: "all"` в `src-tauri/tauri.conf.json`).

Первая сборка может занять 10–20 минут (скачивание и компиляция Rust crates).

### Артефакты сборки

Путь относительно корня репозитория:

| Платформа | Формат | Путь |
|-----------|--------|------|
| Windows x64 | NSIS `.exe` | `src-tauri/target/release/bundle/nsis/TermaSSH_<version>_x64-setup.exe` |
| Windows x64 | MSI (WiX) | `src-tauri/target/release/bundle/msi/TermaSSH_<version>_x64_en-US.msi` |
| Windows x64 | MSI (ru) | `src-tauri/target/release/bundle/msi/TermaSSH_<version>_x64_ru-RU.msi` |
| macOS | `.app` / `.dmg` | `src-tauri/target/release/bundle/macos/` |
| Linux | `.deb` | `src-tauri/target/release/bundle/deb/` |
| Linux | AppImage | `src-tauri/target/release/bundle/appimage/` |

Точные имена файлов зависят от `version` в `src-tauri/tauri.conf.json` и `src-tauri/Cargo.toml`.

### Сборка под другую архитектуру (Windows)

ARM64 (нужны ARM64 Build Tools в Visual Studio):

```bash
rustup target add aarch64-pc-windows-msvc
npm run tauri:build -- --target aarch64-pc-windows-msvc
```

### Кросс-компиляция Windows с Linux/macOS

```bash
cargo install cargo-xwin
rustup target add x86_64-pc-windows-msvc
npm run tauri:build -- --runner cargo-xwin --target x86_64-pc-windows-msvc
```

Подробнее: [Tauri — Windows Installer](https://v2.tauri.app/distribute/windows-installer/).

## Развёртывание (релиз)

### Установка для пользователей (Windows)

1. Скачать `TermaSSH_*_x64-setup.exe` (NSIS) или `TermaSSH_*_x64_*.msi` из [GitHub Releases](https://github.com/beliberda/term-desktop/releases).
2. Запустить установщик.
3. Открыть TermaSSH из меню Пуск.

На целевой машине **не нужны** Node.js, Rust или Build Tools — только WebView2 Runtime (обычно уже есть).

### Публикация релиза

1. Обновить версию в `src-tauri/tauri.conf.json` и `src-tauri/Cargo.toml`.
2. Собрать на целевой платформе: `npm run tauri:build`.
3. Протестировать установщик на чистой системе.
4. Создать GitHub Release и приложить артефакты из `src-tauri/target/release/bundle/`.

Рекомендуемые файлы для Windows-релиза:

- `TermaSSH_<version>_x64-setup.exe` — основной инсталлятор;
- `TermaSSH_<version>_x64_en-US.msi` и `TermaSSH_<version>_x64_ru-RU.msi` — для корпоративного развёртывания (GPO/SCCM).

### Каталог данных приложения

После установки пользовательские данные хранятся в каталоге данных Tauri:

| ОС | Путь (пример) |
|----|---------------|
| Windows | `%APPDATA%\com.termassh.desktop\` |
| macOS | `~/Library/Application Support/com.termassh.desktop/` |
| Linux | `~/.local/share/com.termassh.desktop/` |

Файлы: `sessions.json`, `settings.json`, логи.

## Устранение типичных проблем

| Симптом | Решение |
|---------|---------|
| `link.exe` not found (Windows) | Установить C++ Build Tools, перезапустить терминал, `rustup default stable-msvc` |
| WebView2 not found | Установить [Evergreen Bootstrapper](https://developer.microsoft.com/en-us/microsoft-edge/webview2/#download-section) |
| `webkit2gtk` not found (Linux) | Установить пакеты из раздела Linux выше |
| Долгая первая сборка | Нормально: компилируются russh, tokio и другие crates |
| MSI не собирается | Проверить наличие WiX Toolset (Tauri подтягивает автоматически) и VBScript |

## Полезные ссылки

| Ресурс | URL |
|--------|-----|
| Tauri 2 — Getting Started | https://v2.tauri.app/start/ |
| Tauri 2 — Prerequisites | https://v2.tauri.app/start/prerequisites/ |
| Tauri 2 — Build | https://v2.tauri.app/develop/build/ |
| Tauri 2 — Windows Installer | https://v2.tauri.app/distribute/windows-installer/ |
| Tauri 2 — Configuration | https://v2.tauri.app/reference/config/ |
| Rust — rustup | https://rustup.rs/ |
| Node.js — Downloads | https://nodejs.org/ |
| Vite | https://vite.dev/ |
| React | https://react.dev/ |
