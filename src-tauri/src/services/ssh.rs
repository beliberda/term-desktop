use std::sync::Arc;

use anyhow::{anyhow, Context, Result};
use async_trait::async_trait;
use russh::client::{self, Handle, Msg};
use russh::{Channel, ChannelMsg};
use russh_keys::load_secret_key;
use tauri::AppHandle;
use tokio::sync::{mpsc, Mutex};

use crate::error::{IpcError, IpcResult};
use crate::events::{emit_connection_status, emit_terminal_output};
use crate::models::SessionConfig;
use crate::utils::paths::validate_key_path;

pub const CONNECT_TIMEOUT_SECS: u64 = 30;

pub enum ChannelCommand {
    Data(Vec<u8>),
    Resize { cols: u32, rows: u32 },
}

pub struct SshClient;

#[async_trait]
impl client::Handler for SshClient {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &russh_keys::key::PublicKey,
    ) -> Result<bool, Self::Error> {
        Ok(true)
    }
}

pub type SharedSshHandle = Arc<Mutex<Handle<SshClient>>>;

pub fn map_ssh_connect_error(err: anyhow::Error) -> IpcError {
    let msg = err.to_string().to_lowercase();
    if msg.contains("password is required") {
        return IpcError::new("ssh.passwordRequired");
    }
    if msg.contains("authentication failed: invalid password") {
        return IpcError::new("ssh.authFailed");
    }
    if msg.contains("authentication failed: invalid key") {
        return IpcError::new("ssh.keyAuthFailed");
    }
    if msg.contains("failed to load private key") {
        return IpcError::with_str_detail("ssh.keyLoadFailed", "raw", err.to_string());
    }
    if msg.contains("ssh agent") {
        return IpcError::new("ssh.agentNotSupported");
    }
    if msg.contains("unsupported auth type") {
        return IpcError::with_str_detail("ssh.unsupportedAuthType", "raw", err.to_string());
    }
    if msg.contains("failed to connect to host") {
        return IpcError::with_str_detail("ssh.connectFailed", "raw", err.to_string());
    }
    if msg.contains("privatekeypath is required") {
        return IpcError::new("ssh.privateKeyPathRequired");
    }
    IpcError::with_str_detail("unknown", "raw", err.to_string())
}

pub async fn connect_and_authenticate(
    session: &SessionConfig,
    password: Option<String>,
) -> IpcResult<Handle<SshClient>> {
    let config = Arc::new(client::Config::default());
    let addr = (session.host.as_str(), session.port);
    let mut handle = client::connect(config, addr, SshClient)
        .await
        .context("failed to connect to host")
        .map_err(map_ssh_connect_error)?;

    authenticate(&mut handle, session, password).await?;
    Ok(handle)
}

pub async fn run_shell_session(
    app: AppHandle,
    connection_id: String,
    ssh_handle: SharedSshHandle,
    mut cmd_rx: mpsc::UnboundedReceiver<ChannelCommand>,
) {
    let result = run_shell_inner(&app, &connection_id, ssh_handle, &mut cmd_rx).await;

    match result {
        Ok(()) => {
            emit_connection_status(&app, &connection_id, "disconnected", None);
        }
        Err(err) => {
            emit_connection_status(&app, &connection_id, "error", Some(err));
        }
    }

    while cmd_rx.try_recv().is_ok() {}
}

async fn run_shell_inner(
    app: &AppHandle,
    connection_id: &str,
    ssh_handle: SharedSshHandle,
    cmd_rx: &mut mpsc::UnboundedReceiver<ChannelCommand>,
) -> IpcResult<()> {
    let channel = {
        let handle = ssh_handle.lock().await;
        let channel = handle
            .channel_open_session()
            .await
            .map_err(|e| IpcError::with_str_detail("ssh.channelOpenFailed", "raw", e.to_string()))?;

        channel
            .request_pty(false, "xterm", 80, 24, 0, 0, &[])
            .await
            .map_err(|e| IpcError::with_str_detail("ssh.ptyFailed", "raw", e.to_string()))?;

        channel
            .request_shell(false)
            .await
            .map_err(|e| IpcError::with_str_detail("ssh.shellFailed", "raw", e.to_string()))?;

        channel
    };

    emit_connection_status(app, connection_id, "connected", None);
    run_channel_loop(app, connection_id, channel, cmd_rx).await
}

async fn authenticate(
    handle: &mut Handle<SshClient>,
    session: &SessionConfig,
    password: Option<String>,
) -> IpcResult<()> {
    match session.auth_type.as_str() {
        "password" => {
            let pwd = password.ok_or_else(|| IpcError::new("ssh.passwordRequired"))?;
            let ok = handle
                .authenticate_password(&session.username, pwd)
                .await
                .map_err(|e| IpcError::with_str_detail("ssh.authFailed", "raw", e.to_string()))?;
            if !ok {
                return Err(IpcError::new("ssh.authFailed"));
            }
        }
        "privateKey" => {
            let path = session
                .private_key_path
                .as_ref()
                .ok_or_else(|| IpcError::new("ssh.privateKeyPathRequired"))?;
            let key_path = validate_key_path(path)?;
            let passphrase = password
                .as_deref()
                .filter(|p| !p.is_empty());
            let key_pair = load_secret_key(key_path, passphrase)
                .map_err(|e| IpcError::with_str_detail("ssh.keyLoadFailed", "raw", e.to_string()))?;
            let ok = handle
                .authenticate_publickey(&session.username, Arc::new(key_pair))
                .await
                .map_err(|e| IpcError::with_str_detail("ssh.keyAuthFailed", "raw", e.to_string()))?;
            if !ok {
                return Err(IpcError::new("ssh.keyAuthFailed"));
            }
        }
        "agent" => {
            return Err(IpcError::new("ssh.agentNotSupported"));
        }
        other => {
            return Err(IpcError::with_str_detail(
                "ssh.unsupportedAuthType",
                "authType",
                other,
            ));
        }
    }
    Ok(())
}

async fn run_channel_loop(
    app: &AppHandle,
    connection_id: &str,
    mut channel: Channel<Msg>,
    cmd_rx: &mut mpsc::UnboundedReceiver<ChannelCommand>,
) -> IpcResult<()> {
    loop {
        tokio::select! {
            msg = channel.wait() => {
                match msg {
                    Some(ChannelMsg::Data { data }) => {
                        emit_terminal_output(app, connection_id, &data);
                    }
                    Some(ChannelMsg::ExtendedData { data, ext: _ }) => {
                        emit_terminal_output(app, connection_id, &data);
                    }
                    Some(ChannelMsg::Eof) | None => {
                        break;
                    }
                    Some(ChannelMsg::Close) => {
                        break;
                    }
                    Some(ChannelMsg::ExitStatus { .. }) => {
                        break;
                    }
                    _ => {}
                }
            }
            cmd = cmd_rx.recv() => {
                match cmd {
                    Some(ChannelCommand::Data(data)) => {
                        if data.is_empty() {
                            continue;
                        }
                        channel.data(&data[..]).await.map_err(|e| {
                            IpcError::with_str_detail("ssh.writeFailed", "raw", e.to_string())
                        })?;
                    }
                    Some(ChannelCommand::Resize { cols, rows }) => {
                        channel.window_change(cols, rows, 0, 0).await.map_err(|e| {
                            IpcError::with_str_detail("ssh.resizeChannelFailed", "raw", e.to_string())
                        })?;
                    }
                    None => break,
                }
            }
        }
    }

    let _ = channel.close().await;
    Ok(())
}

pub async fn test_connect(
    host: String,
    port: u16,
    username: String,
    private_key_path: Option<String>,
    password: Option<String>,
) -> Result<String, anyhow::Error> {
    let session = SessionConfig {
        id: "test".into(),
        name: "test".into(),
        protocol: "ssh".into(),
        host,
        port,
        username,
        auth_type: if private_key_path.is_some() {
            "privateKey".into()
        } else {
            "password".into()
        },
        private_key_path: private_key_path,
        default_path: None,
        local_path: None,
        remote_path: None,
        sync_browse: None,
        file_conflict_policy: None,
        created_at: String::new(),
        updated_at: String::new(),
    };

    let handle = connect_and_authenticate(&session, password)
        .await
        .map_err(|e| anyhow!(e.to_string()))?;

    let channel = handle
        .channel_open_session()
        .await
        .map_err(|e| anyhow!(e))?;

    channel
        .request_pty(false, "xterm", 80, 24, 0, 0, &[])
        .await
        .map_err(|e| anyhow!(e))?;

    channel
        .request_shell(false)
        .await
        .map_err(|e| anyhow!(e))?;

    Ok("SSH shell opened successfully".into())
}
