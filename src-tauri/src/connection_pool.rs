use std::collections::HashMap;
use std::sync::Arc;

use tauri::AppHandle;
use tokio::sync::{mpsc, Mutex};
use uuid::Uuid;

use crate::error::{IpcError, IpcResult};
use crate::events::emit_connection_status;
use crate::models::sftp::SftpEntry;
use crate::models::SessionConfig;
use crate::services::ftp::{self, SharedFtpClient};
use crate::services::sftp::SftpSessionCache;
use crate::services::ssh::{run_shell_session, ChannelCommand, SharedSshHandle};

pub enum ConnectionKind {
    Ssh {
        ssh_handle: SharedSshHandle,
        input_tx: mpsc::UnboundedSender<ChannelCommand>,
        shell_task: tokio::task::JoinHandle<()>,
        sftp: SftpSessionCache,
    },
    Ftp {
        client: SharedFtpClient,
    },
}

pub struct ConnectionHandle {
    pub session_id: String,
    pub kind: ConnectionKind,
}

pub struct ConnectionPool {
    connections: HashMap<String, ConnectionHandle>,
}

impl ConnectionPool {
    pub fn new() -> Self {
        Self {
            connections: HashMap::new(),
        }
    }

    pub fn register_ssh(
        &mut self,
        app: AppHandle,
        connection_id: String,
        session: SessionConfig,
        ssh_handle: SharedSshHandle,
    ) {
        let sftp = SftpSessionCache::new();
        let (input_tx, input_rx) = mpsc::unbounded_channel();

        let app_clone = app.clone();
        let conn_id = connection_id.clone();
        let handle_clone = ssh_handle.clone();

        let shell_task = tokio::spawn(async move {
            run_shell_session(app_clone, conn_id, handle_clone, input_rx).await;
        });

        self.connections.insert(
            connection_id,
            ConnectionHandle {
                session_id: session.id,
                kind: ConnectionKind::Ssh {
                    ssh_handle,
                    input_tx,
                    shell_task,
                    sftp,
                },
            },
        );
    }

    pub async fn connect_ftp(
        &mut self,
        app: AppHandle,
        session: SessionConfig,
        password: Option<String>,
    ) -> IpcResult<String> {
        let connection_id = Uuid::new_v4().to_string();
        tracing::info!(connection_id = %connection_id, session_id = %session.id, "FTP connect started");
        emit_connection_status(&app, &connection_id, "connecting", None);

        let ftp = match ftp::connect(&session, password).await {
            Ok(client) => client,
            Err(err) => {
                emit_connection_status(&app, &connection_id, "error", Some(err.clone()));
                return Err(err);
            }
        };
        let client: SharedFtpClient = Arc::new(Mutex::new(ftp));

        emit_connection_status(&app, &connection_id, "connected", None);

        self.connections.insert(
            connection_id.clone(),
            ConnectionHandle {
                session_id: session.id,
                kind: ConnectionKind::Ftp { client },
            },
        );

        Ok(connection_id)
    }

    pub async fn disconnect(&mut self, connection_id: &str) -> IpcResult<()> {
        let Some(handle) = self.connections.remove(connection_id) else {
            return Ok(());
        };

        tracing::info!(
            connection_id = %connection_id,
            session_id = %handle.session_id,
            "disconnect"
        );

        match handle.kind {
            ConnectionKind::Ssh {
                input_tx,
                shell_task,
                ..
            } => {
                let _ = input_tx.send(ChannelCommand::Data(vec![]));
                shell_task.abort();
            }
            ConnectionKind::Ftp { client } => {
                ftp::disconnect_client(&client).await;
            }
        }

        Ok(())
    }

    pub fn write(&self, connection_id: &str, data: Vec<u8>) -> IpcResult<()> {
        let handle = self.get(connection_id)?;
        match &handle.kind {
            ConnectionKind::Ssh { input_tx, .. } => {
                input_tx.send(ChannelCommand::Data(data)).map_err(|e| {
                    IpcError::with_str_detail("connection.sendDataFailed", "raw", e.to_string())
                })
            }
            ConnectionKind::Ftp { .. } => Err(IpcError::new("connection.writeNotSupported")),
        }
    }

    pub fn resize(&self, connection_id: &str, cols: u32, rows: u32) -> IpcResult<()> {
        let handle = self.get(connection_id)?;
        match &handle.kind {
            ConnectionKind::Ssh { input_tx, .. } => input_tx
                .send(ChannelCommand::Resize { cols, rows })
                .map_err(|e| {
                    IpcError::with_str_detail("connection.resizeFailed", "raw", e.to_string())
                }),
            ConnectionKind::Ftp { .. } => Err(IpcError::new("connection.resizeNotSupported")),
        }
    }

    pub async fn list_dir(&self, connection_id: &str, path: &str) -> IpcResult<Vec<SftpEntry>> {
        let handle = self.get(connection_id)?;
        match &handle.kind {
            ConnectionKind::Ssh {
                ssh_handle, sftp, ..
            } => crate::services::sftp::list_dir(ssh_handle, sftp, path).await,
            ConnectionKind::Ftp { client } => ftp::list_dir(client, path).await,
        }
    }

    pub async fn count_files(&self, connection_id: &str, remote_path: &str) -> IpcResult<u64> {
        let handle = self.get(connection_id)?;
        match &handle.kind {
            ConnectionKind::Ssh {
                ssh_handle, sftp, ..
            } => crate::services::sftp::count_files(ssh_handle, sftp, remote_path).await,
            ConnectionKind::Ftp { client } => ftp::count_files(client, remote_path).await,
        }
    }

    pub async fn upload_file(
        &self,
        app: Option<&AppHandle>,
        connection_id: &str,
        local_path: &str,
        remote_path: &str,
        transfer_id: Option<&str>,
    ) -> IpcResult<()> {
        let handle = self.get(connection_id)?;
        match &handle.kind {
            ConnectionKind::Ssh {
                ssh_handle, sftp, ..
            } => {
                crate::services::sftp::upload_file(
                    ssh_handle,
                    sftp,
                    local_path,
                    remote_path,
                    app,
                    Some(connection_id),
                    transfer_id,
                )
                .await
            }
            ConnectionKind::Ftp { client } => {
                ftp::upload_file(
                    client,
                    local_path,
                    remote_path,
                    app,
                    Some(connection_id),
                    transfer_id,
                )
                .await
            }
        }
    }

    pub async fn download(
        &self,
        app: Option<&AppHandle>,
        connection_id: &str,
        remote_path: &str,
        local_path: &str,
        is_directory: bool,
        transfer_id: Option<&str>,
    ) -> IpcResult<()> {
        let handle = self.get(connection_id)?;
        match &handle.kind {
            ConnectionKind::Ssh {
                ssh_handle, sftp, ..
            } => {
                if is_directory {
                    crate::services::sftp::download_dir(
                        ssh_handle,
                        sftp,
                        remote_path,
                        local_path,
                        app,
                        Some(connection_id),
                        transfer_id,
                    )
                    .await
                } else {
                    crate::services::sftp::download_file(
                        ssh_handle,
                        sftp,
                        remote_path,
                        local_path,
                        app,
                        Some(connection_id),
                        transfer_id,
                    )
                    .await
                }
            }
            ConnectionKind::Ftp { client } => {
                if is_directory {
                    ftp::download_dir(
                        client,
                        remote_path,
                        local_path,
                        app,
                        Some(connection_id),
                        transfer_id,
                    )
                    .await
                } else {
                    ftp::download_file(
                        client,
                        remote_path,
                        local_path,
                        app,
                        Some(connection_id),
                        transfer_id,
                    )
                    .await
                }
            }
        }
    }

    pub async fn mkdir(&self, connection_id: &str, remote_path: &str) -> IpcResult<()> {
        let handle = self.get(connection_id)?;
        match &handle.kind {
            ConnectionKind::Ssh {
                ssh_handle, sftp, ..
            } => crate::services::sftp::mkdir(ssh_handle, sftp, remote_path).await,
            ConnectionKind::Ftp { client } => ftp::mkdir(client, remote_path).await,
        }
    }

    pub async fn delete(
        &self,
        connection_id: &str,
        remote_path: &str,
        is_directory: bool,
    ) -> IpcResult<()> {
        let handle = self.get(connection_id)?;
        match &handle.kind {
            ConnectionKind::Ssh {
                ssh_handle, sftp, ..
            } => crate::services::sftp::delete(ssh_handle, sftp, remote_path, is_directory).await,
            ConnectionKind::Ftp { client } => ftp::delete(client, remote_path, is_directory).await,
        }
    }

    pub async fn rename(
        &self,
        connection_id: &str,
        old_path: &str,
        new_path: &str,
    ) -> IpcResult<()> {
        let handle = self.get(connection_id)?;
        match &handle.kind {
            ConnectionKind::Ssh {
                ssh_handle, sftp, ..
            } => crate::services::sftp::rename(ssh_handle, sftp, old_path, new_path).await,
            ConnectionKind::Ftp { client } => ftp::rename(client, old_path, new_path).await,
        }
    }

    pub async fn fetch_to_cache(
        &self,
        app: &tauri::AppHandle,
        connection_id: &str,
        remote_path: &str,
    ) -> IpcResult<String> {
        let handle = self.get(connection_id)?;
        match &handle.kind {
            ConnectionKind::Ssh {
                ssh_handle, sftp, ..
            } => crate::services::sftp::fetch_to_cache(app, ssh_handle, sftp, remote_path).await,
            ConnectionKind::Ftp { client } => ftp::fetch_to_cache(app, client, remote_path).await,
        }
    }

    fn get(&self, connection_id: &str) -> IpcResult<&ConnectionHandle> {
        self.connections.get(connection_id).ok_or_else(|| {
            IpcError::with_str_detail("connection.notFound", "connectionId", connection_id)
        })
    }
}
