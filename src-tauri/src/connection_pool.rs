use std::collections::HashMap;
use std::sync::Arc;

use tauri::AppHandle;
use tokio::sync::{mpsc, Mutex};
use uuid::Uuid;

use crate::events::emit_connection_status;
use crate::models::sftp::SftpEntry;
use crate::models::SessionConfig;
use crate::services::ssh::{
    connect_and_authenticate, run_shell_session, ChannelCommand, SharedSshHandle,
    CONNECT_TIMEOUT_SECS,
};
use crate::services::sftp::SftpSessionCache;

pub struct ConnectionHandle {
    pub session_id: String,
    pub ssh_handle: SharedSshHandle,
    pub input_tx: mpsc::UnboundedSender<ChannelCommand>,
    pub shell_task: tokio::task::JoinHandle<()>,
    pub sftp: SftpSessionCache,
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

    pub async fn connect(
        &mut self,
        app: AppHandle,
        session: SessionConfig,
        password: Option<String>,
    ) -> Result<String, String> {
        let connection_id = Uuid::new_v4().to_string();
        emit_connection_status(&app, &connection_id, "connecting", None);

        let ssh_handle = tokio::time::timeout(
            std::time::Duration::from_secs(CONNECT_TIMEOUT_SECS),
            connect_and_authenticate(&session, password),
        )
        .await
        .map_err(|_| "Connection timeout (30s)".to_string())?
        .map_err(|e| e.to_string())?;

        let ssh_handle: SharedSshHandle = Arc::new(Mutex::new(ssh_handle));
        let sftp = SftpSessionCache::new();
        let (input_tx, input_rx) = mpsc::unbounded_channel();

        let app_clone = app.clone();
        let conn_id = connection_id.clone();
        let handle_clone = ssh_handle.clone();

        let shell_task = tokio::spawn(async move {
            run_shell_session(app_clone, conn_id, handle_clone, input_rx).await;
        });

        self.connections.insert(
            connection_id.clone(),
            ConnectionHandle {
                session_id: session.id,
                ssh_handle,
                input_tx,
                shell_task,
                sftp,
            },
        );

        Ok(connection_id)
    }

    pub fn disconnect(&mut self, connection_id: &str) -> Result<(), String> {
        let handle = self
            .connections
            .remove(connection_id)
            .ok_or_else(|| format!("connection not found: {connection_id}"))?;

        let _ = handle.input_tx.send(ChannelCommand::Data(vec![]));
        handle.shell_task.abort();
        Ok(())
    }

    pub fn write(&self, connection_id: &str, data: Vec<u8>) -> Result<(), String> {
        let handle = self.get(connection_id)?;
        handle
            .input_tx
            .send(ChannelCommand::Data(data))
            .map_err(|e| format!("failed to send data: {e}"))
    }

    pub fn resize(&self, connection_id: &str, cols: u32, rows: u32) -> Result<(), String> {
        let handle = self.get(connection_id)?;
        handle
            .input_tx
            .send(ChannelCommand::Resize { cols, rows })
            .map_err(|e| format!("failed to resize: {e}"))
    }

    pub async fn list_dir(
        &self,
        connection_id: &str,
        path: &str,
    ) -> Result<Vec<SftpEntry>, String> {
        let handle = self.get(connection_id)?;
        crate::services::sftp::list_dir(&handle.ssh_handle, &handle.sftp, path).await
    }

    pub async fn upload_file(
        &self,
        connection_id: &str,
        local_path: &str,
        remote_path: &str,
    ) -> Result<(), String> {
        let handle = self.get(connection_id)?;
        crate::services::sftp::upload_file(&handle.ssh_handle, &handle.sftp, local_path, remote_path)
            .await
    }

    pub async fn download(
        &self,
        connection_id: &str,
        remote_path: &str,
        local_path: &str,
        is_directory: bool,
    ) -> Result<(), String> {
        let handle = self.get(connection_id)?;
        if is_directory {
            crate::services::sftp::download_dir(
                &handle.ssh_handle,
                &handle.sftp,
                remote_path,
                local_path,
            )
            .await
        } else {
            crate::services::sftp::download_file(
                &handle.ssh_handle,
                &handle.sftp,
                remote_path,
                local_path,
            )
            .await
        }
    }

    pub async fn mkdir(&self, connection_id: &str, remote_path: &str) -> Result<(), String> {
        let handle = self.get(connection_id)?;
        crate::services::sftp::mkdir(&handle.ssh_handle, &handle.sftp, remote_path).await
    }

    fn get(&self, connection_id: &str) -> Result<&ConnectionHandle, String> {
        self.connections
            .get(connection_id)
            .ok_or_else(|| format!("connection not found: {connection_id}"))
    }
}
