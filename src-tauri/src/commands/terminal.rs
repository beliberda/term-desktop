use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, State};
use tokio::sync::Mutex as AsyncMutex;

use crate::connection_pool::ConnectionPool;
use crate::models::SessionConfig;
use crate::services::config::ConfigService;
use crate::services::ssh::test_connect;
use crate::utils::paths::validate_protocol;

type ConfigState = Arc<Mutex<ConfigService>>;
type PoolState = Arc<AsyncMutex<ConnectionPool>>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectResponse {
    pub connection_id: String,
}

fn find_session(config: &ConfigService, session_id: &str) -> Result<SessionConfig, String> {
    let file = config.load()?;
    file.sessions
        .into_iter()
        .find(|s| s.id == session_id)
        .ok_or_else(|| format!("session not found: {session_id}"))
}

#[tauri::command]
pub async fn terminal_connect(
    app: AppHandle,
    pool: State<'_, PoolState>,
    config_state: State<'_, ConfigState>,
    session_id: String,
    password: Option<String>,
) -> Result<ConnectResponse, String> {
    let session = {
        let config = config_state.lock().map_err(|e| e.to_string())?;
        find_session(&config, &session_id)?
    };

    session.validate()?;
    validate_protocol(&session.protocol)?;

    let connection_id = {
        let mut pool = pool.lock().await;
        pool.connect(app, session, password).await?
    };

    Ok(ConnectResponse { connection_id })
}

#[tauri::command]
pub async fn terminal_disconnect(
    pool: State<'_, PoolState>,
    connection_id: String,
) -> Result<(), String> {
    let mut pool = pool.lock().await;
    pool.disconnect(&connection_id)
}

#[tauri::command]
pub async fn terminal_write(
    pool: State<'_, PoolState>,
    connection_id: String,
    data: String,
) -> Result<(), String> {
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &data)
        .map_err(|e| format!("invalid base64 data: {e}"))?;

    let pool = pool.lock().await;
    pool.write(&connection_id, bytes)
}

#[tauri::command]
pub async fn terminal_resize(
    pool: State<'_, PoolState>,
    connection_id: String,
    cols: u32,
    rows: u32,
) -> Result<(), String> {
    let pool = pool.lock().await;
    pool.resize(&connection_id, cols, rows)
}

#[tauri::command]
pub async fn test_ssh_connect(
    host: String,
    port: u16,
    username: String,
    private_key_path: Option<String>,
    password: Option<String>,
) -> Result<String, String> {
    test_connect(host, port, username, private_key_path, password).await
}
