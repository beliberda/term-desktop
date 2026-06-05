use std::sync::{Arc, Mutex};

use tauri::State;

use crate::models::settings::AppSettings;
use crate::services::settings::SettingsService;

type SettingsState = Arc<Mutex<SettingsService>>;

#[tauri::command]
pub fn settings_load(state: State<'_, SettingsState>) -> Result<AppSettings, String> {
    let service = state.lock().map_err(|e| e.to_string())?;
    service.load()
}

#[tauri::command]
pub fn settings_save(
    state: State<'_, SettingsState>,
    settings: AppSettings,
) -> Result<(), String> {
    let service = state.lock().map_err(|e| e.to_string())?;
    service.save(&settings)
}
