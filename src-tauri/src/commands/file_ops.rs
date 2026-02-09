use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn save_file(
    app: tauri::AppHandle,
    data: String,
    default_name: String,
) -> Result<bool, String> {
    let path = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("JSON", &["json"])
        .blocking_save_file();

    match path {
        Some(file_path) => {
            let pb = PathBuf::from(file_path.to_string());
            std::fs::write(&pb, data.as_bytes())
                .map_err(|e| e.to_string())?;
            Ok(true)
        }
        None => Ok(false),
    }
}

#[tauri::command]
pub async fn open_file(
    app: tauri::AppHandle,
    extensions: Vec<String>,
) -> Result<Option<String>, String> {
    let ext_refs: Vec<&str> = extensions.iter().map(|s| s.as_str()).collect();

    let path = app
        .dialog()
        .file()
        .add_filter("Data Files", &ext_refs)
        .blocking_pick_file();

    match path {
        Some(file_path) => {
            let pb = PathBuf::from(file_path.to_string());
            let content = std::fs::read_to_string(&pb)
                .map_err(|e| e.to_string())?;
            Ok(Some(content))
        }
        None => Ok(None),
    }
}
