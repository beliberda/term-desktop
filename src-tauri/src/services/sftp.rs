use std::path::Path;
use std::sync::Arc;

use russh_sftp::client::SftpSession;
use tauri::Manager;
use tokio::sync::Mutex;

use crate::models::sftp::SftpEntry;
use crate::services::ssh::SharedSshHandle;
use crate::utils::sftp_paths::normalize_remote_path;

pub struct SftpSessionCache(pub Arc<Mutex<Option<SftpSession>>>);

impl SftpSessionCache {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(None)))
    }
}

async fn ensure_sftp(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
) -> Result<(), String> {
    let mut guard = cache.0.lock().await;
    if guard.is_some() {
        return Ok(());
    }

    let channel = {
        let handle = ssh_handle.lock().await;
        let channel = handle
            .channel_open_session()
            .await
            .map_err(|e| format!("failed to open SFTP channel: {e}"))?;

        channel
            .request_subsystem(true, "sftp")
            .await
            .map_err(|e| format!("failed to request sftp subsystem: {e}"))?;

        channel
    };

    let sftp = SftpSession::new(channel.into_stream())
        .await
        .map_err(|e| format!("failed to init SFTP session: {e}"))?;

    *guard = Some(sftp);
    Ok(())
}

fn mtime_to_iso(mtime: Option<u32>) -> Option<String> {
    mtime.map(|secs| {
        chrono::DateTime::from_timestamp(secs as i64, 0)
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_else(|| secs.to_string())
    })
}

pub async fn list_dir(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    path: &str,
) -> Result<Vec<SftpEntry>, String> {
    ensure_sftp(ssh_handle, cache).await?;
    let path = normalize_remote_path(path);
    let guard = cache.0.lock().await;
    let sftp = guard
        .as_ref()
        .ok_or_else(|| "SFTP session not initialized".to_string())?;

    let read_dir = sftp
        .read_dir(&path)
        .await
        .map_err(|e| format!("failed to read directory: {e}"))?;

    let mut entries: Vec<SftpEntry> = read_dir
        .map(|entry| {
            let metadata = entry.metadata();
            SftpEntry {
                name: entry.file_name(),
                path: entry.path(),
                is_directory: metadata.is_dir(),
                size: metadata.len(),
                modified_at: mtime_to_iso(metadata.mtime),
            }
        })
        .collect();

    entries.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

pub async fn upload_file(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    local_path: &str,
    remote_path: &str,
) -> Result<(), String> {
    let local = Path::new(local_path);
    if !local.exists() {
        return Err(format!("local file not found: {local_path}"));
    }
    if !local.is_file() {
        return Err(format!("local path is not a file: {local_path}"));
    }

    let data = std::fs::read(local).map_err(|e| format!("failed to read local file: {e}"))?;
    let remote_path = normalize_remote_path(remote_path);

    ensure_sftp(ssh_handle, cache).await?;
    let guard = cache.0.lock().await;
    let sftp = guard
        .as_ref()
        .ok_or_else(|| "SFTP session not initialized".to_string())?;

    sftp.write(&remote_path, &data)
        .await
        .map_err(|e| format!("failed to upload file: {e}"))
}

pub async fn download_file(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    remote_path: &str,
    local_path: &str,
) -> Result<(), String> {
    let remote_path = normalize_remote_path(remote_path);

    ensure_sftp(ssh_handle, cache).await?;
    let guard = cache.0.lock().await;
    let sftp = guard
        .as_ref()
        .ok_or_else(|| "SFTP session not initialized".to_string())?;

    let data = sftp
        .read(&remote_path)
        .await
        .map_err(|e| format!("failed to read remote file: {e}"))?;

    if let Some(parent) = Path::new(local_path).parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("failed to create local directory: {e}"))?;
        }
    }

    std::fs::write(local_path, data).map_err(|e| format!("failed to write local file: {e}"))
}

pub async fn download_dir(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    remote_path: &str,
    local_dir: &str,
) -> Result<(), String> {
    let remote_path = normalize_remote_path(remote_path);
    let local_base = Path::new(local_dir);

    std::fs::create_dir_all(local_base)
        .map_err(|e| format!("failed to create local directory: {e}"))?;

    let entries = list_dir(ssh_handle, cache, &remote_path).await?;

    for entry in entries {
        let local_path = local_base.join(&entry.name);
        if entry.is_directory {
            Box::pin(download_dir(
                ssh_handle,
                cache,
                &entry.path,
                local_path.to_string_lossy().as_ref(),
            ))
            .await?;
        } else {
            download_file(
                ssh_handle,
                cache,
                &entry.path,
                local_path.to_string_lossy().as_ref(),
            )
            .await?;
        }
    }

    Ok(())
}

pub async fn mkdir(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    remote_path: &str,
) -> Result<(), String> {
    let remote_path = normalize_remote_path(remote_path);

    ensure_sftp(ssh_handle, cache).await?;
    let guard = cache.0.lock().await;
    let sftp = guard
        .as_ref()
        .ok_or_else(|| "SFTP session not initialized".to_string())?;

    sftp.create_dir(&remote_path)
        .await
        .map_err(|e| format!("failed to create directory: {e}"))
}

pub async fn rename(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    old_path: &str,
    new_path: &str,
) -> Result<(), String> {
    let old_path = normalize_remote_path(old_path);
    let new_path = normalize_remote_path(new_path);

    ensure_sftp(ssh_handle, cache).await?;
    let guard = cache.0.lock().await;
    let sftp = guard
        .as_ref()
        .ok_or_else(|| "SFTP session not initialized".to_string())?;

    sftp.rename(old_path, new_path)
        .await
        .map_err(|e| format!("failed to rename: {e}"))
}

async fn delete_inner(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    remote_path: &str,
    is_directory: bool,
) -> Result<(), String> {
    let remote_path = normalize_remote_path(remote_path);

    if is_directory {
        let entries = list_dir(ssh_handle, cache, &remote_path).await?;
        for entry in entries {
            Box::pin(delete_inner(
                ssh_handle,
                cache,
                &entry.path,
                entry.is_directory,
            ))
            .await?;
        }

        ensure_sftp(ssh_handle, cache).await?;
        let guard = cache.0.lock().await;
        let sftp = guard
            .as_ref()
            .ok_or_else(|| "SFTP session not initialized".to_string())?;
        sftp.remove_dir(remote_path)
            .await
            .map_err(|e| format!("failed to remove directory: {e}"))
    } else {
        ensure_sftp(ssh_handle, cache).await?;
        let guard = cache.0.lock().await;
        let sftp = guard
            .as_ref()
            .ok_or_else(|| "SFTP session not initialized".to_string())?;
        sftp.remove_file(remote_path)
            .await
            .map_err(|e| format!("failed to remove file: {e}"))
    }
}

pub async fn delete(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    remote_path: &str,
    is_directory: bool,
) -> Result<(), String> {
    delete_inner(ssh_handle, cache, remote_path, is_directory).await
}

pub async fn fetch_to_cache(
    app: &tauri::AppHandle,
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    remote_path: &str,
) -> Result<String, String> {
    let remote_path = normalize_remote_path(remote_path);

    let filename = remote_path
        .split('/')
        .filter(|p| !p.is_empty())
        .last()
        .ok_or_else(|| "invalid remote path".to_string())?;

    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("failed to resolve app cache dir: {e}"))?
        .join("termassh")
        .join("open");
    std::fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("failed to create cache dir: {e}"))?;

    let local_path = cache_dir.join(filename);

    ensure_sftp(ssh_handle, cache).await?;
    let guard = cache.0.lock().await;
    let sftp = guard
        .as_ref()
        .ok_or_else(|| "SFTP session not initialized".to_string())?;

    let data = sftp
        .read(&remote_path)
        .await
        .map_err(|e| format!("failed to read remote file: {e}"))?;

    std::fs::write(&local_path, data)
        .map_err(|e| format!("failed to write cached file: {e}"))?;

    Ok(local_path.to_string_lossy().to_string())
}
