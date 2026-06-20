use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

#[cfg(target_os = "linux")]
pub mod linux_windowing;

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

const BACKUP_FILENAME: &str = "carrotnotes_backup.json";
const DELETED_SUBDIR: &str = "deleted";

fn note_md_filename(title: &str, id: &str) -> String {
    format!("{}_{}.md", sanitize_filename(title), id)
}

fn extract_note_id_from_md_filename(filename: &str) -> Option<String> {
    if !filename.ends_with(".md") {
        return None;
    }
    let base = &filename[..filename.len() - 3];
    base.rfind("_note_")
        .map(|idx| base[idx + 1..].to_string())
}

fn parse_notes_array(notes_json: &str) -> Result<Vec<serde_json::Value>, String> {
    let value: serde_json::Value = serde_json::from_str(notes_json)
        .map_err(|e| format!("Failed to parse notes JSON: {}", e))?;
    value
        .as_array()
        .cloned()
        .ok_or_else(|| "Notes JSON is not an array".to_string())
}

fn load_backup_notes(backup_path: &Path) -> Result<Vec<serde_json::Value>, String> {
    if !backup_path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(backup_path)
        .map_err(|e| format!("Failed to read sync backup: {}", e))?;
    parse_notes_array(&content)
}

fn find_md_for_id(target_dir: &Path, id: &str) -> Option<PathBuf> {
    let entries = fs::read_dir(target_dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let name = path.file_name()?.to_str()?;
        if extract_note_id_from_md_filename(name).as_deref() == Some(id) {
            return Some(path);
        }
    }
    None
}

fn title_from_md_filename(filename: &str) -> String {
    let base = filename.strip_suffix(".md").unwrap_or(filename);
    if let Some(idx) = base.rfind("_note_") {
        let title = base[..idx].replace('_', " ");
        if title.trim().is_empty() {
            "Untitled Note".to_string()
        } else {
            title
        }
    } else {
        "Untitled Note".to_string()
    }
}

fn build_minimal_note_from_md(path: &Path, id: &str) -> Option<serde_json::Value> {
    let content = fs::read_to_string(path).ok()?;
    let filename = path.file_name()?.to_str()?;
    Some(serde_json::json!({
        "id": id,
        "title": title_from_md_filename(filename),
        "content": content,
        "isTemporary": false,
        "isOpen": false
    }))
}

fn archive_note_to_deleted(
    target_dir: &Path,
    note: &serde_json::Value,
    root_md: Option<&Path>,
) -> Result<(), String> {
    let deleted_dir = target_dir.join(DELETED_SUBDIR);
    fs::create_dir_all(&deleted_dir)
        .map_err(|e| format!("Failed to create deleted directory: {}", e))?;

    let id = note
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    let json_path = deleted_dir.join(format!("{}.json", id));
    fs::write(
        &json_path,
        serde_json::to_string_pretty(note).map_err(|e| e.to_string())?,
    )
    .map_err(|e| format!("Failed to write deleted note metadata: {}", e))?;

    if let Some(md_path) = root_md {
        if md_path.exists() {
            let file_name = md_path
                .file_name()
                .ok_or_else(|| "Invalid markdown path".to_string())?;
            let dest = deleted_dir.join(file_name);
            if dest.exists() {
                fs::remove_file(&dest).ok();
            }
            if fs::rename(md_path, &dest).is_err() {
                fs::copy(md_path, &dest)
                    .and_then(|_| fs::remove_file(md_path))
                    .map_err(|e| format!("Failed to move note markdown to deleted: {}", e))?;
            }
        }
    }

    Ok(())
}

fn remove_root_md_files_for_id(target_dir: &Path, id: &str) -> Result<(), String> {
    let entries = match fs::read_dir(target_dir) {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if extract_note_id_from_md_filename(name).as_deref() == Some(id) {
            fs::remove_file(&path).ok();
        }
    }

    Ok(())
}

fn archive_removed_notes(
    target_dir: &Path,
    old_backup_notes: &[serde_json::Value],
    active_ids: &HashSet<String>,
) -> Result<(), String> {
    for old_note in old_backup_notes {
        let Some(id) = old_note.get("id").and_then(|v| v.as_str()) else {
            continue;
        };
        if active_ids.contains(id) {
            continue;
        }
        let md_path = find_md_for_id(target_dir, id);
        archive_note_to_deleted(target_dir, old_note, md_path.as_deref())?;
    }
    Ok(())
}

fn archive_orphan_markdown_files(
    target_dir: &Path,
    active_ids: &HashSet<String>,
    old_backup_notes: &[serde_json::Value],
) -> Result<(), String> {
    let entries = match fs::read_dir(target_dir) {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if name == BACKUP_FILENAME || !name.ends_with(".md") {
            continue;
        }
        let Some(id) = extract_note_id_from_md_filename(name) else {
            continue;
        };
        if active_ids.contains(&id) {
            continue;
        }

        let note = old_backup_notes
            .iter()
            .find(|note| note.get("id").and_then(|v| v.as_str()) == Some(id.as_str()))
            .cloned()
            .or_else(|| build_minimal_note_from_md(&path, &id));

        if let Some(note) = note {
            archive_note_to_deleted(target_dir, &note, Some(&path))?;
        }
    }

    Ok(())
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

fn notes_json_for_sync(notes_json: &str) -> Result<String, String> {
    let notes_arr = parse_notes_array(notes_json)?;
    let filtered: Vec<_> = notes_arr
        .into_iter()
        .filter(|note| {
            !note
                .get("isTemporary")
                .and_then(|v| v.as_bool())
                .unwrap_or(false)
        })
        .collect();

    serde_json::to_string(&filtered).map_err(|e| format!("Failed to serialize notes JSON: {}", e))
}

// Sync notes to local folder (temporary notes are excluded; deleted notes move to deleted/)
#[tauri::command]
fn sync_to_local_directory(dir_path: String, notes_json: String) -> Result<(), String> {
    if dir_path.trim().is_empty() {
        return Err("Directory path is empty".to_string());
    }

    let notes_json = notes_json_for_sync(&notes_json)?;
    let new_notes = parse_notes_array(&notes_json)?;

    let target_dir = resolve_path(&dir_path);
    if !target_dir.exists() {
        fs::create_dir_all(&target_dir).map_err(|e| format!("Failed to create sync directory: {}", e))?;
    }

    let backup_path = target_dir.join(BACKUP_FILENAME);
    let old_backup_notes = load_backup_notes(&backup_path)?;

    let active_ids: HashSet<String> = new_notes
        .iter()
        .filter_map(|note| note.get("id").and_then(|v| v.as_str()).map(String::from))
        .collect();

    archive_removed_notes(&target_dir, &old_backup_notes, &active_ids)?;
    archive_orphan_markdown_files(&target_dir, &active_ids, &old_backup_notes)?;

    fs::write(&backup_path, &notes_json)
        .map_err(|e| format!("Failed to write master backup file: {}", e))?;

    for note in &new_notes {
        let id = note.get("id").and_then(|v| v.as_str()).unwrap_or("unknown");
        let title = note
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("Untitled Note");
        let content = note.get("content").and_then(|v| v.as_str()).unwrap_or("");

        let filename = note_md_filename(title, id);
        let file_path = target_dir.join(&filename);
        remove_root_md_files_for_id(&target_dir, id)?;
        fs::write(file_path, content)
            .map_err(|e| format!("Failed to write markdown note: {}", e))?;
    }

    Ok(())
}

fn prepare_restored_note(mut note: serde_json::Value) -> Result<String, String> {
    if let Some(obj) = note.as_object_mut() {
        obj.insert("isOpen".to_string(), serde_json::Value::Bool(false));
        if !obj.contains_key("isTemporary") {
            obj.insert("isTemporary".to_string(), serde_json::Value::Bool(false));
        }
    }
    serde_json::to_string(&note).map_err(|e| e.to_string())
}

fn collect_restorable_notes(
    current_notes_json: &str,
    backup_notes: &[serde_json::Value],
    deleted_dir: Option<&Path>,
) -> Result<Vec<serde_json::Value>, String> {
    let current_notes = parse_notes_array(current_notes_json).unwrap_or_default();
    let current_by_id: HashMap<String, &serde_json::Value> = current_notes
        .iter()
        .filter_map(|note| {
            note.get("id")
                .and_then(|v| v.as_str())
                .map(|id| (id.to_string(), note))
        })
        .collect();

    let mut results: Vec<serde_json::Value> = Vec::new();
    let mut seen_ids: HashSet<String> = HashSet::new();

    for sync_note in backup_notes {
        let Some(id) = sync_note.get("id").and_then(|v| v.as_str()) else {
            continue;
        };
        if id.is_empty() {
            continue;
        }

        let sync_title = sync_note
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("Untitled Note");
        let sync_content = sync_note
            .get("content")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        if let Some(current) = current_by_id.get(id) {
            let current_title = current
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let current_content = current
                .get("content")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if sync_title != current_title || sync_content != current_content {
                results.push(serde_json::json!({
                    "id": id,
                    "title": sync_title,
                    "source": "sync",
                    "reason": "modified_locally"
                }));
                seen_ids.insert(id.to_string());
            }
        } else {
            results.push(serde_json::json!({
                "id": id,
                "title": sync_title,
                "source": "sync",
                "reason": "deleted_locally"
            }));
            seen_ids.insert(id.to_string());
        }
    }

    if let Some(deleted_dir) = deleted_dir {
        if deleted_dir.exists() {
            for entry in fs::read_dir(deleted_dir).map_err(|e| e.to_string())? {
                let path = entry.map_err(|e| e.to_string())?.path();
                if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
                    continue;
                }
                let Some(id) = path.file_stem().and_then(|stem| stem.to_str()) else {
                    continue;
                };
                if seen_ids.contains(id) || current_by_id.contains_key(id) {
                    continue;
                }

                let note: serde_json::Value = serde_json::from_str(
                    &fs::read_to_string(&path).map_err(|e| e.to_string())?,
                )
                .map_err(|e| format!("Failed to parse deleted note metadata: {}", e))?;

                results.push(serde_json::json!({
                    "id": id,
                    "title": note.get("title").and_then(|v| v.as_str()).unwrap_or("Untitled Note"),
                    "source": "deleted",
                    "reason": "archived"
                }));
                seen_ids.insert(id.to_string());
            }
        }
    }

    Ok(results)
}

#[tauri::command]
fn list_restorable_sync_notes(dir_path: String, current_notes_json: String) -> Result<String, String> {
    let target_dir = resolve_path(&dir_path);
    if !target_dir.exists() {
        return Ok("[]".to_string());
    }

    let backup_path = target_dir.join(BACKUP_FILENAME);
    let backup_notes = load_backup_notes(&backup_path)?;
    let deleted_dir = target_dir.join(DELETED_SUBDIR);
    let results = collect_restorable_notes(&current_notes_json, &backup_notes, Some(&deleted_dir))?;
    serde_json::to_string(&results).map_err(|e| e.to_string())
}

async fn fetch_cloud_sync_notes(endpoint: String, token: String) -> Result<Vec<serde_json::Value>, String> {
    if endpoint.trim().is_empty() {
        return Err("Cloud endpoint URL is empty".to_string());
    }

    let client = reqwest::Client::new();
    let mut request = client.get(&endpoint).header("Accept", "application/json");
    if !token.trim().is_empty() {
        request = request.header("Authorization", format!("Bearer {}", token));
    }

    let res = request.send().await.map_err(|e| e.to_string())?;
    let status = res.status();
    let body = res.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("Cloud fetch failed (Status {}): {}", status, body));
    }

    parse_notes_array(&body)
}

#[tauri::command]
async fn list_restorable_cloud_notes(
    endpoint: String,
    token: String,
    current_notes_json: String,
) -> Result<String, String> {
    let backup_notes = fetch_cloud_sync_notes(endpoint, token).await?;
    let results = collect_restorable_notes(&current_notes_json, &backup_notes, None)?;
    serde_json::to_string(&results).map_err(|e| e.to_string())
}

#[tauri::command]
fn restore_note_from_sync(dir_path: String, note_id: String, source: String) -> Result<String, String> {
    let target_dir = resolve_path(&dir_path);
    let mut note = match source.as_str() {
        "deleted" => {
            let json_path = target_dir
                .join(DELETED_SUBDIR)
                .join(format!("{}.json", note_id));
            if !json_path.exists() {
                return Err(format!("Deleted note {} was not found in sync folder", note_id));
            }
            serde_json::from_str(
                &fs::read_to_string(&json_path).map_err(|e| e.to_string())?,
            )
            .map_err(|e| format!("Failed to parse deleted note metadata: {}", e))?
        }
        _ => {
            let backup_path = target_dir.join(BACKUP_FILENAME);
            load_backup_notes(&backup_path)?
                .into_iter()
                .find(|note| note.get("id").and_then(|v| v.as_str()) == Some(note_id.as_str()))
                .ok_or_else(|| format!("Note {} was not found in sync backup", note_id))?
        }
    };

    if source == "deleted" {
        if let Some(md_path) = find_md_for_id(&target_dir.join(DELETED_SUBDIR), &note_id) {
            if let Ok(content) = fs::read_to_string(&md_path) {
                if let Some(obj) = note.as_object_mut() {
                    obj.insert("content".to_string(), serde_json::Value::String(content));
                }
            }
        }
    }

    prepare_restored_note(note)
}

#[tauri::command]
async fn restore_note_from_cloud(
    endpoint: String,
    token: String,
    note_id: String,
) -> Result<String, String> {
    let backup_notes = fetch_cloud_sync_notes(endpoint, token).await?;
    let note = backup_notes
        .into_iter()
        .find(|note| note.get("id").and_then(|v| v.as_str()) == Some(note_id.as_str()))
        .ok_or_else(|| format!("Note {} was not found in cloud sync backup", note_id))?;

    prepare_restored_note(note)
}

fn clear_directory_contents(dir: &Path) -> Result<usize, String> {
    if !dir.exists() {
        return Ok(0);
    }

    let mut removed = 0usize;
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.is_dir() {
            fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
        } else {
            fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
        removed += 1;
    }

    Ok(removed)
}

#[tauri::command]
fn clean_local_sync_trash(dir_path: String) -> Result<String, String> {
    if dir_path.trim().is_empty() {
        return Err("Directory path is empty".to_string());
    }

    let target_dir = resolve_path(&dir_path);
    let deleted_dir = target_dir.join(DELETED_SUBDIR);
    let removed = clear_directory_contents(&deleted_dir)?;

    Ok(format!(
        "Removed {} item(s) from local deleted folder",
        removed
    ))
}

#[tauri::command]
fn remove_all_local_sync(dir_path: String) -> Result<String, String> {
    if dir_path.trim().is_empty() {
        return Err("Directory path is empty".to_string());
    }

    let target_dir = resolve_path(&dir_path);
    if !target_dir.exists() {
        return Ok("Local sync folder is already empty".to_string());
    }

    let mut removed = 0usize;

    let backup_path = target_dir.join(BACKUP_FILENAME);
    if backup_path.exists() {
        fs::remove_file(&backup_path).map_err(|e| e.to_string())?;
        removed += 1;
    }

    if let Ok(entries) = fs::read_dir(&target_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if path.extension().and_then(|ext| ext.to_str()) == Some("md") {
                    fs::remove_file(&path).map_err(|e| e.to_string())?;
                    removed += 1;
                }
            }
        }
    }

    let deleted_dir = target_dir.join(DELETED_SUBDIR);
    if deleted_dir.exists() {
        removed += clear_directory_contents(&deleted_dir)?;
        fs::remove_dir(&deleted_dir).ok();
    }

    Ok(format!("Removed all local sync content ({} items)", removed))
}

fn cloud_deleted_endpoint(endpoint: &str) -> String {
    endpoint.trim_end_matches('/').to_string() + "/deleted"
}

fn apply_cloud_auth(
    request: reqwest::RequestBuilder,
    token: &str,
) -> reqwest::RequestBuilder {
    if token.trim().is_empty() {
        request
    } else {
        request.header("Authorization", format!("Bearer {}", token))
    }
}

#[tauri::command]
async fn clean_cloud_sync_trash(endpoint: String, token: String) -> Result<String, String> {
    if endpoint.trim().is_empty() {
        return Err("Cloud endpoint URL is empty".to_string());
    }

    let delete_url = cloud_deleted_endpoint(&endpoint);
    let client = reqwest::Client::new();
    let request = apply_cloud_auth(client.delete(&delete_url), &token);
    let res = request.send().await.map_err(|e| e.to_string())?;

    let status = res.status();
    let body = res.text().await.unwrap_or_default();

    if status.is_success() {
        Ok("Cloud deleted folder cleaned".to_string())
    } else {
        Err(format!(
            "Cloud trash cleanup failed (Status {}): {}",
            status, body
        ))
    }
}

#[tauri::command]
async fn remove_all_cloud_sync(endpoint: String, token: String) -> Result<String, String> {
    sync_notes_to_cloud(endpoint, token, "[]".to_string()).await?;
    Ok("All notes removed from cloud sync".to_string())
}

// Cross-platform Always on Top setter
#[cfg(target_os = "linux")]
fn apply_always_on_top(
    window: &tauri::WebviewWindow,
    always_on_top: bool,
    note_id: Option<&str>,
) -> Result<(), String> {
    window
        .set_always_on_top(always_on_top)
        .map_err(|e| e.to_string())?;

    let gtk_window = window.gtk_window().ok();
    let title = window.title().unwrap_or_default();
    linux_windowing::apply_linux_always_on_top(
        gtk_window,
        always_on_top,
        note_id,
        &title,
    );

    if always_on_top {
        linux_windowing::schedule_always_on_top_refresh(
            window.clone(),
            true,
            note_id.map(String::from),
        );
    }

    Ok(())
}

#[cfg(not(target_os = "linux"))]
fn apply_always_on_top(
    window: &tauri::WebviewWindow,
    always_on_top: bool,
    _note_id: Option<&str>,
) -> Result<(), String> {
    window
        .set_always_on_top(always_on_top)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_always_on_top(
    window: tauri::WebviewWindow,
    always_on_top: bool,
    note_id: Option<String>,
) -> Result<(), String> {
    apply_always_on_top(&window, always_on_top, note_id.as_deref())
}

const NOTE_MIN_WIDTH: f64 = 240.0;
const NOTE_MIN_HEIGHT: f64 = 280.0;

fn note_min_size() -> tauri::Size {
    tauri::Size::Logical(tauri::LogicalSize::new(NOTE_MIN_WIDTH, NOTE_MIN_HEIGHT))
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
    always_on_top: Option<bool>,
) -> Result<(), String> {
    let label = format!("note_{}", id);

    // If the window already exists, focus it and re-apply always-on-top if needed
    if let Some(win) = app_handle.get_webview_window(&label) {
        win.set_min_size(Some(note_min_size())).map_err(|e| e.to_string())?;
        if let Some(aot) = always_on_top {
            apply_always_on_top(&win, aot, Some(&id))?;
        }
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let w = width.unwrap_or(280.0).max(NOTE_MIN_WIDTH);
    let h = height.unwrap_or(300.0).max(NOTE_MIN_HEIGHT);
    let window_title = format!("CarrotNote|{}", id);

    let mut win_builder = tauri::WebviewWindowBuilder::new(
        &app_handle,
        &label,
        tauri::WebviewUrl::App(format!("note.html?id={}", id).into()),
    )
    .title(&window_title)
    .inner_size(w, h)
    .min_inner_size(NOTE_MIN_WIDTH, NOTE_MIN_HEIGHT)
    .decorations(false)
    .transparent(true)
    .resizable(true)
    .skip_taskbar(true);
    if let (Some(px), Some(py)) = (x, y) {
        win_builder = win_builder.position(px, py);
    }

    if let Some(aot) = always_on_top {
        win_builder = win_builder.always_on_top(aot);
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

    win.show().map_err(|e| e.to_string())?;

    if always_on_top.unwrap_or(false) {
        apply_always_on_top(&win, true, Some(&id))?;
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


// Sync notes to cloud URL using HTTP POST (temporary notes are excluded)
#[tauri::command]
async fn sync_notes_to_cloud(
    endpoint: String,
    token: String,
    notes_json: String,
) -> Result<String, String> {
    let notes_json = notes_json_for_sync(&notes_json)?;
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
            sync_to_local_directory,
            list_restorable_sync_notes,
            list_restorable_cloud_notes,
            restore_note_from_sync,
            restore_note_from_cloud,
            clean_local_sync_trash,
            remove_all_local_sync,
            clean_cloud_sync_trash,
            remove_all_cloud_sync
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
