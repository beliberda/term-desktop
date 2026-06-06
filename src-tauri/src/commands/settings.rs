use std::sync::{Arc, Mutex};

use tauri::State;

use crate::error::{IpcError, IpcResult};
use crate::models::settings::AppSettings;
use crate::services::settings::SettingsService;

type SettingsState = Arc<Mutex<SettingsService>>;

#[tauri::command]
pub fn settings_load(state: State<'_, SettingsState>) -> IpcResult<AppSettings> {
    let service = state
        .lock()
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    service.load()
}

#[tauri::command]
pub fn settings_save(
    state: State<'_, SettingsState>,
    settings: AppSettings,
) -> IpcResult<()> {
    let service = state
        .lock()
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    service.save(&settings)
}
