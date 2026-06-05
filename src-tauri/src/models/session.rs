use serde::{Deserialize, Serialize};

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

#[derive(Debug, Deserialize)]
struct SessionsFileV1 {
    #[serde(rename = "schemaVersion")]
    schema_version: u32,
    sessions: Vec<SessionConfig>,
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

        let version = value
            .get("schemaVersion")
            .and_then(|v| v.as_u64())
            .unwrap_or(1) as u32;

        match version {
            1 => {
                let v1: SessionsFileV1 = serde_json::from_value(value)
                    .map_err(|e| format!("failed to parse sessions v1: {e}"))?;
                Ok(Self::migrate_from_v1(v1.sessions))
            }
            2 => serde_json::from_value(value).map_err(|e| format!("failed to parse sessions v2: {e}")),
            other => Err(format!("unsupported schema version: {other}")),
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

    pub fn validate(&self) -> Result<(), String> {
        for session in &self.sessions {
            session.validate()?;
        }

        let session_ids: std::collections::HashSet<_> =
            self.sessions.iter().map(|s| s.id.as_str()).collect();
        let folder_ids: std::collections::HashSet<_> =
            self.folders.iter().map(|f| f.id.as_str()).collect();

        if session_ids.len() != self.sessions.len() {
            return Err("duplicate session ids".into());
        }
        if folder_ids.len() != self.folders.len() {
            return Err("duplicate folder ids".into());
        }

        let mut placed: std::collections::HashSet<String> = std::collections::HashSet::new();

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

impl SessionConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("name is required".into());
        }
        if self.host.trim().is_empty() {
            return Err("host is required".into());
        }
        if self.username.trim().is_empty() {
            return Err("username is required".into());
        }
        if self.port == 0 {
            return Err("port must be greater than 0".into());
        }
        if self.auth_type == "privateKey" {
            match &self.private_key_path {
                Some(path) if !path.trim().is_empty() => {}
                _ => return Err("privateKeyPath is required for privateKey auth".into()),
            }
        }
        Ok(())
    }
}
