use std::sync::{Arc, Mutex};

use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::models::{SessionConfig, SessionsFile};
use crate::services::ConfigService;

type ConfigState = Arc<Mutex<ConfigService>>;

#[tauri::command]
pub fn sessions_list(state: State<'_, ConfigState>) -> Result<SessionsFile, String> {
    let config = state.lock().map_err(|e| e.to_string())?;
    config.load()
}

#[tauri::command]
pub fn sessions_save(
    sessions: Vec<SessionConfig>,
    state: State<'_, ConfigState>,
) -> Result<(), String> {
    let config = state.lock().map_err(|e| e.to_string())?;
    config.save_all(&sessions)
}

#[tauri::command]
pub fn sessions_export(app: AppHandle, state: State<'_, ConfigState>) -> Result<(), String> {
    let path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name("sessions.json")
        .blocking_save_file();

    let Some(path) = path else {
        return Ok(());
    };

    let config = state.lock().map_err(|e| e.to_string())?;
    config.export_to_path(&path.into_path().map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn sessions_import(
    app: AppHandle,
    state: State<'_, ConfigState>,
) -> Result<Vec<SessionConfig>, String> {
    let path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    let Some(path) = path else {
        let config = state.lock().map_err(|e| e.to_string())?;
        return Ok(config.load()?.sessions);
    };

    let config = state.lock().map_err(|e| e.to_string())?;
    config.import_from_path(&path.into_path().map_err(|e| e.to_string())?)
}
