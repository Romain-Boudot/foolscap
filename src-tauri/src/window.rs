use tauri::{AppHandle, Manager, Monitor, PhysicalPosition, Runtime, WebviewWindow};

use crate::state::OpenedWindows;

pub fn show_and_focus<R: Runtime>(w: &WebviewWindow<R>) -> tauri::Result<()> {
    if !w.is_visible()? {
        w.show()?;
    }
    w.unminimize().ok();
    w.set_focus()?;
    Ok(())
}

/// Center `w` on `target` monitor, unless it's already there (preserves
/// a user-dragged position when no monitor change is needed).
pub fn move_window_to_monitor<R: Runtime>(
    w: &WebviewWindow<R>,
    target: &Monitor,
) -> tauri::Result<()> {
    if let Some(current) = w.current_monitor()? {
        if current.position() == target.position() && current.size() == target.size() {
            return Ok(());
        }
    }
    let mon_pos = target.position();
    let mon_size = target.size();
    let win_size = w.outer_size()?;
    let x = mon_pos.x + (mon_size.width as i32 - win_size.width as i32) / 2;
    let y = mon_pos.y + (mon_size.height as i32 - win_size.height as i32) / 2;
    w.set_position(PhysicalPosition::new(x, y))?;
    Ok(())
}

pub fn move_to_cursor_monitor<R: Runtime>(
    app: &AppHandle<R>,
    w: &WebviewWindow<R>,
) -> tauri::Result<()> {
    let cursor = app.cursor_position()?;
    let Some(target) = app.monitor_from_point(cursor.x, cursor.y)? else {
        return Ok(());
    };
    move_window_to_monitor(w, &target)
}

fn opened_labels<R: Runtime>(app: &AppHandle<R>) -> Vec<String> {
    app.state::<OpenedWindows>()
        .0
        .lock()
        .map(|guard| guard.iter().cloned().collect())
        .unwrap_or_default()
}

fn opened_windows<R: Runtime>(app: &AppHandle<R>) -> Vec<WebviewWindow<R>> {
    opened_labels(app)
        .into_iter()
        .filter_map(|label| app.get_webview_window(&label))
        .collect()
}

pub fn show_all_note<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let windows = opened_windows(app);
    if windows.is_empty() {
        return Ok(());
    }
    for w in &windows {
        show_and_focus(w).ok();
    }
    if let Some(main) = app.get_webview_window("main") {
        move_to_cursor_monitor(app, &main).ok();
        main.set_focus().ok();
    }
    Ok(())
}

pub fn toggle_all_note<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let windows = opened_windows(app);
    if windows.is_empty() {
        return Ok(());
    }
    let any_visible = windows.iter().any(|w| w.is_visible().unwrap_or(false));
    if any_visible {
        for w in &windows {
            w.hide()?;
        }
    } else {
        for w in &windows {
            show_and_focus(w).ok();
        }
        if let Some(main) = app.get_webview_window("main") {
            move_to_cursor_monitor(app, &main).ok();
            main.set_focus().ok();
        }
    }
    Ok(())
}
