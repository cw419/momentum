#[tauri::command]
pub async fn set_fullscreen(
    window: tauri::WebviewWindow,
    fullscreen: bool,
) -> Result<(), String> {
    window
        .set_fullscreen(fullscreen)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn minimize_to_tray(
    window: tauri::WebviewWindow,
) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}
