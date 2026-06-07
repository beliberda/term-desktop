use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::error::IpcError;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionStatusPayload {
    pub connection_id: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<IpcError>,
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
    error: Option<IpcError>,
) {
    let _ = app.emit(
        "connection-status",
        ConnectionStatusPayload {
            connection_id: connection_id.to_string(),
            status: status.to_string(),
            error,
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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferProgressPayload {
    pub transfer_id: String,
    pub connection_id: String,
    pub file_name: String,
    pub direction: String,
    pub bytes_done: u64,
    pub bytes_total: u64,
    pub status: String,
}

pub fn emit_transfer_progress(
    app: &AppHandle,
    transfer_id: &str,
    connection_id: &str,
    file_name: &str,
    direction: &str,
    bytes_done: u64,
    bytes_total: u64,
    status: &str,
) {
    let _ = app.emit(
        "transfer-progress",
        TransferProgressPayload {
            transfer_id: transfer_id.to_string(),
            connection_id: connection_id.to_string(),
            file_name: file_name.to_string(),
            direction: direction.to_string(),
            bytes_done,
            bytes_total,
            status: status.to_string(),
        },
    );
}
