use std::fs;
use std::path::PathBuf;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

#[cfg(target_os = "linux")]
use gtk::prelude::*;

// Helper to get the notes path in the user's config folder
fn get_notes_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    
    // Ensure the folder exists
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    
    path.push("notes.json");
    Ok(path)
}

// Helper to resolve paths like ~/Documents
fn resolve_path(path_str: &str) -> PathBuf {
    if path_str.starts_with("~/") || path_str == "~" {
        if let Some(home) = dirs::home_dir() {
            if path_str == "~" {
                return home;
            } else {
                return home.join(&path_str[2..]);
            }
        }
    }
    PathBuf::from(path_str)
}

fn sanitize_filename(name: &str) -> String {
    let sanitized: String = name.chars()
        .map(|c| if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    sanitized.trim().to_string()
}

fn html_to_plain_text(html: &str) -> String {
    let mut result = String::new();
    let mut in_tag = false;
    let mut tag_content = String::new();
    let mut chars = html.chars().peekable();
    
    while let Some(c) = chars.next() {
        if c == '<' {
            in_tag = true;
            tag_content.clear();
        } else if c == '>' {
            in_tag = false;
            let tag = tag_content.to_lowercase();
            if tag == "br" || tag == "br/" || tag == "div" || tag == "/div" || tag == "p" || tag == "/p" || tag == "li" || tag == "/li" || tag == "tr" || tag == "/tr" {
                result.push('\n');
            }
        } else if in_tag {
            tag_content.push(c);
        } else {
            result.push(c);
        }
    }
    
    let clean = result
        .replace("&nbsp;", " ")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
        .replace("\r", "");
        
    let mut final_res = String::new();
    let mut last_was_newline = false;
    for c in clean.chars() {
        if c == '\n' {
            if !last_was_newline {
                final_res.push(c);
                last_was_newline = true;
            }
        } else {
            final_res.push(c);
            last_was_newline = false;
        }
    }
    final_res.trim().to_string()
}

// Update note open status in notes.json
fn update_note_open_status(app_handle: &tauri::AppHandle, id: &str, is_open: bool) -> Result<(), String> {
    let path = get_notes_path(app_handle)?;
    if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        if let Ok(mut notes) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(arr) = notes.as_array_mut() {
                let mut updated = false;
                for note in arr {
                    if let Some(note_id) = note.get("id").and_then(|i| i.as_str()) {
                        if note_id == id {
                            note["isOpen"] = serde_json::Value::Bool(is_open);
                            updated = true;
                            break;
                        }
                    }
                }
                if updated {
                    let notes_json = serde_json::to_string(&notes).map_err(|e| e.to_string())?;
                    fs::write(&path, &notes_json).map_err(|e| e.to_string())?;
                    let _ = update_tray_menu(app_handle, &notes_json);
                    let _ = app_handle.emit("notes-changed", ());
                }
            }
        }
    }
    Ok(())
}

// Helper to get the settings path
fn get_settings_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    
    path.push("settings.json");
    Ok(path)
}

// Load notes from notes.json
#[tauri::command]
fn load_notes(app_handle: tauri::AppHandle) -> Result<String, String> {
    let path = get_notes_path(&app_handle)?;
    if !path.exists() {
        return Ok("[]".to_string());
    }
    fs::read_to_string(path).map_err(|e| e.to_string())
}

// Save notes to notes.json
#[tauri::command]
fn save_notes(app_handle: tauri::AppHandle, notes_json: String) -> Result<(), String> {
    let path = get_notes_path(&app_handle)?;
    fs::write(&path, &notes_json).map_err(|e| e.to_string())?;
    let _ = update_tray_menu(&app_handle, &notes_json);
    Ok(())
}

// Dynamically updates the system tray menu with lists of Pinned and Recent notes
fn update_tray_menu(app_handle: &tauri::AppHandle, notes_json: &str) -> Result<(), String> {
    let tray = match app_handle.tray_by_id("main_tray") {
        Some(t) => t,
        None => return Ok(()),
    };

    let notes: serde_json::Value = serde_json::from_str(notes_json)
        .map_err(|e| e.to_string())?;

    let notes_arr = match notes.as_array() {
        Some(arr) => arr,
        None => return Ok(()),
    };

    let mut pinned_notes = Vec::new();
    let mut recent_notes = Vec::new();

    for note in notes_arr {
        let id = note.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let title = note.get("title").and_then(|v| v.as_str()).unwrap_or("Untitled Note");
        let pinned = note.get("pinned").and_then(|v| v.as_bool()).unwrap_or(false);
        
        if !id.is_empty() {
            if pinned {
                pinned_notes.push((id.to_string(), title.to_string()));
            } else {
                recent_notes.push((id.to_string(), title.to_string()));
            }
        }
    }

    pinned_notes.reverse();
    recent_notes.reverse();
    if recent_notes.len() > 5 {
        recent_notes.truncate(5);
    }

    let create_note_i = MenuItemBuilder::with_id("create_note", "Create New Note").build(app_handle).map_err(|e| e.to_string())?;
    let show_notes_i = MenuItemBuilder::with_id("show_notes", "Show All Notes").build(app_handle).map_err(|e| e.to_string())?;
    let quit_i = MenuItemBuilder::with_id("quit", "Quit").build(app_handle).map_err(|e| e.to_string())?;

    let mut menu_builder = MenuBuilder::new(app_handle)
        .item(&create_note_i)
        .item(&show_notes_i);

    if !pinned_notes.is_empty() {
        menu_builder = menu_builder.separator();
        let pinned_header = MenuItemBuilder::with_id("pinned_header", "★ Pinned Notes:")
            .enabled(false)
            .build(app_handle)
            .map_err(|e| e.to_string())?;
        menu_builder = menu_builder.item(&pinned_header);
        
        for (id, title) in pinned_notes {
            let item = MenuItemBuilder::with_id(format!("open_note_{}", id), format!("  {}", title))
                .build(app_handle)
                .map_err(|e| e.to_string())?;
            menu_builder = menu_builder.item(&item);
        }
    }

    if !recent_notes.is_empty() {
        menu_builder = menu_builder.separator();
        let recent_header = MenuItemBuilder::with_id("recent_header", "↺ Recent Notes:")
            .enabled(false)
            .build(app_handle)
            .map_err(|e| e.to_string())?;
        menu_builder = menu_builder.item(&recent_header);
        
        for (id, title) in recent_notes {
            let item = MenuItemBuilder::with_id(format!("open_note_{}", id), format!("  {}", title))
                .build(app_handle)
                .map_err(|e| e.to_string())?;
            menu_builder = menu_builder.item(&item);
        }
    }

    let menu = menu_builder
        .separator()
        .item(&quit_i)
        .build()
        .map_err(|e| e.to_string())?;

    tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    Ok(())
}

// Load settings from settings.json
#[tauri::command]
fn load_settings(app_handle: tauri::AppHandle) -> Result<String, String> {
    let path = get_settings_path(&app_handle)?;
    if !path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(path).map_err(|e| e.to_string())
}

// Save settings to settings.json
#[tauri::command]
fn save_settings(app_handle: tauri::AppHandle, settings_json: String) -> Result<(), String> {
    let path = get_settings_path(&app_handle)?;
    fs::write(path, settings_json).map_err(|e| e.to_string())
}

// Sync notes to local folder
#[tauri::command]
fn sync_to_local_directory(dir_path: String, notes_json: String) -> Result<(), String> {
    if dir_path.trim().is_empty() {
        return Err("Directory path is empty".to_string());
    }
    
    let target_dir = resolve_path(&dir_path);
    if !target_dir.exists() {
        fs::create_dir_all(&target_dir).map_err(|e| format!("Failed to create sync directory: {}", e))?;
    }
    
    // Write master backup
    let backup_path = target_dir.join("carrotnotes_backup.json");
    fs::write(&backup_path, &notes_json).map_err(|e| format!("Failed to write master backup file: {}", e))?;
    
    // Parse notes and save plain text copies
    let notes_value: serde_json::Value = serde_json::from_str(&notes_json)
        .map_err(|e| format!("Failed to parse notes JSON: {}", e))?;
        
    if let Some(notes_arr) = notes_value.as_array() {
        for note in notes_arr {
            let id = note.get("id").and_then(|v| v.as_str()).unwrap_or("unknown");
            let title = note.get("title").and_then(|v| v.as_str()).unwrap_or("Untitled Note");
            let content = note.get("content").and_then(|v| v.as_str()).unwrap_or("");
            
            let sanitized_title = sanitize_filename(title);
            let filename = format!("{}_{}.txt", sanitized_title, id);
            let file_path = target_dir.join(filename);
            
            let plain_text = html_to_plain_text(content);
            fs::write(file_path, plain_text).map_err(|e| format!("Failed to write plain text note: {}", e))?;
        }
    }
    
    Ok(())
}

// Cross-platform Always on Top setter, with Linux Wayland GTK WindowTypeHint utility fix
#[tauri::command]
fn set_always_on_top(window: tauri::Window, always_on_top: bool) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        if let Ok(gtk_window) = window.gtk_window() {
            if always_on_top {
                // Set window hint to Utility so composite managers keep it floating above IDEs/browsers on Wayland
                gtk_window.set_type_hint(gtk::gdk::WindowTypeHint::Utility);
                gtk_window.set_keep_above(true);
            } else {
                gtk_window.set_type_hint(gtk::gdk::WindowTypeHint::Normal);
                gtk_window.set_keep_above(false);
            }
            gtk_window.present();
        }
    }

    // Call standard Tauri set_always_on_top as a fallback/cross-platform handler
    window.set_always_on_top(always_on_top).map_err(|e| e.to_string())?;
    Ok(())
}

// Spawns a new independent note window with specific position, size, and always-on-top state
#[tauri::command]
fn open_note_window(
    app_handle: tauri::AppHandle,
    id: String,
    x: Option<f64>,
    y: Option<f64>,
    width: Option<f64>,
    height: Option<f64>,
    pinned: Option<bool>,
) -> Result<(), String> {
    let label = format!("note_{}", id);

    // If the window already exists, focus it
    if let Some(win) = app_handle.get_webview_window(&label) {
        win.show().unwrap();
        win.set_focus().unwrap();
        return Ok(());
    }    // Default size for sticky note window
    let w = width.unwrap_or(280.0);
    let h = height.unwrap_or(300.0);

    let mut win_builder = tauri::WebviewWindowBuilder::new(
        &app_handle,
        &label,
        tauri::WebviewUrl::App(format!("note.html?id={}", id).into()),
    )
    .title("CarrotNote")
    .inner_size(w, h)
    .min_inner_size(180.0, 150.0)
    .decorations(true)
    .transparent(true)
    .resizable(true)
    .skip_taskbar(true);
    if let (Some(px), Some(py)) = (x, y) {
        win_builder = win_builder.position(px, py);
    }

    if let Some(p) = pinned {
        win_builder = win_builder.always_on_top(p);
    }

    let win = win_builder.build().map_err(|e| e.to_string())?;

    // Hook window destruction to update status in notes.json and notify dashboard
    let app_handle_clone = app_handle.clone();
    let id_clone = id.clone();
    win.on_window_event(move |event| {
        if let tauri::WindowEvent::Destroyed = event {
            let _ = update_note_open_status(&app_handle_clone, &id_clone, false);
        }
    });

    // Apply GTK settings on Linux to handle Wayland always-on-top and utility layout
    #[cfg(target_os = "linux")]
    {
        use gtk::prelude::*;
        if let Ok(gtk_window) = win.gtk_window() {
            gtk_window.set_type_hint(gtk::gdk::WindowTypeHint::Utility);
            if let Some(p) = pinned {
                gtk_window.set_keep_above(p);
            }
        }
    }

    Ok(())
}

// Closes an active note window programmatically
#[tauri::command]
fn close_note_window(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let label = format!("note_{}", id);
    if let Some(win) = app_handle.get_webview_window(&label) {
        win.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}


// Sync notes to cloud URL using HTTP POST
#[tauri::command]
async fn sync_notes_to_cloud(
    endpoint: String,
    token: String,
    notes_json: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let res = client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body(notes_json)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let body = res.text().await.map_err(|e| e.to_string())?;

    if status.is_success() {
        Ok(body)
    } else {
        Err(format!("Cloud sync failed (Status {}): {}", status, body))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // System Tray Setup (Initial fallback menu)
            let create_note_i = MenuItemBuilder::with_id("create_note", "Create New Note").build(app)?;
            let show_notes_i = MenuItemBuilder::with_id("show_notes", "Show All Notes").build(app)?;
            let quit_i = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&create_note_i)
                .item(&show_notes_i)
                .separator()
                .item(&quit_i)
                .build()?;

            let tray_icon_bytes = include_bytes!("../icons/tray-white.png");
            let tray_image = tauri::image::Image::from_bytes(tray_icon_bytes)
                .expect("Failed to load tray icon bytes");

            let _tray = TrayIconBuilder::with_id("main_tray")
                .icon(tray_image)
                .menu(&menu)
                .on_menu_event(move |app, event| {
                    let id = event.id();
                    if id == "quit" {
                        app.exit(0);
                    } else if id == "show_notes" {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    } else if id == "create_note" {
                        if let Some(window) = app.get_webview_window("main") {
                            // Non-intrusive creation: emit event in background, don't show dashboard!
                            window.emit("create-note", ()).unwrap();
                        }
                    } else if id.as_ref().starts_with("open_note_") {
                        let note_id = &id.as_ref()["open_note_".len()..];
                        let _ = open_note_window(app.clone(), note_id.to_string(), None, None, None, None, None);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button, .. } = event {
                        if button == tauri::tray::MouseButton::Left {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    window.hide().unwrap();
                                } else {
                                    window.show().unwrap();
                                    window.set_focus().unwrap();
                                }
                            }
                        }
                    }
                })
                .build(app)?;

            // Populate system tray menu dynamically on startup
            let initial_notes = match get_notes_path(app.handle()) {
                Ok(path) => {
                    if path.exists() {
                        fs::read_to_string(path).unwrap_or_else(|_| "[]".to_string())
                    } else {
                        "[]".to_string()
                    }
                }
                Err(_) => "[]".to_string(),
            };
            let _ = update_tray_menu(app.handle(), &initial_notes);

            // Prevent dashboard "main" window from destroying on close; hide instead
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        window_clone.hide().unwrap();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_notes,
            save_notes,
            load_settings,
            save_settings,
            set_always_on_top,
            open_note_window,
            close_note_window,
            sync_notes_to_cloud,
            sync_to_local_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
