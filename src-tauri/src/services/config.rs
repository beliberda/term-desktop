use std::fs;
use std::path::PathBuf;

use tauri::Manager;

use crate::models::SessionsFile;

pub struct ConfigService {
    file_path: PathBuf,
}

impl ConfigService {
    pub fn new(app: &tauri::AppHandle) -> Result<Self, String> {
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("failed to resolve app data dir: {e}"))?;
        fs::create_dir_all(&dir).map_err(|e| format!("failed to create app data dir: {e}"))?;
        Ok(Self {
            file_path: dir.join("sessions.json"),
        })
    }

    pub fn load(&self) -> Result<SessionsFile, String> {
        if !self.file_path.exists() {
            return Ok(SessionsFile::default());
        }

        let content = fs::read_to_string(&self.file_path)
            .map_err(|e| format!("failed to read sessions file: {e}"))?;

        SessionsFile::from_json(&content)
    }

    pub fn save(&self, data: &SessionsFile) -> Result<(), String> {
        data.validate()?;

        let content = serde_json::to_string_pretty(data)
            .map_err(|e| format!("failed to serialize sessions: {e}"))?;

        let temp_path = self.file_path.with_extension("json.tmp");
        fs::write(&temp_path, content)
            .map_err(|e| format!("failed to write temp sessions file: {e}"))?;
        fs::rename(&temp_path, &self.file_path)
            .map_err(|e| format!("failed to rename sessions file: {e}"))?;

        Ok(())
    }

    pub fn merge_import(&self, incoming: SessionsFile) -> Result<SessionsFile, String> {
        incoming.validate()?;

        let mut current = self.load()?;
        let mut session_map = std::collections::HashMap::new();
        for session in current.sessions {
            session_map.insert(session.id.clone(), session);
        }
        for session in incoming.sessions {
            session_map.insert(session.id.clone(), session);
        }
        current.sessions = session_map.into_values().collect();

        let mut folder_map = std::collections::HashMap::new();
        for folder in current.folders {
            folder_map.insert(folder.id.clone(), folder);
        }
        for folder in incoming.folders {
            folder_map.insert(folder.id.clone(), folder);
        }
        current.folders = folder_map.into_values().collect();

        let mut root_order = current.root_order;
        for id in incoming.root_order {
            if !root_order.contains(&id) {
                root_order.push(id);
            }
        }
        current.root_order = root_order;
        current.schema_version = 2;

        self.save(&current)?;
        Ok(current)
    }

    pub fn export_to_path(&self, path: &PathBuf) -> Result<(), String> {
        let data = self.load()?;
        let content = serde_json::to_string_pretty(&data)
            .map_err(|e| format!("failed to serialize sessions: {e}"))?;
        fs::write(path, content).map_err(|e| format!("failed to write export file: {e}"))?;
        Ok(())
    }

    pub fn import_from_path(&self, path: &PathBuf) -> Result<SessionsFile, String> {
        let content = fs::read_to_string(path)
            .map_err(|e| format!("failed to read import file: {e}"))?;
        let data = SessionsFile::from_json(&content)?;
        self.merge_import(data)
    }
}
