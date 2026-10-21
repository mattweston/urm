// The webview runs the existing URM frontend. Add native commands or plugins
// only where the corresponding browser API cannot provide the capability.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running URM desktop");
}
