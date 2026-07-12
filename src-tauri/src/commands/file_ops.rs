use std::path::{Path, PathBuf};
use tauri_plugin_dialog::DialogExt;

fn write_file(path: &Path, data: &str) -> Result<(), String> {
    std::fs::write(path, data.as_bytes()).map_err(|error| error.to_string())
}

fn read_file(path: &Path) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|error| error.to_string())
}

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
            write_file(&pb, &data)?;
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
            let content = read_file(&pb)?;
            Ok(Some(content))
        }
        None => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::{read_file, write_file};
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::sync::atomic::{AtomicU64, Ordering};

    static NEXT_TEST_DIRECTORY: AtomicU64 = AtomicU64::new(0);

    struct TestDirectory {
        path: PathBuf,
    }

    impl TestDirectory {
        fn new() -> Self {
            let sequence = NEXT_TEST_DIRECTORY.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!(
                "momentum-rust-tests-{}-{sequence}",
                std::process::id()
            ));
            fs::create_dir_all(&path).expect("test directory should be created");
            Self { path }
        }

        fn path(&self) -> &Path {
            &self.path
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    #[test]
    fn write_file_creates_a_file_with_the_requested_contents() {
        let directory = TestDirectory::new();
        let path = directory.path().join("momentum.json");

        write_file(&path, r#"{"task":"专注"}"#).expect("write should succeed");

        assert_eq!(
            fs::read_to_string(path).expect("written file should be readable"),
            r#"{"task":"专注"}"#
        );
    }

    #[test]
    fn write_file_truncates_existing_contents() {
        let directory = TestDirectory::new();
        let path = directory.path().join("momentum.json");
        fs::write(&path, "a much longer previous value").expect("fixture should be written");

        write_file(&path, "new").expect("overwrite should succeed");

        assert_eq!(
            fs::read_to_string(path).expect("overwritten file should be readable"),
            "new"
        );
    }

    #[test]
    fn write_file_returns_an_error_when_the_parent_does_not_exist() {
        let directory = TestDirectory::new();
        let path = directory.path().join("missing").join("momentum.json");

        let result = write_file(&path, "data");

        assert!(result.is_err());
        assert!(!path.exists());
    }

    #[test]
    fn read_file_returns_unicode_contents() {
        let directory = TestDirectory::new();
        let path = directory.path().join("momentum.json");
        fs::write(&path, "专注，然后休息。\n").expect("fixture should be written");

        let content = read_file(&path).expect("read should succeed");

        assert_eq!(content, "专注，然后休息。\n");
    }

    #[test]
    fn read_file_returns_an_error_for_a_missing_file() {
        let directory = TestDirectory::new();
        let path = directory.path().join("missing.json");

        assert!(read_file(&path).is_err());
    }

    #[test]
    fn read_file_rejects_non_utf8_data() {
        let directory = TestDirectory::new();
        let path = directory.path().join("invalid.json");
        fs::write(&path, [0xff, 0xfe, 0xfd]).expect("fixture should be written");

        assert!(read_file(&path).is_err());
    }
}
