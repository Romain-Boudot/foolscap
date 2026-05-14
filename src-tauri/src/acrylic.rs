//! Persistent acrylic blur on Windows 10/11 via the undocumented
//! `SetWindowCompositionAttribute` API + `ACCENT_ENABLE_ACRYLICBLURBEHIND`.
//!
//! Why not `DwmSetWindowAttribute(DWMWA_SYSTEMBACKDROP_TYPE)` (the API
//! Tauri's `setEffects("acrylic")` uses under the hood)? Because the new
//! DWM material API auto-dims acrylic to solid the moment the window
//! loses focus — by design, no way to override. The old undocumented
//! accent policy used by Files Explorer, Spotify, Notepads & co. doesn't
//! have this behavior: the blur stays active whatever the focus state.
//!
//! `SetWindowCompositionAttribute` is undocumented and NOT exported in
//! `user32.lib`, so we can't link to it statically. We load `user32.dll`
//! at runtime via `GetModuleHandle` + `GetProcAddress` and transmute the
//! pointer to a typed function. No-op on non-Windows.

use tauri::{Runtime, WebviewWindow};

#[cfg(windows)]
#[repr(C)]
struct AccentPolicy {
    accent_state: u32,
    accent_flags: u32,
    /// ABGR (alpha-blue-green-red), little-endian packed in u32.
    gradient_color: u32,
    animation_id: u32,
}

#[cfg(windows)]
#[repr(C)]
struct WindowCompositionAttribData {
    attrib: u32,
    p_data: *mut std::ffi::c_void,
    cb_data: usize,
}

#[cfg(windows)]
const WCA_ACCENT_POLICY: u32 = 19;

#[cfg(windows)]
const ACCENT_DISABLED: u32 = 0;
#[cfg(windows)]
const ACCENT_ENABLE_ACRYLICBLURBEHIND: u32 = 4;

#[cfg(windows)]
type SetWindowCompositionAttributeFn = unsafe extern "system" fn(
    hwnd: windows::Win32::Foundation::HWND,
    data: *mut WindowCompositionAttribData,
) -> i32;

/// Look up the entry point in user32.dll. Returns None on the rare
/// platform where user32 isn't present (or the export was removed —
/// hasn't happened in 10+ years).
#[cfg(windows)]
fn lookup_swca() -> Option<SetWindowCompositionAttributeFn> {
    use windows::core::s;
    use windows::Win32::System::LibraryLoader::{
        GetModuleHandleW, GetProcAddress,
    };

    // SAFETY: user32 is loaded into every Windows GUI process; we don't
    // hold the HMODULE long-term and don't FreeLibrary it.
    unsafe {
        let module = GetModuleHandleW(windows::core::w!("user32.dll")).ok()?;
        let addr = GetProcAddress(module, s!("SetWindowCompositionAttribute"))?;
        Some(std::mem::transmute::<
            unsafe extern "system" fn() -> isize,
            SetWindowCompositionAttributeFn,
        >(addr))
    }
}

#[cfg(windows)]
fn apply_policy<R: Runtime>(window: &WebviewWindow<R>, policy: AccentPolicy) {
    use windows::Win32::Foundation::HWND;

    let Some(swca) = lookup_swca() else { return };
    let Ok(raw) = window.hwnd() else { return };
    let hwnd = HWND(raw.0 as _);
    let mut policy = policy;
    let mut data = WindowCompositionAttribData {
        attrib: WCA_ACCENT_POLICY,
        p_data: &mut policy as *mut _ as *mut std::ffi::c_void,
        cb_data: std::mem::size_of::<AccentPolicy>(),
    };
    // SAFETY: hwnd is owned by Tauri for the window's lifetime; policy
    // is a stack POD that lives for the duration of this synchronous
    // call. Return value (BOOL) is intentionally discarded.
    unsafe {
        let _ = swca(hwnd, &mut data as *mut _);
    }
}

/// Enable persistent acrylic blur with the given ABGR tint. Keep alpha
/// modest (~0x40–0x90) so the blurred desktop content shows through.
#[cfg(windows)]
pub fn enable<R: Runtime>(window: &WebviewWindow<R>, tint_abgr: u32) {
    apply_policy(
        window,
        AccentPolicy {
            accent_state: ACCENT_ENABLE_ACRYLICBLURBEHIND,
            accent_flags: 0,
            gradient_color: tint_abgr,
            animation_id: 0,
        },
    );
}

/// Clear any accent policy previously set on this window.
#[cfg(windows)]
pub fn disable<R: Runtime>(window: &WebviewWindow<R>) {
    apply_policy(
        window,
        AccentPolicy {
            accent_state: ACCENT_DISABLED,
            accent_flags: 0,
            gradient_color: 0,
            animation_id: 0,
        },
    );
}

#[cfg(not(windows))]
pub fn enable<R: Runtime>(_window: &WebviewWindow<R>, _tint_abgr: u32) {}

#[cfg(not(windows))]
pub fn disable<R: Runtime>(_window: &WebviewWindow<R>) {}
