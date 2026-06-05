use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub schema_version: u32,
    pub theme: String,
    pub terminal_font_size: u16,
    pub terminal_font_family: String,
    pub default_ssh_port: u16,
    pub default_ftp_port: u16,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            schema_version: 1,
            theme: "dark".to_string(),
            terminal_font_size: 14,
            terminal_font_family: "Consolas, \"Courier New\", monospace".to_string(),
            default_ssh_port: 22,
            default_ftp_port: 21,
        }
    }
}
