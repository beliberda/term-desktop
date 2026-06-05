use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionStatusPayload {
    pub connection_id: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalOutputPayload {
    pub connection_id: String,
    pub data: String,
}

pub fn emit_connection_status(
    app: &AppHandle,
    connection_id: &str,
    status: &str,
    message: Option<String>,
) {
    let _ = app.emit(
        "connection-status",
        ConnectionStatusPayload {
            connection_id: connection_id.to_string(),
            status: status.to_string(),
            message,
        },
    );
}

pub fn emit_terminal_output(app: &AppHandle, connection_id: &str, data: &[u8]) {
    let _ = app.emit(
        "terminal-output",
        TerminalOutputPayload {
            connection_id: connection_id.to_string(),
            data: base64::Engine::encode(&base64::engine::general_purpose::STANDARD, data),
        },
    );
}
