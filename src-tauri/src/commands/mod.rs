use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

use crate::state::OpenedWindows;
use crate::tray::{rebuild_menu, PinnedNote};

pub const NOTE_POOL: &[&str] = &[
    "note-1", "note-2", "note-3", "note-4", "note-5", "note-6", "note-7",
    "note-8", "note-9", "note-10",
];

#[tauri::command]
pub fn toggle_window(app: AppHandle) -> Result<(), String> {
    crate::window::toggle_all_note(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hide_window(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())?;
    let label = window.label();
    // Closing a pool note window via × means "I'm done with it" — remove
    // from the toggle set so Alt+A doesn't bring it back. Main stays.
    if label != "main" && label != "settings" {
        if let Ok(mut opened) = app.state::<OpenedWindows>().0.lock() {
            opened.remove(label);
        }
    }
    Ok(())
}

#[tauri::command]
pub fn set_always_on_top(
    app: AppHandle,
    on: bool,
    label: Option<String>,
) -> Result<(), String> {
    let target = label.as_deref().unwrap_or("main");
    if let Some(w) = app.get_webview_window(target) {
        w.set_always_on_top(on).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn open_settings(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    let target_monitor = window.current_monitor().ok().flatten();
    let Some(settings) = app.get_webview_window("settings") else {
        return Ok(());
    };
    if let Some(target) = &target_monitor {
        crate::window::move_window_to_monitor(&settings, target).ok();
    }
    settings.show().map_err(|e| e.to_string())?;
    settings.unminimize().ok();
    settings.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_tray_pinned(
    app: AppHandle,
    pinned: Vec<PinnedNote>,
) -> Result<(), String> {
    rebuild_menu(&app, &pinned).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn enable_blur(
    window: WebviewWindow,
    a: u8,
    b: u8,
    g: u8,
    r: u8,
) -> Result<(), String> {
    let tint_abgr =
        (a as u32) << 24 | (b as u32) << 16 | (g as u32) << 8 | (r as u32);
    crate::acrylic::enable(&window, tint_abgr);
    Ok(())
}

#[tauri::command]
pub fn disable_blur(window: WebviewWindow) -> Result<(), String> {
    crate::acrylic::disable(&window);
    Ok(())
}

#[tauri::command]
pub fn new_note_window(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    let source_monitor = window.current_monitor().ok().flatten();
    for label in NOTE_POOL {
        let Some(w) = app.get_webview_window(label) else { continue };
        if w.is_visible().unwrap_or(false) {
            continue;
        }
        if let Some(target) = &source_monitor {
            crate::window::move_window_to_monitor(&w, target).ok();
        }
        w.show().map_err(|e| e.to_string())?;
        w.set_focus().ok();
        if let Ok(mut opened) = app.state::<OpenedWindows>().0.lock() {
            opened.insert((*label).to_string());
        }
        // Tell the target window's frontend to spawn a fresh note. We pass
        // the target label as payload so each window can filter — the JS
        // `listen()` API doesn't filter by target by default.
        app.emit("new-note-please", *label).ok();
        return Ok(());
    }
    Err("all note windows already open".into())
}
