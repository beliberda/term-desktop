mod commands;
mod connection_pool;
mod events;
mod models;
mod services;
mod utils;

use std::sync::{Arc, Mutex};

use connection_pool::ConnectionPool;
use services::ConfigService;
use tauri::Manager;
use tokio::sync::Mutex as AsyncMutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      let config = ConfigService::new(&app.handle())?;
      app.manage(Arc::new(Mutex::new(config)));
      app.manage(Arc::new(AsyncMutex::new(ConnectionPool::new())));

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::ping::ping,
      commands::config::sessions_list,
      commands::config::sessions_save,
      commands::config::sessions_export,
      commands::config::sessions_import,
      commands::terminal::terminal_connect,
      commands::terminal::terminal_disconnect,
      commands::terminal::terminal_write,
      commands::terminal::terminal_resize,
      commands::terminal::test_ssh_connect,
      commands::sftp::sftp_list_dir,
      commands::sftp::sftp_upload,
      commands::sftp::sftp_download,
      commands::sftp::sftp_mkdir,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
