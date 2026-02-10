#[tauri::command]
pub async fn set_fullscreen(
    #[allow(unused_variables)] window: tauri::WebviewWindow,
    #[allow(unused_variables)] fullscreen: bool,
) -> Result<(), String> {
    #[cfg(desktop)]
    {
        window
            .set_fullscreen(fullscreen)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn minimize_to_tray(
    #[allow(unused_variables)] window: tauri::WebviewWindow,
) -> Result<(), String> {
    #[cfg(desktop)]
    {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
