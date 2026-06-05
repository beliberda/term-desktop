use std::path::Path;
use std::sync::Arc;
use std::time::{Duration, UNIX_EPOCH};

use suppaftp::list::ListParser;
use suppaftp::tokio::AsyncFtpStream;
use tokio::io::AsyncReadExt;
use tokio::sync::Mutex;

use crate::models::sftp::SftpEntry;
use crate::models::SessionConfig;
use crate::services::ssh::CONNECT_TIMEOUT_SECS;
use crate::utils::sftp_paths::normalize_remote_path;

pub type SharedFtpClient = Arc<Mutex<AsyncFtpStream>>;

pub async fn connect(
    session: &SessionConfig,
    password: Option<String>,
) -> Result<AsyncFtpStream, String> {
    let pwd = password.ok_or_else(|| "password is required for FTP".to_string())?;
    let addr = format!("{}:{}", session.host, session.port);

    let ftp = tokio::time::timeout(
        Duration::from_secs(CONNECT_TIMEOUT_SECS),
        AsyncFtpStream::connect(&addr),
    )
    .await
    .map_err(|_| "Connection timeout (30s)".to_string())?
    .map_err(|e| format!("failed to connect to FTP server: {e}"))?;

    let mut ftp = ftp;
    ftp.login(&session.username, &pwd)
        .await
        .map_err(|e| format!("FTP login failed: {e}"))?;

    Ok(ftp)
}

fn join_entry_path(parent: &str, name: &str) -> String {
    let parent = normalize_remote_path(parent);
    if parent == "/" {
        format!("/{name}")
    } else {
        format!("{parent}/{name}")
    }
}

fn system_time_to_iso(time: std::time::SystemTime) -> Option<String> {
    let secs = time.duration_since(UNIX_EPOCH).ok()?.as_secs();
    chrono::DateTime::from_timestamp(secs as i64, 0)
        .map(|dt| dt.to_rfc3339())
}

fn parse_list_line(line: &str) -> Option<suppaftp::list::File> {
    ListParser::parse_posix(line)
        .ok()
        .or_else(|| ListParser::parse_dos(line).ok())
}

pub async fn list_dir(client: &SharedFtpClient, path: &str) -> Result<Vec<SftpEntry>, String> {
    let path = normalize_remote_path(path);
    let mut ftp = client.lock().await;

    let list_path = if path == "/" { None } else { Some(path.as_str()) };
    let lines = ftp
        .list(list_path)
        .await
        .map_err(|e| format!("failed to list directory: {e}"))?;

    let mut entries: Vec<SftpEntry> = lines
        .iter()
        .filter_map(|line| {
            let file = parse_list_line(line)?;
            let name = file.name().to_string();
            if name == "." || name == ".." {
                return None;
            }
            Some(SftpEntry {
                name: name.clone(),
                path: join_entry_path(&path, &name),
                is_directory: file.is_directory(),
                size: file.size() as u64,
                modified_at: system_time_to_iso(file.modified()),
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

pub async fn upload_file(
    client: &SharedFtpClient,
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

    let remote_path = normalize_remote_path(remote_path);
    let mut file = tokio::fs::File::open(local)
        .await
        .map_err(|e| format!("failed to open local file: {e}"))?;

    let mut ftp = client.lock().await;
    ftp.put_file(&remote_path, &mut file)
        .await
        .map_err(|e| format!("failed to upload file: {e}"))?;

    Ok(())
}

pub async fn download_file(
    client: &SharedFtpClient,
    remote_path: &str,
    local_path: &str,
) -> Result<(), String> {
    let remote_path = normalize_remote_path(remote_path);
    let mut ftp = client.lock().await;

    let mut stream = ftp
        .retr_as_stream(&remote_path)
        .await
        .map_err(|e| format!("failed to download file: {e}"))?;

    let mut data = Vec::new();
    stream
        .read_to_end(&mut data)
        .await
        .map_err(|e| format!("failed to read FTP stream: {e}"))?;

    ftp.finalize_retr_stream(stream)
        .await
        .map_err(|e| format!("failed to finalize download: {e}"))?;

    if let Some(parent) = Path::new(local_path).parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("failed to create local directory: {e}"))?;
        }
    }

    std::fs::write(local_path, data).map_err(|e| format!("failed to write local file: {e}"))
}

pub async fn download_dir(
    client: &SharedFtpClient,
    remote_path: &str,
    local_dir: &str,
) -> Result<(), String> {
    let remote_path = normalize_remote_path(remote_path);
    let local_base = Path::new(local_dir);

    std::fs::create_dir_all(local_base)
        .map_err(|e| format!("failed to create local directory: {e}"))?;

    let entries = list_dir(client, &remote_path).await?;

    for entry in entries {
        let local_path = local_base.join(&entry.name);
        if entry.is_directory {
            Box::pin(download_dir(
                client,
                &entry.path,
                local_path.to_string_lossy().as_ref(),
            ))
            .await?;
        } else {
            download_file(
                client,
                &entry.path,
                local_path.to_string_lossy().as_ref(),
            )
            .await?;
        }
    }

    Ok(())
}

pub async fn mkdir(client: &SharedFtpClient, remote_path: &str) -> Result<(), String> {
    let remote_path = normalize_remote_path(remote_path);
    let mut ftp = client.lock().await;
    ftp.mkdir(&remote_path)
        .await
        .map_err(|e| format!("failed to create directory: {e}"))
}

pub async fn disconnect_client(client: &SharedFtpClient) {
    let mut ftp = client.lock().await;
    let _ = ftp.quit().await;
}
