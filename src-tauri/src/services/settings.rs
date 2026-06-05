use std::fs;
use std::path::PathBuf;

use tauri::Manager;

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

    pub fn load(&self) -> Result<AppSettings, String> {
        if !self.file_path.exists() {
            return Ok(AppSettings::default());
        }

        let content = fs::read_to_string(&self.file_path)
            .map_err(|e| format!("failed to read settings file: {e}"))?;
        let data: AppSettings = serde_json::from_str(&content)
            .map_err(|e| format!("failed to parse settings file: {e}"))?;

        if data.schema_version != 1 {
            return Err(format!(
                "unsupported settings schema version: {}",
                data.schema_version
            ));
        }

        Ok(data)
    }

    pub fn save(&self, settings: &AppSettings) -> Result<(), String> {
        if settings.schema_version != 1 {
            return Err("unsupported settings schema version".into());
        }

        let content = serde_json::to_string_pretty(settings)
            .map_err(|e| format!("failed to serialize settings: {e}"))?;

        let temp_path = self.file_path.with_extension("json.tmp");
        fs::write(&temp_path, content)
            .map_err(|e| format!("failed to write temp settings file: {e}"))?;
        fs::rename(&temp_path, &self.file_path)
            .map_err(|e| format!("failed to rename settings file: {e}"))?;

        Ok(())
    }
}
