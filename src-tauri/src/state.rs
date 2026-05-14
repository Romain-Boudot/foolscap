use std::collections::HashSet;
use std::sync::Mutex;

/// Labels of note-type windows the user explicitly wants open. Alt+A toggles
/// only this set, so a window closed with X stays closed across Alt+A cycles.
/// `main` is always in the set (closing it is just hiding).
#[derive(Default)]
pub struct OpenedWindows(pub Mutex<HashSet<String>>);
