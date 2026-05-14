mod acrylic;
mod commands;
mod corners;
mod db;
mod hotkey;
mod state;
mod tray;
mod window;

use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(state::OpenedWindows::default())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            window::show_all_note(app).ok();
        }))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:foolscap.db", db::migrations())
                .build(),
        )
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed
                        && shortcut == &hotkey::default_shortcut()
                    {
                        window::toggle_all_note(app).ok();
                    }
                })
                .build(),
        )
        .setup(|app| {
            app.global_shortcut().register(hotkey::default_shortcut())?;
            // Main is always considered "opened" — closing it is hiding,
            // not removing from the toggle set.
            app.state::<state::OpenedWindows>()
                .0
                .lock()
                .unwrap()
                .insert("main".to_string());
            if let Some(w) = app.get_webview_window("main") {
                window::show_and_focus(&w)?;
            }
            // Force Win11 rounded corners on every statically declared
            // window. No-op on other platforms.
            let labels: Vec<&str> = ["main", "settings", "toast"]
                .into_iter()
                .chain(commands::NOTE_POOL.iter().copied())
                .collect();
            for label in labels {
                if let Some(w) = app.get_webview_window(label) {
                    corners::round_window_corners(&w);
                }
            }
            // Tray creation can interact poorly with WebView2 window init
            // on some Windows configs. Guard it so a tray failure never
            // aborts startup — the rest of the app still works without it.
            // The frontend's update_tray_pinned command no-ops if the
            // tray state was never managed.
            if let Err(e) = tray::setup(app.handle()) {
                eprintln!("[tray] setup failed, continuing without tray: {e}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::toggle_window,
            commands::hide_window,
            commands::set_always_on_top,
            commands::open_settings,
            commands::new_note_window,
            commands::update_tray_pinned,
            commands::enable_blur,
            commands::disable_blur,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
