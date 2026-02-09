pub mod file_ops;
pub mod notifications;
pub mod window;

#[tauri::command]
pub fn get_platform() -> String {
    std::env::consts::OS.to_string()
}
