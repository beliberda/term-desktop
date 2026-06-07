use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::State;

use crate::error::{IpcError, IpcResult};
use crate::services::CredentialVaultService;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialEntry {
    pub session_id: String,
    pub password: String,
}

type VaultState = Arc<Mutex<CredentialVaultService>>;

#[tauri::command]
pub fn vault_exists(vault: State<'_, VaultState>) -> IpcResult<bool> {
    let vault = vault
        .lock()
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    Ok(vault.exists())
}

#[tauri::command]
pub fn vault_is_unlocked(vault: State<'_, VaultState>) -> IpcResult<bool> {
    let vault = vault
        .lock()
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    Ok(vault.is_unlocked())
}

#[tauri::command]
pub fn vault_setup(vault: State<'_, VaultState>, master_password: String) -> IpcResult<()> {
    let mut vault = vault
        .lock()
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    vault.setup(&master_password)
}

#[tauri::command]
pub fn vault_unlock(vault: State<'_, VaultState>, master_password: String) -> IpcResult<()> {
    let mut vault = vault
        .lock()
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    vault.unlock(&master_password)
}

#[tauri::command]
pub fn vault_lock(vault: State<'_, VaultState>) -> IpcResult<()> {
    let mut vault = vault
        .lock()
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    vault.lock();
    Ok(())
}

#[tauri::command]
pub fn vault_change_master(
    vault: State<'_, VaultState>,
    old_password: String,
    new_password: String,
) -> IpcResult<()> {
    let mut vault = vault
        .lock()
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    vault.change_master(&old_password, &new_password)
}

#[tauri::command]
pub fn credentials_set(
    vault: State<'_, VaultState>,
    session_id: String,
    password: String,
) -> IpcResult<()> {
    let mut vault = vault
        .lock()
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    vault.set(&session_id, &password)
}

#[tauri::command]
pub fn credentials_delete(vault: State<'_, VaultState>, session_id: String) -> IpcResult<()> {
    let mut vault = vault
        .lock()
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    if !vault.exists() {
        return Ok(());
    }
    if vault.is_unlocked() {
        vault.delete(&session_id)?;
    }
    Ok(())
}

#[tauri::command]
pub fn credentials_has(vault: State<'_, VaultState>, session_id: String) -> IpcResult<bool> {
    let vault = vault
        .lock()
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    Ok(vault.has(&session_id))
}

#[tauri::command]
pub fn credentials_list(vault: State<'_, VaultState>) -> IpcResult<Vec<CredentialEntry>> {
    let vault = vault
        .lock()
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    Ok(vault
        .list_entries()?
        .into_iter()
        .map(|(session_id, password)| CredentialEntry {
            session_id,
            password,
        })
        .collect())
}
