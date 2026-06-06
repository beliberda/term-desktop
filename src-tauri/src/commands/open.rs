use std::path::Path;

use crate::error::{IpcError, IpcResult};

#[tauri::command]
pub async fn open_in_editor(
    local_path: String,
    editor_path: Option<String>,
) -> IpcResult<()> {
    let local = Path::new(&local_path);
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

    let editor = editor_path
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    if let Some(exe) = editor {
        std::process::Command::new(&exe)
            .arg(local)
            .spawn()
            .map_err(|e| IpcError::with_str_detail("fs.editorLaunchFailed", "raw", e.to_string()))?;
        return Ok(());
    }

    open::that(local)
        .map_err(|e| IpcError::with_str_detail("fs.editorLaunchFailed", "raw", e.to_string()))
}
