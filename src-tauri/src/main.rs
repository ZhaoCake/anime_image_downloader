#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use std::path::PathBuf;

#[tauri::command]
fn get_picture_dir(app: tauri::AppHandle) -> Option<String> {
    app.path().picture_dir().ok().map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn resolve_path(path: String, filename: String) -> String {
    let mut p = PathBuf::from(path);
    p.push(filename);
    p.to_string_lossy().to_string()
}

#[tauri::command]
fn get_dirname(path: String) -> Option<String> {
    PathBuf::from(path).parent().map(|p| p.to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![get_picture_dir, resolve_path, get_dirname])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
