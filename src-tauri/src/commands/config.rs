use std::fs;
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

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
) -> Result<SessionsImportResult, String> {
    let path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    let config = state.lock().map_err(|e| e.to_string())?;

    let Some(path) = path else {
        let file = config.load()?;
        return Ok(SessionsImportResult {
            file,
            imported: 0,
            skipped: 0,
        });
    };

    config.import_from_path(&path.into_path().map_err(|e| e.to_string())?)
}

const SESSIONS_IMPORT_EXAMPLE: &str =
    include_str!("../../../public/sessions-import-example.json");

#[tauri::command]
pub fn sessions_download_example(app: AppHandle) -> Result<(), String> {
    let path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name("sessions-import-example.json")
        .blocking_save_file();

    let Some(path) = path else {
        return Ok(());
    };

    fs::write(
        path.into_path().map_err(|e| e.to_string())?,
        SESSIONS_IMPORT_EXAMPLE,
    )
    .map_err(|e| format!("failed to write example file: {e}"))
}
