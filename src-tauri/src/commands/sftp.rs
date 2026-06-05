use std::sync::Arc;

use tauri::State;
use tokio::sync::Mutex as AsyncMutex;

use crate::connection_pool::ConnectionPool;
use crate::models::sftp::SftpEntry;

type PoolState = Arc<AsyncMutex<ConnectionPool>>;

#[tauri::command]
pub async fn sftp_list_dir(
    pool: State<'_, PoolState>,
    connection_id: String,
    path: String,
) -> Result<Vec<SftpEntry>, String> {
    let pool = pool.lock().await;
    pool.list_dir(&connection_id, &path).await
}

#[tauri::command]
pub async fn sftp_upload(
    pool: State<'_, PoolState>,
    connection_id: String,
    local_path: String,
    remote_path: String,
) -> Result<(), String> {
    let pool = pool.lock().await;
    pool.upload_file(&connection_id, &local_path, &remote_path)
        .await
}

#[tauri::command]
pub async fn sftp_download(
    pool: State<'_, PoolState>,
    connection_id: String,
    remote_path: String,
    local_path: String,
    is_directory: bool,
) -> Result<(), String> {
    let pool = pool.lock().await;
    pool.download(&connection_id, &remote_path, &local_path, is_directory)
        .await
}

#[tauri::command]
pub async fn sftp_mkdir(
    pool: State<'_, PoolState>,
    connection_id: String,
    remote_path: String,
) -> Result<(), String> {
    let pool = pool.lock().await;
    pool.mkdir(&connection_id, &remote_path).await
}
