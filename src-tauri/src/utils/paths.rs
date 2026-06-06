use std::path::PathBuf;

use crate::error::{IpcError, IpcResult};

pub fn home_dir() -> Option<PathBuf> {
    #[cfg(windows)]
    {
        std::env::var_os("USERPROFILE").map(PathBuf::from)
    }
    #[cfg(not(windows))]
    {
        std::env::var_os("HOME").map(PathBuf::from)
    }
}

pub fn expand_path(path: &str) -> IpcResult<PathBuf> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(IpcError::new("fs.pathEmpty"));
    }

    if trimmed == "~" {
        return home_dir()
            .ok_or_else(|| IpcError::new("fs.homeNotFound"))
            .map(Into::into);
    }

    if let Some(rest) = trimmed.strip_prefix("~/") {
        let home = home_dir().ok_or_else(|| IpcError::new("fs.homeNotFound"))?;
        return Ok(home.join(rest));
    }

    if trimmed == "~\\" || trimmed.starts_with("~\\") {
        let home = home_dir().ok_or_else(|| IpcError::new("fs.homeNotFound"))?;
        let rest = trimmed.trim_start_matches('~').trim_start_matches('\\');
        return Ok(home.join(rest));
    }

    Ok(PathBuf::from(trimmed))
}

pub fn validate_key_path(path: &str) -> IpcResult<PathBuf> {
    let expanded = expand_path(path)?;
    if !expanded.exists() {
        return Err(IpcError::with_str_detail(
            "fs.keyFileNotFound",
            "path",
            expanded.display().to_string(),
        ));
    }
    Ok(expanded)
}

pub fn validate_protocol(protocol: &str) -> IpcResult<()> {
    match protocol {
        "ssh" | "sftp" => Ok(()),
        "ftp" => Err(IpcError::new("ftp.terminalUnavailable")),
        _ => Err(IpcError::with_str_detail(
            "protocol.unsupported",
            "protocol",
            protocol,
        )),
    }
}

pub fn validate_ftp_protocol(protocol: &str) -> IpcResult<()> {
    match protocol {
        "ftp" => Ok(()),
        _ => Err(IpcError::with_str_detail(
            "protocol.mustBeFtp",
            "protocol",
            protocol,
        )),
    }
}
