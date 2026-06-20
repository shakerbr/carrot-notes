use serde::Deserialize;
use std::process::Command;
use std::thread;
use std::time::Duration;

use gdkx11::X11Window;
use gtk::prelude::*;

const CARROT_BUS: &str = "com.shakerbr.CarrotNotes.Windows";
const CARROT_PATH: &str = "/com/shakerbr/CarrotNotes/Windows";
const CARROT_IFACE: &str = "com.shakerbr.CarrotNotes.Windows";

const GNOME_WINDOWS_BUS: &str = "org.gnome.Shell";
const GNOME_WINDOWS_PATH: &str = "/org/gnome/Shell/Extensions/Windows";
const GNOME_WINDOWS_IFACE: &str = "org.gnome.Shell.Extensions.Windows";

/// Run the app through XWayland on Wayland sessions so always-on-top works without
/// a GNOME Shell extension. Must run before GTK/WebKit initializes (see main.rs).
pub fn configure_linux_windowing_backend() {
    if std::env::var("CARROTNOTES_NATIVE_WAYLAND").is_ok() {
        return;
    }

    if std::env::var("WAYLAND_DISPLAY").is_ok() || std::env::var("XDG_SESSION_TYPE")
        .map(|v| v.eq_ignore_ascii_case("wayland"))
        .unwrap_or(false)
    {
        // Tauri/GTK ignore keep_above on native Wayland; XWayland honors it.
        std::env::set_var("GDK_BACKEND", "x11");
        std::env::remove_var("WAYLAND_DISPLAY");
    }
}

pub fn using_native_wayland() -> bool {
    std::env::var("CARROTNOTES_NATIVE_WAYLAND").is_ok()
}

/// Prevent GNOME/Mutter from drawing a rectangular compositor shadow around
/// transparent undecorated windows (we draw our own CSS shadow on the card).
pub fn apply_linux_transparent_window_style(gtk_window: &gtk::ApplicationWindow) {
    if let Some(gdk_window) = gtk_window.window() {
        gdk_window.set_shadow_width(0, 0, 0, 0);

        if let Some(x11_window) = gdk_window.downcast_ref::<X11Window>() {
            let xid = format!("0x{:x}", x11_window.xid());
            // Tell Mutter not to reserve extra shadow margin around the window.
            let _ = Command::new("xprop")
                .args([
                    "-id",
                    &xid,
                    "-f",
                    "_GTK_FRAME_EXTENTS",
                    "32c",
                    "-set",
                    "_GTK_FRAME_EXTENTS",
                    "0, 0, 0, 0",
                ])
                .output();
        }
    }
}

pub fn schedule_linux_window_style_refresh(window: tauri::WebviewWindow) {
    std::thread::spawn(move || {
        thread::sleep(Duration::from_millis(200));
        if let Ok(gtk_window) = window.gtk_window() {
            apply_linux_transparent_window_style(&gtk_window);
        }
    });
}

#[derive(Debug, Deserialize)]
struct GnomeShellWindow {
    id: u32,
    title: Option<String>,
    wm_class: Option<String>,
    pid: Option<i32>,
}

fn parse_gdbus_json_payload(output: &str) -> Option<String> {
    let start = output.find('[')?;
    let end = output.rfind(']')?;
    Some(output[start..=end].to_string())
}

fn gdbus_call(args: &[&str]) -> Result<String, String> {
    let output = Command::new("gdbus")
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run gdbus: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(stderr.trim().to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

fn carrot_extension_available() -> bool {
    gdbus_call(&[
        "call",
        "--session",
        "--dest",
        CARROT_BUS,
        "--object-path",
        CARROT_PATH,
        "--method",
        &format!("{}.Ping", CARROT_IFACE),
    ])
    .map(|out| out.contains("true"))
    .unwrap_or(false)
}

fn carrot_make_above(note_id: &str, above: bool) -> Result<(), String> {
    let method = if above {
        format!("{}.MakeAbove", CARROT_IFACE)
    } else {
        format!("{}.UnmakeAbove", CARROT_IFACE)
    };

    gdbus_call(&[
        "call",
        "--session",
        "--dest",
        CARROT_BUS,
        "--object-path",
        CARROT_PATH,
        "--method",
        &method,
        note_id,
    ])?;
    Ok(())
}

fn gnome_window_calls_list() -> Result<Vec<GnomeShellWindow>, String> {
    let stdout = gdbus_call(&[
        "call",
        "--session",
        "--dest",
        GNOME_WINDOWS_BUS,
        "--object-path",
        GNOME_WINDOWS_PATH,
        "--method",
        &format!("{}.List", GNOME_WINDOWS_IFACE),
    ])?;

    let json = parse_gdbus_json_payload(&stdout)
        .ok_or_else(|| "Failed to parse Window Calls response".to_string())?;

    serde_json::from_str(&json).map_err(|e| format!("Failed to parse window list JSON: {}", e))
}

fn gnome_window_calls_make_above(window_id: u32, above: bool) -> Result<(), String> {
    let method = if above {
        format!("{}.MakeAbove", GNOME_WINDOWS_IFACE)
    } else {
        format!("{}.UnmakeAbove", GNOME_WINDOWS_IFACE)
    };

    gdbus_call(&[
        "call",
        "--session",
        "--dest",
        GNOME_WINDOWS_BUS,
        "--object-path",
        GNOME_WINDOWS_PATH,
        "--method",
        &method,
        &window_id.to_string(),
    ])?;
    Ok(())
}

fn find_window_id_via_window_calls(note_id: &str, fallback_title: &str) -> Option<u32> {
    let my_pid = std::process::id() as i32;
    let marker = format!("CarrotNote|{}", note_id);
    let windows = gnome_window_calls_list().ok()?;

    windows.into_iter().find_map(|window| {
        if window.pid != Some(my_pid) {
            return None;
        }
        let title = window.title.as_deref().unwrap_or("");
        if title == fallback_title || title.contains(&marker) {
            Some(window.id)
        } else {
            None
        }
    })
}

/// Optional fallback when the user explicitly opts into native Wayland
/// (`CARROTNOTES_NATIVE_WAYLAND=1`). Requires a GNOME Shell extension.
fn try_native_wayland_always_on_top(
    note_id: Option<&str>,
    fallback_title: &str,
    above: bool,
) {
    if !using_native_wayland() {
        return;
    }

    let Some(note_id) = note_id else {
        return;
    };

    for attempt in 0..5 {
        if carrot_extension_available() {
            if carrot_make_above(note_id, above).is_ok() {
                return;
            }
        } else if let Some(window_id) = find_window_id_via_window_calls(note_id, fallback_title) {
            if gnome_window_calls_make_above(window_id, above).is_ok() {
                return;
            }
        }

        if attempt + 1 < 5 {
            thread::sleep(Duration::from_millis(100));
        }
    }

    log::warn!(
        "Always-on-top via native Wayland needs the CarrotNotes shell extension or Window Calls. \
         Unset CARROTNOTES_NATIVE_WAYLAND for automatic XWayland mode."
    );
}

pub fn apply_linux_always_on_top(
    gtk_window: Option<gtk::ApplicationWindow>,
    always_on_top: bool,
    note_id: Option<&str>,
    fallback_title: &str,
) {
    if let Some(gtk_window) = &gtk_window {
        apply_linux_transparent_window_style(gtk_window);
        if always_on_top {
            gtk_window.set_type_hint(gtk::gdk::WindowTypeHint::Utility);
        } else {
            gtk_window.set_type_hint(gtk::gdk::WindowTypeHint::Normal);
        }
        gtk_window.set_keep_above(always_on_top);
        gtk_window.present();
    }

    try_native_wayland_always_on_top(note_id, fallback_title, always_on_top);
}

pub fn schedule_always_on_top_refresh(
    window: tauri::WebviewWindow,
    always_on_top: bool,
    note_id: Option<String>,
) {
    if !always_on_top {
        return;
    }

    std::thread::spawn(move || {
        thread::sleep(Duration::from_millis(250));
        let _ = window.set_always_on_top(true);
        if let Ok(gtk_window) = window.gtk_window() {
            apply_linux_transparent_window_style(&gtk_window);
            gtk_window.set_keep_above(true);
            gtk_window.present();
        }
        if using_native_wayland() {
            let title = window.title().unwrap_or_default();
            try_native_wayland_always_on_top(note_id.as_deref(), &title, true);
        }
    });
}
