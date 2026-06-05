use std::path::PathBuf;

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

pub fn expand_path(path: &str) -> Result<PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("path is empty".into());
    }

    if trimmed == "~" {
        return home_dir().ok_or_else(|| "home directory not found".to_string());
    }

    if let Some(rest) = trimmed.strip_prefix("~/") {
        let home = home_dir().ok_or_else(|| "home directory not found".to_string())?;
        return Ok(home.join(rest));
    }

    if trimmed == "~\\" || trimmed.starts_with("~\\") {
        let home = home_dir().ok_or_else(|| "home directory not found".to_string())?;
        let rest = trimmed.trim_start_matches('~').trim_start_matches('\\');
        return Ok(home.join(rest));
    }

    Ok(PathBuf::from(trimmed))
}

pub fn validate_key_path(path: &str) -> Result<PathBuf, String> {
    let expanded = expand_path(path)?;
    if !expanded.exists() {
        return Err(format!("key file not found: {}", expanded.display()));
    }
    Ok(expanded)
}

pub fn validate_protocol(protocol: &str) -> Result<(), String> {
    match protocol {
        "ssh" | "sftp" => Ok(()),
        "ftp" => Err("Терминал недоступен для FTP".into()),
        _ => Err(format!("unsupported protocol: {protocol}")),
    }
}
