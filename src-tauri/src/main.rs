#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Reserve the native storage directory for SQLite and managed assets.
            // WebView2 continues to own the legacy localStorage data.
            let storage_dir = app.path().app_local_data_dir()?.join("storage");
            std::fs::create_dir_all(storage_dir)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Failed to start NSP Portfolio Builder");
}
