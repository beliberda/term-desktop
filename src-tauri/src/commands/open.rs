use std::path::Path;

#[tauri::command]
pub async fn open_in_editor(
    local_path: String,
    editor_path: Option<String>,
) -> Result<(), String> {
    let local = Path::new(&local_path);
    if !local.exists() {
        return Err(format!("local file not found: {local_path}"));
    }
    if !local.is_file() {
        return Err(format!("local path is not a file: {local_path}"));
    }

    let editor = editor_path
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    if let Some(exe) = editor {
        std::process::Command::new(&exe)
            .arg(local)
            .spawn()
            .map_err(|e| format!("failed to launch editor: {e}"))?;
        return Ok(());
    }

    open::that(local).map_err(|e| format!("failed to open file with default application: {e}"))
}
