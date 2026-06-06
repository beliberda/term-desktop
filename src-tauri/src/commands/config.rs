use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use tauri::State;

use crate::models::{SessionsFile, SessionsImportResult};
use crate::services::ConfigService;

type ConfigState = Arc<Mutex<ConfigService>>;

#[tauri::command]
pub fn sessions_list(state: State<'_, ConfigState>) -> Result<SessionsFile, String> {
    let config = state.lock().map_err(|e| e.to_string())?;
    config.load()
}

#[tauri::command]
pub fn sessions_save(data: SessionsFile, state: State<'_, ConfigState>) -> Result<(), String> {
    let config = state.lock().map_err(|e| e.to_string())?;
    config.save(&data)
}

#[tauri::command]
pub fn sessions_export_to_path(
    path: String,
    state: State<'_, ConfigState>,
) -> Result<(), String> {
    let config = state.lock().map_err(|e| e.to_string())?;
    config.export_to_path(&PathBuf::from(path))
}

#[tauri::command]
pub fn sessions_import_from_path(
    path: String,
    state: State<'_, ConfigState>,
) -> Result<SessionsImportResult, String> {
    let config = state.lock().map_err(|e| e.to_string())?;
    config.import_from_path(&PathBuf::from(path))
}

const SESSIONS_IMPORT_EXAMPLE: &str =
    include_str!("../../../public/sessions-import-example.json");

#[tauri::command]
pub fn sessions_write_example_at_path(path: String) -> Result<(), String> {
    fs::write(&path, SESSIONS_IMPORT_EXAMPLE)
        .map_err(|e| format!("failed to write example file: {e}"))
}
