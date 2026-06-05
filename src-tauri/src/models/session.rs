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
pub struct SessionsFile {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub sessions: Vec<SessionConfig>,
}

impl Default for SessionsFile {
    fn default() -> Self {
        Self {
            schema_version: 1,
            sessions: Vec::new(),
        }
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
