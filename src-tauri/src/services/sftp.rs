use std::path::Path;
use std::sync::Arc;

use russh_sftp::client::SftpSession;
use tauri::AppHandle;
use tokio::sync::Mutex;

use crate::error::{IpcError, IpcResult};
use crate::models::sftp::SftpEntry;
use crate::services::ssh::SharedSshHandle;
use crate::utils::cache_paths::open_cache_path;
use crate::utils::sftp_paths::normalize_remote_path;
use crate::utils::transfer::TransferProgress;

pub struct SftpSessionCache(pub Arc<Mutex<Option<SftpSession>>>);

impl SftpSessionCache {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(None)))
    }
}

async fn ensure_sftp(ssh_handle: &SharedSshHandle, cache: &SftpSessionCache) -> IpcResult<()> {
    let mut guard = cache.0.lock().await;
    if guard.is_some() {
        return Ok(());
    }

    let channel = {
        let handle = ssh_handle.lock().await;
        let channel = handle.channel_open_session().await.map_err(|e| {
            IpcError::with_str_detail("sftp.channelOpenFailed", "raw", e.to_string())
        })?;

        channel
            .request_subsystem(true, "sftp")
            .await
            .map_err(|e| IpcError::with_str_detail("sftp.subsystemFailed", "raw", e.to_string()))?;

        channel
    };

    let sftp = SftpSession::new(channel.into_stream())
        .await
        .map_err(|e| IpcError::with_str_detail("sftp.initFailed", "raw", e.to_string()))?;

    *guard = Some(sftp);
    Ok(())
}

async fn reset_sftp_session(cache: &SftpSessionCache) {
    let mut guard = cache.0.lock().await;
    *guard = None;
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
) -> IpcResult<Vec<SftpEntry>> {
    ensure_sftp(ssh_handle, cache).await?;
    let path = normalize_remote_path(path);
    let guard = cache.0.lock().await;
    let sftp = guard
        .as_ref()
        .ok_or_else(|| IpcError::new("sftp.notInitialized"))?;

    let read_dir = sftp
        .read_dir(&path)
        .await
        .map_err(|e| IpcError::with_str_detail("sftp.listFailed", "raw", e.to_string()))?;

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

    entries.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

pub async fn upload_file(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    local_path: &str,
    remote_path: &str,
    app: Option<&AppHandle>,
    connection_id: Option<&str>,
    transfer_id: Option<&str>,
) -> IpcResult<()> {
    let local = Path::new(local_path);
    if !local.exists() {
        return Err(IpcError::with_str_detail(
            "fs.localFileNotFound",
            "path",
            local_path,
        ));
    }
    if !local.is_file() {
        return Err(IpcError::with_str_detail(
            "fs.localNotAFile",
            "path",
            local_path,
        ));
    }

    let file_size = std::fs::metadata(local)
        .map_err(|e| IpcError::with_str_detail("fs.statLocalFailed", "raw", e.to_string()))?
        .len();

    let file_name = local
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| local_path.to_string());

    let progress = match (app, connection_id, transfer_id) {
        (Some(app), Some(conn_id), Some(tid)) => Some(TransferProgress::new(
            app, tid, conn_id, &file_name, "upload", file_size,
        )),
        _ => None,
    };

    const CHUNK: usize = 64 * 1024;
    let mut data = Vec::with_capacity(file_size as usize);
    let mut file = std::fs::File::open(local)
        .map_err(|e| IpcError::with_str_detail("fs.openLocalFailed", "raw", e.to_string()))?;
    use std::io::Read;
    let mut buf = [0u8; CHUNK];
    let mut total_read = 0u64;
    loop {
        let n = file
            .read(&mut buf)
            .map_err(|e| IpcError::with_str_detail("fs.readLocalFailed", "raw", e.to_string()))?;
        if n == 0 {
            break;
        }
        data.extend_from_slice(&buf[..n]);
        total_read += n as u64;
        if let Some(ref p) = progress {
            p.update(total_read);
        }
    }

    let remote_path = normalize_remote_path(remote_path);

    ensure_sftp(ssh_handle, cache).await?;
    let guard = cache.0.lock().await;
    let sftp = guard
        .as_ref()
        .ok_or_else(|| IpcError::new("sftp.notInitialized"))?;

    let result = sftp
        .write(&remote_path, &data)
        .await
        .map_err(|e| IpcError::with_str_detail("sftp.uploadFailed", "raw", e.to_string()));

    match (&result, &progress) {
        (Ok(()), Some(p)) => p.done(),
        (Err(_), Some(p)) => p.error(),
        _ => {}
    }

    result
}

pub async fn download_file(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    remote_path: &str,
    local_path: &str,
    app: Option<&AppHandle>,
    connection_id: Option<&str>,
    transfer_id: Option<&str>,
) -> IpcResult<()> {
    let remote_path = normalize_remote_path(remote_path);
    let file_name = Path::new(&remote_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| remote_path.to_string());

    ensure_sftp(ssh_handle, cache).await?;

    let file_size = {
        let guard = cache.0.lock().await;
        let sftp = guard
            .as_ref()
            .ok_or_else(|| IpcError::new("sftp.notInitialized"))?;
        let metadata = sftp
            .metadata(&remote_path)
            .await
            .map_err(|e| IpcError::with_str_detail("sftp.statFailed", "raw", e.to_string()))?;
        metadata.len()
    };

    let progress = match (app, connection_id, transfer_id) {
        (Some(app), Some(conn_id), Some(tid)) => Some(TransferProgress::new(
            app, tid, conn_id, &file_name, "download", file_size,
        )),
        _ => None,
    };

    let data = {
        let guard = cache.0.lock().await;
        let sftp = guard
            .as_ref()
            .ok_or_else(|| IpcError::new("sftp.notInitialized"))?;

        sftp.read(&remote_path).await.map_err(|e| {
            if let Some(ref p) = progress {
                p.error();
            }
            IpcError::with_str_detail("sftp.readFailed", "raw", e.to_string())
        })?
    };

    if let Some(ref p) = progress {
        p.update(file_size);
    }

    if let Some(parent) = Path::new(local_path).parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(|e| {
                IpcError::with_str_detail("fs.createLocalDirFailed", "raw", e.to_string())
            })?;
        }
    }

    let result = std::fs::write(local_path, data)
        .map_err(|e| IpcError::with_str_detail("fs.writeLocalFailed", "raw", e.to_string()));

    match (&result, &progress) {
        (Ok(()), Some(p)) => p.done(),
        (Err(_), Some(p)) => p.error(),
        _ => {}
    }

    result
}

pub async fn download_dir(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    remote_path: &str,
    local_dir: &str,
    app: Option<&AppHandle>,
    connection_id: Option<&str>,
    transfer_id: Option<&str>,
) -> IpcResult<()> {
    let remote_path = normalize_remote_path(remote_path);
    let local_base = Path::new(local_dir);

    std::fs::create_dir_all(local_base)
        .map_err(|e| IpcError::with_str_detail("fs.createLocalDirFailed", "raw", e.to_string()))?;

    let entries = list_dir(ssh_handle, cache, &remote_path).await?;

    for entry in entries {
        let local_path = local_base.join(&entry.name);
        let local_path_str = local_path.to_string_lossy().into_owned();
        if entry.is_directory {
            Box::pin(download_dir(
                ssh_handle,
                cache,
                &entry.path,
                &local_path_str,
                app,
                connection_id,
                transfer_id,
            ))
            .await?;
        } else {
            download_file(
                ssh_handle,
                cache,
                &entry.path,
                &local_path_str,
                app,
                connection_id,
                transfer_id,
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
) -> IpcResult<()> {
    let remote_path = normalize_remote_path(remote_path);

    ensure_sftp(ssh_handle, cache).await?;
    let guard = cache.0.lock().await;
    let sftp = guard
        .as_ref()
        .ok_or_else(|| IpcError::new("sftp.notInitialized"))?;

    sftp.create_dir(&remote_path)
        .await
        .map_err(|e| IpcError::with_str_detail("sftp.mkdirFailed", "raw", e.to_string()))
}

pub async fn rename(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    old_path: &str,
    new_path: &str,
) -> IpcResult<()> {
    let old_path = normalize_remote_path(old_path);
    let new_path = normalize_remote_path(new_path);

    ensure_sftp(ssh_handle, cache).await?;
    let guard = cache.0.lock().await;
    let sftp = guard
        .as_ref()
        .ok_or_else(|| IpcError::new("sftp.notInitialized"))?;

    sftp.rename(old_path, new_path)
        .await
        .map_err(|e| IpcError::with_str_detail("sftp.renameFailed", "raw", e.to_string()))
}

async fn delete_inner(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    remote_path: &str,
    is_directory: bool,
) -> IpcResult<()> {
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
            .ok_or_else(|| IpcError::new("sftp.notInitialized"))?;
        sftp.remove_dir(remote_path)
            .await
            .map_err(|e| IpcError::with_str_detail("sftp.removeDirFailed", "raw", e.to_string()))
    } else {
        ensure_sftp(ssh_handle, cache).await?;
        let guard = cache.0.lock().await;
        let sftp = guard
            .as_ref()
            .ok_or_else(|| IpcError::new("sftp.notInitialized"))?;
        sftp.remove_file(remote_path)
            .await
            .map_err(|e| IpcError::with_str_detail("sftp.removeFileFailed", "raw", e.to_string()))
    }
}

pub async fn delete(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    remote_path: &str,
    is_directory: bool,
) -> IpcResult<()> {
    delete_inner(ssh_handle, cache, remote_path, is_directory).await
}

async fn count_files_inner(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    remote_path: &str,
) -> IpcResult<u64> {
    let remote_path = normalize_remote_path(remote_path);

    ensure_sftp(ssh_handle, cache).await?;

    let is_dir = {
        let guard = cache.0.lock().await;
        let sftp = guard
            .as_ref()
            .ok_or_else(|| IpcError::new("sftp.notInitialized"))?;

        let metadata = sftp
            .metadata(&remote_path)
            .await
            .map_err(|e| IpcError::with_str_detail("sftp.statFailed", "raw", e.to_string()))?;

        metadata.is_dir()
    };

    if !is_dir {
        return Ok(1);
    }

    let entries = list_dir(ssh_handle, cache, &remote_path).await?;
    let mut total_files = 0u64;

    for entry in entries {
        if entry.is_directory {
            total_files += Box::pin(count_files_inner(ssh_handle, cache, &entry.path)).await?;
        } else {
            total_files += 1;
        }
    }

    Ok(total_files)
}

pub async fn count_files(
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    remote_path: &str,
) -> IpcResult<u64> {
    count_files_inner(ssh_handle, cache, remote_path).await
}

async fn fetch_to_cache_inner(
    app: &tauri::AppHandle,
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    remote_path: &str,
) -> IpcResult<String> {
    let remote_path = normalize_remote_path(remote_path);
    let local_path = open_cache_path(app, &remote_path)?;
    let local_path_str = local_path.to_string_lossy().to_string();

    ensure_sftp(ssh_handle, cache).await?;

    {
        let guard = cache.0.lock().await;
        let sftp = guard
            .as_ref()
            .ok_or_else(|| IpcError::new("sftp.notInitialized"))?;

        let metadata = sftp
            .metadata(&remote_path)
            .await
            .map_err(|e| IpcError::with_str_detail("sftp.statFailed", "raw", e.to_string()))?;

        if metadata.is_dir() {
            return Err(IpcError::new("sftp.openDirAsFile"));
        }
    }

    download_file(
        ssh_handle,
        cache,
        &remote_path,
        &local_path_str,
        None,
        None,
        None,
    )
    .await?;
    Ok(local_path_str)
}

pub async fn fetch_to_cache(
    app: &tauri::AppHandle,
    ssh_handle: &SharedSshHandle,
    cache: &SftpSessionCache,
    remote_path: &str,
) -> IpcResult<String> {
    match fetch_to_cache_inner(app, ssh_handle, cache, remote_path).await {
        Ok(path) => Ok(path),
        Err(err) => {
            reset_sftp_session(cache).await;
            fetch_to_cache_inner(app, ssh_handle, cache, remote_path)
                .await
                .map_err(|retry_err| {
                    IpcError::with_str_detail(
                        "sftp.fetchRetryFailed",
                        "raw",
                        format!("{err}; retry failed: {retry_err}"),
                    )
                })
        }
    }
}
