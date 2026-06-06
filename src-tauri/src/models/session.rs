use std::collections::HashSet;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionConfig {
    pub id: String,
    pub name: String,
    pub protocol: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    #[serde(rename = "authType")]
    pub auth_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub private_key_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionFolder {
    pub id: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(default)]
    pub collapsed: bool,
    #[serde(default)]
    pub child_order: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionsFile {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    #[serde(rename = "rootOrder", default)]
    pub root_order: Vec<String>,
    #[serde(default)]
    pub folders: Vec<SessionFolder>,
    pub sessions: Vec<SessionConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionsImportResult {
    pub file: SessionsFile,
    pub imported: u32,
    pub skipped: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionConfigImport {
    #[serde(default)]
    id: Option<String>,
    name: String,
    #[serde(default = "default_protocol")]
    protocol: String,
    host: String,
    #[serde(default)]
    port: Option<u16>,
    username: String,
    #[serde(rename = "authType", default = "default_auth_type")]
    auth_type: String,
    #[serde(default)]
    private_key_path: Option<String>,
    #[serde(default)]
    default_path: Option<String>,
    #[serde(default)]
    created_at: Option<String>,
    #[serde(default)]
    updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionFolderImport {
    #[serde(default)]
    id: Option<String>,
    name: String,
    #[serde(default)]
    parent_id: Option<String>,
    #[serde(default)]
    collapsed: bool,
    #[serde(default)]
    child_order: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct SessionsFileV1Import {
    #[serde(rename = "schemaVersion")]
    schema_version: u32,
    sessions: Vec<SessionConfigImport>,
}

#[derive(Debug, Deserialize)]
struct SessionsFileV2Import {
    #[serde(rename = "schemaVersion")]
    schema_version: u32,
    #[serde(rename = "rootOrder", default)]
    root_order: Vec<String>,
    #[serde(default)]
    folders: Vec<SessionFolderImport>,
    sessions: Vec<SessionConfigImport>,
}

#[derive(Debug, Deserialize)]
struct SessionsOnlyImport {
    sessions: Vec<SessionConfigImport>,
}

fn default_protocol() -> String {
    "ssh".into()
}

fn default_auth_type() -> String {
    "password".into()
}

fn new_id() -> String {
    Uuid::new_v4().to_string()
}

fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

fn default_port(protocol: &str) -> u16 {
    if protocol == "ftp" { 21 } else { 22 }
}

impl Default for SessionsFile {
    fn default() -> Self {
        Self {
            schema_version: 2,
            root_order: Vec::new(),
            folders: Vec::new(),
            sessions: Vec::new(),
        }
    }
}

impl SessionsFile {
    pub fn from_json(content: &str) -> Result<Self, String> {
        let value: serde_json::Value =
            serde_json::from_str(content).map_err(|e| format!("failed to parse sessions file: {e}"))?;

        if value.is_array() {
            let imports: Vec<SessionConfigImport> = serde_json::from_value(value)
                .map_err(|e| format!("failed to parse sessions array: {e}"))?;
            return Ok(Self::from_import_parts(Vec::new(), Vec::new(), imports));
        }

        if value.get("schemaVersion").is_none() && value.get("sessions").is_some() {
            let partial: SessionsOnlyImport = serde_json::from_value(value)
                .map_err(|e| format!("failed to parse sessions list: {e}"))?;
            return Ok(Self::from_import_parts(
                Vec::new(),
                Vec::new(),
                partial.sessions,
            ));
        }

        let version = value
            .get("schemaVersion")
            .and_then(|v| v.as_u64())
            .unwrap_or(1) as u32;

        match version {
            1 => {
                let v1: SessionsFileV1Import = serde_json::from_value(value)
                    .map_err(|e| format!("failed to parse sessions v1: {e}"))?;
                Ok(Self::from_import_parts(Vec::new(), Vec::new(), v1.sessions))
            }
            2 => {
                let v2: SessionsFileV2Import = serde_json::from_value(value)
                    .map_err(|e| format!("failed to parse sessions v2: {e}"))?;
                Ok(Self::from_import_parts(
                    v2.root_order,
                    v2.folders,
                    v2.sessions,
                ))
            }
            other => Err(format!("unsupported schema version: {other}")),
        }
    }

    fn from_import_parts(
        root_order: Vec<String>,
        folder_imports: Vec<SessionFolderImport>,
        session_imports: Vec<SessionConfigImport>,
    ) -> Self {
        Self {
            schema_version: 2,
            root_order,
            folders: folder_imports
                .into_iter()
                .map(|folder| SessionFolder {
                    id: folder.id.unwrap_or_else(new_id),
                    name: folder.name,
                    parent_id: folder.parent_id,
                    collapsed: folder.collapsed,
                    child_order: folder.child_order,
                })
                .collect(),
            sessions: session_imports
                .into_iter()
                .map(|session| session.into_config_with_defaults())
                .collect(),
        }
    }

    pub fn migrate_from_v1(sessions: Vec<SessionConfig>) -> Self {
        Self {
            schema_version: 2,
            root_order: sessions.iter().map(|s| s.id.clone()).collect(),
            folders: Vec::new(),
            sessions,
        }
    }

    pub fn prepare_for_import(mut self) -> (Self, u32) {
        let mut skipped = 0u32;
        let mut seen_ids: HashSet<String> = HashSet::new();

        self.sessions = self
            .sessions
            .into_iter()
            .filter_map(|mut session| {
                if session.id.trim().is_empty() {
                    session.id = new_id();
                }
                if seen_ids.contains(&session.id) {
                    session.id = new_id();
                }
                seen_ids.insert(session.id.clone());

                if session.created_at.trim().is_empty() {
                    session.created_at = now_iso();
                }
                if session.updated_at.trim().is_empty() {
                    session.updated_at = now_iso();
                }
                if session.port == 0 {
                    session.port = default_port(&session.protocol);
                }
                if session.protocol.trim().is_empty() {
                    session.protocol = default_protocol();
                }
                if session.auth_type.trim().is_empty() {
                    session.auth_type = default_auth_type();
                }

                if session.validate().is_err() {
                    skipped += 1;
                    return None;
                }
                Some(session)
            })
            .collect();

        let mut seen_folder_ids: HashSet<String> = HashSet::new();
        self.folders = self
            .folders
            .into_iter()
            .filter_map(|mut folder| {
                if folder.name.trim().is_empty() {
                    skipped += 1;
                    return None;
                }
                if folder.id.trim().is_empty() {
                    folder.id = new_id();
                }
                if seen_folder_ids.contains(&folder.id) {
                    folder.id = new_id();
                }
                seen_folder_ids.insert(folder.id.clone());
                Some(folder)
            })
            .collect();

        let session_ids: HashSet<String> =
            self.sessions.iter().map(|s| s.id.clone()).collect();
        let folder_ids: HashSet<String> = self.folders.iter().map(|f| f.id.clone()).collect();
        let known_ids: HashSet<String> = session_ids
            .iter()
            .chain(folder_ids.iter())
            .cloned()
            .collect();

        self.root_order.retain(|id| known_ids.contains(id));
        for folder in &mut self.folders {
            folder.child_order.retain(|id| known_ids.contains(id));
            if let Some(parent_id) = &folder.parent_id {
                if !folder_ids.contains(parent_id) {
                    folder.parent_id = None;
                }
            }
        }

        let mut placed: HashSet<String> = HashSet::new();
        for id in &self.root_order {
            placed.insert(id.clone());
        }
        for folder in &self.folders {
            for child_id in &folder.child_order {
                placed.insert(child_id.clone());
            }
        }

        for session in &self.sessions {
            if !placed.contains(&session.id) {
                self.root_order.push(session.id.clone());
                placed.insert(session.id.clone());
            }
        }

        let folders_to_place: Vec<(String, Option<String>)> = self
            .folders
            .iter()
            .filter(|folder| !placed.contains(&folder.id))
            .map(|folder| (folder.id.clone(), folder.parent_id.clone()))
            .collect();

        for (folder_id, parent_id) in folders_to_place {
            if let Some(parent_id) = parent_id {
                if folder_ids.contains(&parent_id) {
                    if let Some(parent) =
                        self.folders.iter_mut().find(|folder| folder.id == parent_id)
                    {
                        parent.child_order.push(folder_id.clone());
                        placed.insert(folder_id);
                        continue;
                    }
                }
            }
            self.root_order.push(folder_id.clone());
            placed.insert(folder_id);
        }

        (self, skipped)
    }

    pub fn validate(&self) -> Result<(), String> {
        for session in &self.sessions {
            session.validate()?;
        }

        let session_ids: HashSet<_> = self.sessions.iter().map(|s| s.id.as_str()).collect();
        let folder_ids: HashSet<_> = self.folders.iter().map(|f| f.id.as_str()).collect();

        if session_ids.len() != self.sessions.len() {
            return Err("duplicate session ids".into());
        }
        if folder_ids.len() != self.folders.len() {
            return Err("duplicate folder ids".into());
        }

        let mut placed: HashSet<String> = HashSet::new();

        for id in &self.root_order {
            if !session_ids.contains(id.as_str()) && !folder_ids.contains(id.as_str()) {
                return Err(format!("unknown id in rootOrder: {id}"));
            }
            if !placed.insert(id.clone()) {
                return Err(format!("duplicate placement for id: {id}"));
            }
        }

        for folder in &self.folders {
            if let Some(parent_id) = &folder.parent_id {
                if parent_id == &folder.id {
                    return Err("folder cannot be its own parent".into());
                }
                if !folder_ids.contains(parent_id.as_str()) {
                    return Err(format!("unknown parent folder: {parent_id}"));
                }
            }

            for child_id in &folder.child_order {
                if !session_ids.contains(child_id.as_str()) && !folder_ids.contains(child_id.as_str())
                {
                    return Err(format!(
                        "unknown id in childOrder of folder {}: {child_id}",
                        folder.id
                    ));
                }
                if !placed.insert(child_id.clone()) {
                    return Err(format!("duplicate placement for id: {child_id}"));
                }
            }
        }

        for session in &self.sessions {
            if !placed.contains(&session.id) {
                return Err(format!("session not placed in tree: {}", session.id));
            }
        }

        for folder in &self.folders {
            if !placed.contains(&folder.id) {
                return Err(format!("folder not placed in tree: {}", folder.id));
            }
        }

        Ok(())
    }
}

impl SessionConfigImport {
    fn into_config_with_defaults(self) -> SessionConfig {
        let protocol = if self.protocol.trim().is_empty() {
            default_protocol()
        } else {
            self.protocol
        };
        let ts = now_iso();
        SessionConfig {
            id: self.id.filter(|id| !id.trim().is_empty()).unwrap_or_else(new_id),
            name: self.name,
            protocol: protocol.clone(),
            host: self.host,
            port: self.port.unwrap_or_else(|| default_port(&protocol)),
            username: self.username,
            auth_type: if self.auth_type.trim().is_empty() {
                default_auth_type()
            } else {
                self.auth_type
            },
            private_key_path: self.private_key_path,
            default_path: self.default_path,
            created_at: self.created_at.filter(|v| !v.trim().is_empty()).unwrap_or_else(|| ts.clone()),
            updated_at: self.updated_at.filter(|v| !v.trim().is_empty()).unwrap_or(ts),
        }
    }
}

impl SessionConfig {
    pub fn validate(&self) -> crate::error::IpcResult<()> {
        use crate::error::IpcError;

        if self.name.trim().is_empty() {
            return Err(IpcError::new("session.nameRequired"));
        }
        if self.host.trim().is_empty() {
            return Err(IpcError::new("session.hostRequired"));
        }
        if self.username.trim().is_empty() {
            return Err(IpcError::new("session.usernameRequired"));
        }
        if self.port == 0 {
            return Err(IpcError::new("session.portInvalid"));
        }
        if self.auth_type == "privateKey" {
            match &self.private_key_path {
                Some(path) if !path.trim().is_empty() => {}
                _ => return Err(IpcError::new("ssh.privateKeyPathRequired")),
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_session_json(id: Option<&str>, name: &str) -> String {
        let id_field = id
            .map(|v| format!(r#""id": "{v}","#))
            .unwrap_or_default();
        format!(
            r#"{{
            {id_field}
            "name": "{name}",
            "host": "10.0.0.1",
            "username": "user",
            "protocol": "ssh",
            "authType": "password"
        }}"#
        )
    }

    #[test]
    fn from_json_accepts_session_without_id() {
        let json = format!(r#"{{ "sessions": [{}] }}"#, sample_session_json(None, "Prod"));
        let file = SessionsFile::from_json(&json).expect("parse");
        assert_eq!(file.sessions.len(), 1);
        assert!(!file.sessions[0].id.is_empty());
        assert_eq!(file.sessions[0].name, "Prod");
    }

    #[test]
    fn from_json_accepts_bare_array() {
        let json = format!("[{}]", sample_session_json(None, "Array"));
        let file = SessionsFile::from_json(&json).expect("parse");
        assert_eq!(file.sessions.len(), 1);
        assert_eq!(file.sessions[0].name, "Array");
    }

    #[test]
    fn prepare_for_import_fixes_duplicate_ids_and_tree() {
        let json = format!(
            r#"{{
            "schemaVersion": 2,
            "sessions": [
                {},
                {}
            ]
        }}"#,
            sample_session_json(Some("same-id"), "One"),
            sample_session_json(Some("same-id"), "Two")
        );
        let file = SessionsFile::from_json(&json).expect("parse");
        let (prepared, skipped) = file.prepare_for_import();
        assert_eq!(skipped, 0);
        assert_eq!(prepared.sessions.len(), 2);
        assert_ne!(prepared.sessions[0].id, prepared.sessions[1].id);
        assert!(prepared.root_order.contains(&prepared.sessions[0].id));
        assert!(prepared.root_order.contains(&prepared.sessions[1].id));
        prepared.validate().expect("valid");
    }

    #[test]
    fn prepare_for_import_places_unplaced_sessions_in_root_order() {
        let json = format!(
            r#"{{
            "schemaVersion": 2,
            "rootOrder": [],
            "sessions": [{}]
        }}"#,
            sample_session_json(Some("sess-1"), "Remote")
        );
        let file = SessionsFile::from_json(&json).expect("parse");
        let (prepared, _) = file.prepare_for_import();
        assert_eq!(prepared.root_order, vec!["sess-1".to_string()]);
        prepared.validate().expect("valid");
    }

    #[test]
    fn import_example_file_is_valid() {
        const EXAMPLE: &str = include_str!("../../../public/sessions-import-example.json");
        let file = SessionsFile::from_json(EXAMPLE).expect("parse example");
        let (prepared, skipped) = file.prepare_for_import();
        assert_eq!(skipped, 0);
        prepared.validate().expect("valid example");
    }

    #[test]
    fn prepare_for_import_skips_invalid_sessions() {
        let json = r#"{
            "schemaVersion": 2,
            "sessions": [
                { "name": "", "host": "10.0.0.1", "username": "u" },
                { "name": "Valid", "host": "10.0.0.2", "username": "u" }
            ]
        }"#;
        let file = SessionsFile::from_json(json).expect("parse");
        let (prepared, skipped) = file.prepare_for_import();
        assert_eq!(skipped, 1);
        assert_eq!(prepared.sessions.len(), 1);
        assert_eq!(prepared.sessions[0].name, "Valid");
    }
}
