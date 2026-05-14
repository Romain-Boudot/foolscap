//! Forces Windows 11's rounded corners on borderless windows.
//!
//! When `decorations: false` is set on a Tauri window, Windows treats the
//! native window shape as a plain rectangle. CSS `border-radius` on our
//! content gives us round corners visually for transparent windows, but the
//! moment DWM-composed materials (Acrylic / Mica) come into play, DWM
//! renders them into the OS window shape — i.e. square — which exposes the
//! corners. `DwmSetWindowAttribute` with `DWMWA_WINDOW_CORNER_PREFERENCE`
//! is the standard fix: it tells DWM the window itself should be rendered
//! with rounded corners, regardless of decorations.

use tauri::{Runtime, WebviewWindow};

#[cfg(windows)]
pub fn round_window_corners<R: Runtime>(window: &WebviewWindow<R>) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE,
        DWMWCP_ROUND, DWM_WINDOW_CORNER_PREFERENCE,
    };

    let Ok(raw) = window.hwnd() else {
        return;
    };
    let hwnd = HWND(raw.0 as _);
    let preference: DWM_WINDOW_CORNER_PREFERENCE = DWMWCP_ROUND;
    // SAFETY: HWND is owned by Tauri for the lifetime of the window;
    // we only pass a stack pointer to a small POD value. The Win32
    // attribute is idempotent and well-documented.
    unsafe {
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            &preference as *const _ as *const _,
            std::mem::size_of::<DWM_WINDOW_CORNER_PREFERENCE>() as u32,
        );
    }
}

#[cfg(not(windows))]
pub fn round_window_corners<R: Runtime>(_window: &WebviewWindow<R>) {
    // No-op on macOS / Linux. macOS rounds borderless windows natively
    // via the system; Linux compositors vary and we don't try to force.
}
