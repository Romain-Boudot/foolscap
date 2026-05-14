use std::sync::Mutex;

use serde::Deserialize;
use tauri::{
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle, Emitter, Manager, Wry,
};

use crate::commands::NOTE_POOL;
use crate::state::OpenedWindows;

/// Holds the live tray icon so we can re-set its menu when the
/// frontend reports a new list of pinned notes.
pub struct TrayState {
    pub icon: Mutex<Option<TrayIcon>>,
}

#[derive(Deserialize, Clone, Debug)]
pub struct PinnedNote {
    pub id: String,
    pub title: String,
}

pub fn build_menu(
    app: &AppHandle,
    pinned: &[PinnedNote],
) -> tauri::Result<Menu<Wry>> {
    let menu = Menu::new(app)?;

    let new_note =
        MenuItem::with_id(app, "tray-new-note", "New note", true, None::<&str>)?;
    menu.append(&new_note)?;

    let settings =
        MenuItem::with_id(app, "tray-settings", "Settings…", true, None::<&str>)?;
    menu.append(&settings)?;

    menu.append(&PredefinedMenuItem::separator(app)?)?;

    if pinned.is_empty() {
        let empty = MenuItem::with_id(
            app,
            "tray-pinned-empty",
            "No pinned notes",
            false,
            None::<&str>,
        )?;
        menu.append(&empty)?;
    } else {
        let header = MenuItem::with_id(
            app,
            "tray-pinned-header",
            "Pinned",
            false,
            None::<&str>,
        )?;
        menu.append(&header)?;
        for note in pinned {
            let id_str = format!("tray-note:{}", note.id);
            let label = if note.title.is_empty() {
                "Untitled".to_string()
            } else {
                note.title.clone()
            };
            let item = MenuItem::with_id(app, id_str, &label, true, None::<&str>)?;
            menu.append(&item)?;
        }
    }

    menu.append(&PredefinedMenuItem::separator(app)?)?;

    let show =
        MenuItem::with_id(app, "tray-show", "Show", true, None::<&str>)?;
    menu.append(&show)?;

    menu.append(&PredefinedMenuItem::separator(app)?)?;

    let quit =
        MenuItem::with_id(app, "tray-quit", "Quit", true, None::<&str>)?;
    menu.append(&quit)?;

    Ok(menu)
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let menu = build_menu(app, &[])?;
    // Decode the PNG at compile time. `app.default_window_icon()` can be
    // `None` in dev mode on Windows (the .ico is only baked into the .exe
    // for release builds), so we don't rely on it.
    let icon = tauri::include_image!("icons/32x32.png");

    // NOTE: don't call `show_menu_on_left_click` here — on some Tauri 2.x
    // releases the method exists but its tray-icon backend panics during
    // build on Windows. Right-click is the standard Windows tray gesture
    // anyway, and we get left-click menu behavior for free on macOS.
    let tray = TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .tooltip("Foolscap")
        .menu(&menu)
        .on_menu_event(handle_menu)
        .build(app)?;

    app.manage(TrayState {
        icon: Mutex::new(Some(tray)),
    });
    Ok(())
}

pub fn rebuild_menu(
    app: &AppHandle,
    pinned: &[PinnedNote],
) -> tauri::Result<()> {
    // Tray setup may have failed or been disabled — silently no-op
    // instead of panicking when the frontend invokes us early.
    let Some(state) = app.try_state::<TrayState>() else {
        return Ok(());
    };
    let menu = build_menu(app, pinned)?;
    let guard = state
        .icon
        .lock()
        .map_err(|_| tauri::Error::AssetNotFound("tray lock".into()))?;
    if let Some(tray) = guard.as_ref() {
        tray.set_menu(Some(menu))?;
    }
    Ok(())
}

fn handle_menu(app: &AppHandle, event: MenuEvent) {
    let id = event.id.as_ref();
    match id {
        "tray-new-note" => {
            let _ = tray_new_note(app);
        }
        "tray-settings" => {
            let _ = tray_open_settings(app);
        }
        "tray-show" => {
            let _ = crate::window::show_all_note(app);
        }
        "tray-quit" => {
            app.exit(0);
        }
        other if other.starts_with("tray-note:") => {
            let note_id = other.trim_start_matches("tray-note:").to_string();
            app.emit("tray-switch-to-note", note_id).ok();
            if let Some(w) = app.get_webview_window("main") {
                w.show().ok();
                w.unminimize().ok();
                w.set_focus().ok();
            }
        }
        _ => {}
    }
}

fn tray_new_note(app: &AppHandle) -> Result<(), String> {
    for label in NOTE_POOL {
        let Some(w) = app.get_webview_window(label) else {
            continue;
        };
        if w.is_visible().unwrap_or(false) {
            continue;
        }
        w.show().map_err(|e| e.to_string())?;
        w.set_focus().ok();
        if let Ok(mut opened) = app.state::<OpenedWindows>().0.lock() {
            opened.insert((*label).to_string());
        }
        app.emit("new-note-please", *label).ok();
        return Ok(());
    }
    Err("all note windows already open".into())
}

fn tray_open_settings(app: &AppHandle) -> Result<(), String> {
    let Some(settings) = app.get_webview_window("settings") else {
        return Ok(());
    };
    settings.show().map_err(|e| e.to_string())?;
    settings.unminimize().ok();
    settings.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}
