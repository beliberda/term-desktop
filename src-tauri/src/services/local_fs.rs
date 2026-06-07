use std::path::{Path, PathBuf};

use crate::error::{IpcError, IpcResult};
use crate::models::sftp::SftpEntry;

fn system_time_to_iso(time: std::time::SystemTime) -> Option<String> {
    let secs = time.duration_since(std::time::UNIX_EPOCH).ok()?.as_secs();
    chrono::DateTime::from_timestamp(secs as i64, 0).map(|dt| dt.to_rfc3339())
}

fn join_local_path(parent: &Path, name: &str) -> String {
    parent.join(name).to_string_lossy().to_string()
}

pub fn list_dir(path: &str) -> IpcResult<Vec<SftpEntry>> {
    let dir = Path::new(path);
    if !dir.exists() {
        return Err(IpcError::with_str_detail(
            "fs.localDirNotFound",
            "path",
            path,
        ));
    }
    if !dir.is_dir() {
        return Err(IpcError::with_str_detail(
            "fs.localNotADirectory",
            "path",
            path,
        ));
    }

    let mut entries: Vec<SftpEntry> = std::fs::read_dir(dir)
        .map_err(|e| IpcError::with_str_detail("fs.listLocalFailed", "raw", e.to_string()))?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let metadata = entry.metadata().ok()?;
            let name = entry.file_name().to_string_lossy().to_string();
            let path_str = join_local_path(dir, &name);
            Some(SftpEntry {
                name,
                path: path_str,
                is_directory: metadata.is_dir(),
                size: if metadata.is_dir() { 0 } else { metadata.len() },
                modified_at: metadata.modified().ok().and_then(system_time_to_iso),
            })
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

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalStat {
    pub exists: bool,
    pub is_directory: bool,
    pub size: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified_at: Option<String>,
}

pub fn stat(path: &str) -> IpcResult<LocalStat> {
    let p = Path::new(path);
    if !p.exists() {
        return Ok(LocalStat {
            exists: false,
            is_directory: false,
            size: 0,
            modified_at: None,
        });
    }

    let metadata = std::fs::metadata(p)
        .map_err(|e| IpcError::with_str_detail("fs.statLocalFailed", "raw", e.to_string()))?;

    Ok(LocalStat {
        exists: true,
        is_directory: metadata.is_dir(),
        size: if metadata.is_dir() { 0 } else { metadata.len() },
        modified_at: metadata.modified().ok().and_then(system_time_to_iso),
    })
}

pub fn exists(path: &str) -> IpcResult<bool> {
    Ok(Path::new(path).exists())
}

pub fn mkdir(path: &str) -> IpcResult<()> {
    std::fs::create_dir_all(path)
        .map_err(|e| IpcError::with_str_detail("fs.mkdirLocalFailed", "raw", e.to_string()))
}

pub fn rename(old_path: &str, new_path: &str) -> IpcResult<()> {
    std::fs::rename(old_path, new_path)
        .map_err(|e| IpcError::with_str_detail("fs.renameLocalFailed", "raw", e.to_string()))
}

pub fn delete(path: &str, is_directory: bool) -> IpcResult<()> {
    let p = Path::new(path);
    if is_directory {
        std::fs::remove_dir_all(p)
            .map_err(|e| IpcError::with_str_detail("fs.deleteLocalDirFailed", "raw", e.to_string()))
    } else {
        std::fs::remove_file(p)
            .map_err(|e| IpcError::with_str_detail("fs.deleteLocalFileFailed", "raw", e.to_string()))
    }
}

pub fn default_home_dir() -> Option<String> {
    dirs::home_dir().map(|p| p.to_string_lossy().to_string())
}

pub fn normalize_local_path(path: &str) -> String {
    let p = PathBuf::from(path);
    p.to_string_lossy().to_string()
}
