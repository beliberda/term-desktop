use std::fs;
use std::path::PathBuf;

use tauri::Manager;

use crate::models::{SessionConfig, SessionsFile};

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
        let data: SessionsFile = serde_json::from_str(&content)
            .map_err(|e| format!("failed to parse sessions file: {e}"))?;

        if data.schema_version != 1 {
            return Err(format!(
                "unsupported schema version: {}",
                data.schema_version
            ));
        }

        Ok(data)
    }

    pub fn save_all(&self, sessions: &[SessionConfig]) -> Result<(), String> {
        for session in sessions {
            session.validate()?;
        }

        let data = SessionsFile {
            schema_version: 1,
            sessions: sessions.to_vec(),
        };

        let content = serde_json::to_string_pretty(&data)
            .map_err(|e| format!("failed to serialize sessions: {e}"))?;

        let temp_path = self.file_path.with_extension("json.tmp");
        fs::write(&temp_path, content)
            .map_err(|e| format!("failed to write temp sessions file: {e}"))?;
        fs::rename(&temp_path, &self.file_path)
            .map_err(|e| format!("failed to rename sessions file: {e}"))?;

        Ok(())
    }

    pub fn merge_import(&self, incoming: Vec<SessionConfig>) -> Result<Vec<SessionConfig>, String> {
        for session in &incoming {
            session.validate()?;
        }

        let mut current = self.load()?;
        for session in incoming {
            if let Some(existing) = current
                .sessions
                .iter_mut()
                .find(|s| s.id == session.id)
            {
                *existing = session;
            } else {
                current.sessions.push(session);
            }
        }

        self.save_all(&current.sessions)?;
        Ok(current.sessions)
    }

    pub fn export_to_path(&self, path: &PathBuf) -> Result<(), String> {
        let data = self.load()?;
        let content = serde_json::to_string_pretty(&data)
            .map_err(|e| format!("failed to serialize sessions: {e}"))?;
        fs::write(path, content).map_err(|e| format!("failed to write export file: {e}"))?;
        Ok(())
    }

    pub fn import_from_path(&self, path: &PathBuf) -> Result<Vec<SessionConfig>, String> {
        let content = fs::read_to_string(path)
            .map_err(|e| format!("failed to read import file: {e}"))?;
        let data: SessionsFile = serde_json::from_str(&content)
            .map_err(|e| format!("failed to parse import file: {e}"))?;

        if data.schema_version != 1 {
            return Err(format!(
                "unsupported schema version: {}",
                data.schema_version
            ));
        }

        self.merge_import(data.sessions)
    }
}
