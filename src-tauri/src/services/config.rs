use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

use tauri::Manager;

use crate::models::{SessionsFile, SessionsImportResult};

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

    #[cfg(test)]
    pub fn new_for_test(file_path: PathBuf) -> Self {
        Self { file_path }
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

    pub fn merge_import(&self, incoming: SessionsFile) -> Result<SessionsImportResult, String> {
        let (incoming, invalid_skipped) = incoming.prepare_for_import();
        let mut skipped = invalid_skipped;

        let mut current = self.load()?;
        let mut existing_ids: HashSet<String> =
            current.sessions.iter().map(|s| s.id.clone()).collect();
        let mut existing_names: HashSet<String> = current
            .sessions
            .iter()
            .map(|s| s.name.trim().to_string())
            .collect();
        let mut existing_folder_ids: HashSet<String> =
            current.folders.iter().map(|f| f.id.clone()).collect();

        let mut accepted_session_ids: HashSet<String> = HashSet::new();
        let mut accepted_folder_ids: HashSet<String> = HashSet::new();
        let mut imported = 0u32;

        for session in incoming.sessions {
            let name_key = session.name.trim().to_string();
            if existing_ids.contains(&session.id) || existing_names.contains(&name_key) {
                skipped += 1;
                continue;
            }

            existing_ids.insert(session.id.clone());
            existing_names.insert(name_key);
            accepted_session_ids.insert(session.id.clone());
            current.sessions.push(session);
            imported += 1;
        }

        let incoming_folder_placements: Vec<(String, Option<String>)> = incoming
            .folders
            .iter()
            .map(|folder| (folder.id.clone(), folder.parent_id.clone()))
            .collect();

        for folder in incoming.folders {
            if existing_folder_ids.contains(&folder.id) {
                skipped += 1;
                continue;
            }

            let mut folder = folder;
            folder.child_order.retain(|id| {
                accepted_session_ids.contains(id) || accepted_folder_ids.contains(id)
            });

            existing_folder_ids.insert(folder.id.clone());
            accepted_folder_ids.insert(folder.id.clone());
            current.folders.push(folder);
            imported += 1;
        }

        let accepted_ids: HashSet<String> = accepted_session_ids
            .iter()
            .chain(accepted_folder_ids.iter())
            .cloned()
            .collect();

        for id in incoming.root_order {
            if !accepted_ids.contains(&id) {
                continue;
            }
            if !current.root_order.contains(&id) {
                current.root_order.push(id);
            }
        }

        let child_placed_ids: HashSet<String> = current
            .folders
            .iter()
            .flat_map(|folder| folder.child_order.iter().cloned())
            .collect();

        for session_id in &accepted_session_ids {
            if child_placed_ids.contains(session_id) {
                continue;
            }
            if !current.root_order.contains(session_id) {
                current.root_order.push(session_id.clone());
            }
        }

        for (folder_id, parent_id) in incoming_folder_placements {
            if !accepted_folder_ids.contains(&folder_id) {
                continue;
            }
            if let Some(parent_id) = parent_id {
                if accepted_folder_ids.contains(&parent_id) {
                    if let Some(parent) =
                        current.folders.iter_mut().find(|folder| folder.id == parent_id)
                    {
                        if !parent.child_order.contains(&folder_id) {
                            parent.child_order.push(folder_id);
                        }
                    }
                    continue;
                }
            }
            if !current.root_order.contains(&folder_id) {
                current.root_order.push(folder_id);
            }
        }

        current.schema_version = 2;
        current.validate()?;
        self.save(&current)?;

        Ok(SessionsImportResult {
            file: current,
            imported,
            skipped,
        })
    }

    pub fn export_to_path(&self, path: &PathBuf) -> Result<(), String> {
        let data = self.load()?;
        let content = serde_json::to_string_pretty(&data)
            .map_err(|e| format!("failed to serialize sessions: {e}"))?;
        fs::write(path, content).map_err(|e| format!("failed to write export file: {e}"))?;
        Ok(())
    }

    pub fn import_from_path(&self, path: &PathBuf) -> Result<SessionsImportResult, String> {
        let content = fs::read_to_string(path)
            .map_err(|e| format!("failed to read import file: {e}"))?;
        let data = SessionsFile::from_json(&content)?;
        self.merge_import(data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{SessionConfig, SessionFolder};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_sessions_path() -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        std::env::temp_dir().join(format!("termassh-sessions-{nanos}.json"))
    }

    fn make_session(id: &str, name: &str) -> SessionConfig {
        SessionConfig {
            id: id.into(),
            name: name.into(),
            protocol: "ssh".into(),
            host: "10.0.0.1".into(),
            port: 22,
            username: "user".into(),
            auth_type: "password".into(),
            private_key_path: None,
            default_path: None,
            created_at: "2024-01-01T00:00:00Z".into(),
            updated_at: "2024-01-01T00:00:00Z".into(),
        }
    }

    fn file_with_sessions(sessions: Vec<SessionConfig>) -> SessionsFile {
        let root_order = sessions.iter().map(|s| s.id.clone()).collect();
        SessionsFile {
            schema_version: 2,
            root_order,
            folders: Vec::new(),
            sessions,
        }
    }

    #[test]
    fn merge_import_skips_duplicate_id() {
        let path = temp_sessions_path();
        let service = ConfigService::new_for_test(path.clone());
        let existing = file_with_sessions(vec![make_session("id-1", "Existing")]);
        service.save(&existing).expect("save");

        let incoming = file_with_sessions(vec![make_session("id-1", "NewName")]);
        let result = service.merge_import(incoming).expect("merge");
        assert_eq!(result.imported, 0);
        assert_eq!(result.skipped, 1);
        assert_eq!(result.file.sessions.len(), 1);
        assert_eq!(result.file.sessions[0].name, "Existing");

        let _ = fs::remove_file(path);
    }

    #[test]
    fn merge_import_skips_duplicate_name() {
        let path = temp_sessions_path();
        let service = ConfigService::new_for_test(path.clone());
        let existing = file_with_sessions(vec![make_session("id-1", "Prod")]);
        service.save(&existing).expect("save");

        let incoming = file_with_sessions(vec![make_session("id-2", "Prod")]);
        let result = service.merge_import(incoming).expect("merge");
        assert_eq!(result.imported, 0);
        assert_eq!(result.skipped, 1);
        assert_eq!(result.file.sessions.len(), 1);

        let _ = fs::remove_file(path);
    }

    #[test]
    fn merge_import_keeps_sessions_in_folder_child_order() {
        let path = temp_sessions_path();
        let service = ConfigService::new_for_test(path.clone());
        let existing = SessionsFile::default();
        service.save(&existing).expect("save");

        let session = make_session("sess-in-folder", "VPN RU");
        let incoming = SessionsFile {
            schema_version: 2,
            root_order: vec!["folder-1".into()],
            folders: vec![SessionFolder {
                id: "folder-1".into(),
                name: "VPN Servers".into(),
                parent_id: None,
                collapsed: false,
                child_order: vec!["sess-in-folder".into()],
            }],
            sessions: vec![session],
        };

        let result = service.merge_import(incoming).expect("merge");
        assert_eq!(result.imported, 2);
        assert!(!result.file.root_order.contains(&"sess-in-folder".to_string()));
        assert_eq!(
            result.file.folders[0].child_order,
            vec!["sess-in-folder".to_string()]
        );
        result.file.validate().expect("valid");

        let _ = fs::remove_file(path);
    }

    #[test]
    fn merge_import_adds_new_session() {
        let path = temp_sessions_path();
        let service = ConfigService::new_for_test(path.clone());
        let existing = file_with_sessions(vec![make_session("id-1", "Existing")]);
        service.save(&existing).expect("save");

        let incoming = file_with_sessions(vec![make_session("id-2", "New")]);
        let result = service.merge_import(incoming).expect("merge");
        assert_eq!(result.imported, 1);
        assert_eq!(result.skipped, 0);
        assert_eq!(result.file.sessions.len(), 2);

        let _ = fs::remove_file(path);
    }
}
