use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, State};
use tokio::sync::Mutex as AsyncMutex;

use crate::connection_pool::ConnectionPool;
use crate::error::{IpcError, IpcResult};
use crate::models::SessionConfig;
use crate::services::config::ConfigService;
use crate::services::CredentialVaultService;
use crate::utils::paths::validate_ftp_protocol;

type ConfigState = Arc<Mutex<ConfigService>>;
type VaultState = Arc<Mutex<CredentialVaultService>>;
type PoolState = Arc<AsyncMutex<ConnectionPool>>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectResponse {
    pub connection_id: String,
}

fn find_session(config: &ConfigService, session_id: &str) -> IpcResult<SessionConfig> {
    let file = config
        .load()
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e))?;
    file.sessions
        .into_iter()
        .find(|s| s.id == session_id)
        .ok_or_else(|| {
            IpcError::with_str_detail("session.notFound", "sessionId", session_id)
        })
}

#[tauri::command]
pub async fn ftp_connect(
    app: AppHandle,
    pool: State<'_, PoolState>,
    config_state: State<'_, ConfigState>,
    vault_state: State<'_, VaultState>,
    session_id: String,
    password: Option<String>,
) -> IpcResult<ConnectResponse> {
    let session = {
        let config = config_state
            .lock()
            .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
        find_session(&config, &session_id)?
    };

    session.validate()?;
    validate_ftp_protocol(&session.protocol)?;

    if session.auth_type != "password" {
        return Err(IpcError::new("connection.ftpOnlyPassword"));
    }

    let effective_password = {
        let vault = vault_state
            .lock()
            .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
        password.or_else(|| vault.get(&session_id))
    };

    let connection_id = {
        let mut pool = pool.lock().await;
        pool.connect_ftp(app, session, effective_password).await?
    };

    Ok(ConnectResponse { connection_id })
}

#[tauri::command]
pub async fn ftp_disconnect(
    pool: State<'_, PoolState>,
    connection_id: String,
) -> IpcResult<()> {
    let mut pool = pool.lock().await;
    pool.disconnect(&connection_id).await
}
