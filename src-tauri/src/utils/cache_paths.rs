use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;

use tauri::AppHandle;
use tauri::Manager;

pub fn open_cache_path(app: &AppHandle, remote_path: &str) -> Result<PathBuf, String> {
    let filename = remote_path
        .split('/')
        .filter(|p| !p.is_empty())
        .last()
        .ok_or_else(|| "invalid remote path".to_string())?;

    let mut hasher = DefaultHasher::new();
    remote_path.hash(&mut hasher);
    let safe_name = format!("{:016x}-{}", hasher.finish(), filename);

    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("failed to resolve app cache dir: {e}"))?
        .join("termassh")
        .join("open");

    std::fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("failed to create cache dir: {e}"))?;

    Ok(cache_dir.join(safe_name))
}
