# Contributing to TermaSSH

Thank you for your interest in contributing! TermaSSH is an open-source project, and every contribution helps.

## Getting started

1. Fork the repository and clone your fork.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development build:

   ```bash
   npm run tauri:dev
   ```

For platform-specific build requirements, see [docs/build-and-deploy.md](./docs/build-and-deploy.md).

## Before submitting a PR

- Run the linter:

  ```bash
  npm run lint
  ```

- For Rust changes, ensure the project compiles:

  ```bash
  cd src-tauri && cargo check
  ```

- Keep changes focused — one feature or fix per pull request.
- Match the existing code style and conventions in the files you touch.

## Reporting issues

Use [GitHub Issues](https://github.com/beliberda/term-desktop/issues) and include:

- Your OS and TermaSSH version
- Steps to reproduce the problem
- Expected vs. actual behavior
- Relevant logs or screenshots

## Feature requests

Open an issue describing the use case and why it would benefit other users. For larger changes, discuss the approach before starting implementation.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
