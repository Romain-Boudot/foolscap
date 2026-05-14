use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut};

pub fn default_shortcut() -> Shortcut {
    // Alt+A — cross-platform; on macOS this is Option+A, same physical key.
    Shortcut::new(Some(Modifiers::ALT), Code::KeyA)
}
