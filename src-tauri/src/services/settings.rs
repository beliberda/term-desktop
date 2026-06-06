use std::fs;
use std::path::PathBuf;

use tauri::Manager;

use crate::error::{IpcError, IpcResult};
use crate::models::settings::AppSettings;

pub struct SettingsService {
    file_path: PathBuf,
}

impl SettingsService {
    pub fn new(app: &tauri::AppHandle) -> Result<Self, String> {
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("failed to resolve app data dir: {e}"))?;
        fs::create_dir_all(&dir).map_err(|e| format!("failed to create app data dir: {e}"))?;
        Ok(Self {
            file_path: dir.join("settings.json"),
        })
    }

    pub fn load(&self) -> IpcResult<AppSettings> {
        if !self.file_path.exists() {
            return Ok(AppSettings::default());
        }

        let content = fs::read_to_string(&self.file_path)
            .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
        let data: AppSettings = serde_json::from_str(&content)
            .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;

        if data.schema_version != 1 {
            return Err(IpcError::new("settings.unsupportedSchema"));
        }

        Ok(data)
    }

    pub fn save(&self, settings: &AppSettings) -> IpcResult<()> {
        if settings.schema_version != 1 {
            return Err(IpcError::new("settings.unsupportedSchema"));
        }

        let content = serde_json::to_string_pretty(settings)
            .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;

        let temp_path = self.file_path.with_extension("json.tmp");
        fs::write(&temp_path, content)
            .map_err(|e| IpcError::with_str_detail("settings.saveFailed", "raw", e.to_string()))?;
        fs::rename(&temp_path, &self.file_path)
            .map_err(|e| IpcError::with_str_detail("settings.saveFailed", "raw", e.to_string()))?;

        Ok(())
    }
}
