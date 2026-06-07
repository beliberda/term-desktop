use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{Algorithm, Argon2, Params, Version};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use tauri::Manager;
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::error::{IpcError, IpcResult};

const SALT_LEN: usize = 32;
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;
const SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultData {
    schema_version: u32,
    entries: HashMap<String, String>,
}

#[derive(Zeroize, ZeroizeOnDrop)]
struct DerivedKey([u8; KEY_LEN]);

struct UnlockedState {
    entries: HashMap<String, String>,
    salt: [u8; SALT_LEN],
    key: DerivedKey,
}

pub struct CredentialVaultService {
    file_path: PathBuf,
    state: Option<UnlockedState>,
}

impl CredentialVaultService {
    pub fn new(app: &tauri::AppHandle) -> Result<Self, String> {
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("failed to resolve app data dir: {e}"))?;
        fs::create_dir_all(&dir).map_err(|e| format!("failed to create app data dir: {e}"))?;
        Ok(Self {
            file_path: dir.join("credentials.enc"),
            state: None,
        })
    }

    pub fn exists(&self) -> bool {
        self.file_path.exists()
    }

    pub fn is_unlocked(&self) -> bool {
        self.state.is_some()
    }

    pub fn get(&self, session_id: &str) -> Option<String> {
        self.state
            .as_ref()
            .and_then(|s| s.entries.get(session_id).cloned())
    }

    pub fn has(&self, session_id: &str) -> bool {
        self.state
            .as_ref()
            .map(|s| s.entries.contains_key(session_id))
            .unwrap_or(false)
    }

    pub fn list_entries(&self) -> IpcResult<Vec<(String, String)>> {
        let state = self
            .state
            .as_ref()
            .ok_or_else(|| IpcError::new("vault.locked"))?;

        let mut entries: Vec<(String, String)> = state
            .entries
            .iter()
            .map(|(id, password)| (id.clone(), password.clone()))
            .collect();
        entries.sort_by(|a, b| a.0.cmp(&b.0));
        Ok(entries)
    }

    pub fn setup(&mut self, master_password: &str) -> IpcResult<()> {
        if self.exists() {
            return Err(IpcError::new("vault.alreadyExists"));
        }
        if master_password.len() < 8 {
            return Err(IpcError::new("vault.masterPasswordTooShort"));
        }

        let mut salt = [0u8; SALT_LEN];
        rand::thread_rng().fill_bytes(&mut salt);
        let key = derive_key(master_password, &salt)?;

        let data = VaultData {
            schema_version: SCHEMA_VERSION,
            entries: HashMap::new(),
        };
        write_encrypted(&self.file_path, &salt, &key.0, &data)?;

        self.state = Some(UnlockedState {
            entries: data.entries,
            salt,
            key,
        });
        Ok(())
    }

    pub fn unlock(&mut self, master_password: &str) -> IpcResult<()> {
        if !self.exists() {
            return Err(IpcError::new("vault.notFound"));
        }

        let raw = fs::read(&self.file_path)
            .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
        let (salt, nonce, ciphertext) = parse_file(&raw)?;

        let key = derive_key(master_password, &salt)?;
        let data = decrypt(&key.0, &nonce, &ciphertext)?;

        if data.schema_version != SCHEMA_VERSION {
            return Err(IpcError::new("vault.unsupportedSchema"));
        }

        self.state = Some(UnlockedState {
            entries: data.entries,
            salt,
            key,
        });
        Ok(())
    }

    pub fn lock(&mut self) {
        self.state = None;
    }

    pub fn set(&mut self, session_id: &str, password: &str) -> IpcResult<()> {
        let state = self
            .state
            .as_mut()
            .ok_or_else(|| IpcError::new("vault.locked"))?;

        state.entries.insert(session_id.to_string(), password.to_string());
        self.persist()?;
        Ok(())
    }

    pub fn delete(&mut self, session_id: &str) -> IpcResult<()> {
        let state = self
            .state
            .as_mut()
            .ok_or_else(|| IpcError::new("vault.locked"))?;

        state.entries.remove(session_id);
        if state.entries.is_empty() && self.file_path.exists() {
            fs::remove_file(&self.file_path)
                .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
            self.state = None;
            return Ok(());
        }
        self.persist()?;
        Ok(())
    }

    pub fn change_master(&mut self, old_password: &str, new_password: &str) -> IpcResult<()> {
        if new_password.len() < 8 {
            return Err(IpcError::new("vault.masterPasswordTooShort"));
        }

        let entries = {
            let state = self.state.take();
            match state {
                Some(s) => s.entries,
                None => {
                    let raw = fs::read(&self.file_path)
                        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
                    let (salt, nonce, ciphertext) = parse_file(&raw)?;
                    let key = derive_key(old_password, &salt)?;
                    match decrypt(&key.0, &nonce, &ciphertext) {
                        Ok(data) => data.entries,
                        Err(_) => return Err(IpcError::new("vault.invalidMasterPassword")),
                    }
                }
            }
        };

        let mut salt = [0u8; SALT_LEN];
        rand::thread_rng().fill_bytes(&mut salt);
        let key = derive_key(new_password, &salt)?;

        let data = VaultData {
            schema_version: SCHEMA_VERSION,
            entries,
        };
        write_encrypted(&self.file_path, &salt, &key.0, &data)?;

        self.state = Some(UnlockedState {
            entries: data.entries,
            salt,
            key,
        });
        Ok(())
    }

    fn persist(&self) -> IpcResult<()> {
        let state = self
            .state
            .as_ref()
            .ok_or_else(|| IpcError::new("vault.locked"))?;

        let data = VaultData {
            schema_version: SCHEMA_VERSION,
            entries: state.entries.clone(),
        };
        write_encrypted(&self.file_path, &state.salt, &state.key.0, &data)
    }
}

fn derive_key(password: &str, salt: &[u8; SALT_LEN]) -> IpcResult<DerivedKey> {
    let params = Params::new(19 * 1024, 2, 1, Some(KEY_LEN))
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut key = [0u8; KEY_LEN];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;

    Ok(DerivedKey(key))
}

fn parse_file(raw: &[u8]) -> IpcResult<([u8; SALT_LEN], [u8; NONCE_LEN], Vec<u8>)> {
    let min_len = SALT_LEN + NONCE_LEN + 16;
    if raw.len() < min_len {
        return Err(IpcError::new("vault.invalidMasterPassword"));
    }

    let mut salt = [0u8; SALT_LEN];
    salt.copy_from_slice(&raw[..SALT_LEN]);

    let mut nonce = [0u8; NONCE_LEN];
    nonce.copy_from_slice(&raw[SALT_LEN..SALT_LEN + NONCE_LEN]);

    let ciphertext = raw[SALT_LEN + NONCE_LEN..].to_vec();
    Ok((salt, nonce, ciphertext))
}

fn decrypt(key: &[u8; KEY_LEN], nonce: &[u8; NONCE_LEN], ciphertext: &[u8]) -> IpcResult<VaultData> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    let nonce = Nonce::from_slice(nonce);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| IpcError::new("vault.invalidMasterPassword"))?;

    serde_json::from_slice(&plaintext)
        .map_err(|_| IpcError::new("vault.invalidMasterPassword"))
}

fn write_encrypted(
    path: &PathBuf,
    salt: &[u8; SALT_LEN],
    key: &[u8; KEY_LEN],
    data: &VaultData,
) -> IpcResult<()> {
    let plaintext = serde_json::to_vec(data)
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;

    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_ref())
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;

    let mut output = Vec::with_capacity(SALT_LEN + NONCE_LEN + ciphertext.len());
    output.extend_from_slice(salt);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    let temp_path = path.with_extension("enc.tmp");
    fs::write(&temp_path, &output)
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;
    fs::rename(&temp_path, path)
        .map_err(|e| IpcError::with_str_detail("unknown", "raw", e.to_string()))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static COUNTER: AtomicU64 = AtomicU64::new(0);

    fn temp_vault() -> CredentialVaultService {
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let dir = std::env::temp_dir().join(format!("termassh_vault_test_{n}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        CredentialVaultService {
            file_path: dir.join("credentials.enc"),
            state: None,
        }
    }

    #[test]
    fn setup_unlock_roundtrip() {
        let mut vault = temp_vault();
        vault.setup("masterpassword1").unwrap();
        assert!(vault.exists());
        assert!(vault.is_unlocked());

        vault.set("session-1", "secret-pass").unwrap();
        assert_eq!(vault.get("session-1"), Some("secret-pass".to_string()));

        vault.lock();
        assert!(!vault.is_unlocked());
        assert_eq!(vault.get("session-1"), None);

        vault.unlock("masterpassword1").unwrap();
        assert_eq!(vault.get("session-1"), Some("secret-pass".to_string()));
    }

    #[test]
    fn wrong_master_password_fails() {
        let mut vault = temp_vault();
        vault.setup("correct-password").unwrap();
        vault.lock();

        let err = vault.unlock("wrong-password").unwrap_err();
        assert_eq!(err.code, "vault.invalidMasterPassword");
    }

    #[test]
    fn delete_last_entry_removes_file() {
        let mut vault = temp_vault();
        vault.setup("masterpassword1").unwrap();
        vault.set("session-1", "pass").unwrap();
        vault.delete("session-1").unwrap();
        assert!(!vault.exists());
        assert!(!vault.is_unlocked());
    }

    #[test]
    fn change_master_reencrypts() {
        let mut vault = temp_vault();
        vault.setup("old-password1").unwrap();
        vault.set("session-1", "pass").unwrap();
        vault.change_master("old-password1", "new-password1")
            .unwrap();

        vault.lock();
        vault.unlock("new-password1").unwrap();
        assert_eq!(vault.get("session-1"), Some("pass".to_string()));
    }
}
