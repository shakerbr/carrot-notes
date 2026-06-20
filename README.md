# Carrot Notes

Lightweight desktop sticky notes with rich editing, floating windows, system tray access, and local or self-hosted sync. Built with [Tauri](https://tauri.app/) and Rust.

**Website:** [carrot-notes.spidrahub.com](https://carrot-notes.spidrahub.com) · **Repository:** [github.com/shakerbr/carrot-notes](https://github.com/shakerbr/carrot-notes)

![Carrot Notes icon](app-icon.png)

## Why Carrot Notes?

Most sticky-note apps are either too plain (plain text only) or too heavy (full note suites). Carrot Notes sits in the middle:

- **Floating windows** that stay on your desktop — resize, move, and pin them where you need them
- **Notion-style editing** — you see formatted text, not markdown syntax
- **Markdown on disk** — notes are stored as portable `.md` files when you sync
- **Local-first** — your data lives on your machine; sync is optional

## Features

### Notes & editor
- Multiple independent floating note windows
- WYSIWYG editor (bold, italic, underline, strikethrough)
- Bullet lists, numbered lists, and checklists (click to toggle)
- Keyboard shortcuts (`Ctrl+B/I/U`, `Ctrl+Shift+L/O/C`, `Ctrl+S`)
- Per-note colors, fonts, and sizes
- Temporary notes (excluded from sync until named)
- Autosave or manual save with unsaved indicators
- Read-only mode (global, default, or per-note)

### Dashboard
- Grid preview of all notes
- Float / archive notes from the dashboard
- Pin, rename, duplicate, and delete
- System / Light / Dark appearance

### Sync & backup
- **Local folder sync** — JSON backup + individual `.md` files
- **Cloud sync** — POST to your own endpoint with Bearer token
- Sync modes: manual, on save, or scheduled
- Deleted notes archived to a `deleted/` folder on sync
- **Restore from sync** — recover notes deleted or changed locally
- Danger zone with typed confirmation for cleanup

### Desktop integration
- System tray with pinned and recent notes
- Always-on-top per note
- Note windows appear in the dock/taskbar (Linux)
- Remembers window position and size

## Platform support

| Platform | Status |
|----------|--------|
| **Linux** | Primary — tested on Ubuntu / GNOME (Wayland) |
| **Windows / macOS** | May build via Tauri; not officially tested yet |

Linux packages are provided as `.deb` and AppImage. RPM is also produced by the build.

## Install (Linux)

### .deb (Debian / Ubuntu)

Download `carrotnotes_0.1.0_amd64.deb` from [Releases](https://github.com/shakerbr/carrot-notes/releases), then:

```bash
sudo apt install ./carrotnotes_0.1.0_amd64.deb
```

### AppImage

```bash
chmod +x carrotnotes_0.1.0_amd64.AppImage
./carrotnotes_0.1.0_amd64.AppImage
```

## Build from source

**Requirements:** Node.js 18+, Rust 1.77+, Linux build dependencies for Tauri ([docs](https://tauri.app/start/prerequisites/)).

```bash
git clone https://github.com/shakerbr/carrot-notes.git
cd carrot-notes
npm install
npm run build
```

Installable packages are written to `src-tauri/target/release/bundle/`.

### Development

```bash
npm run dev
```

On GNOME + Wayland, the dev and build scripts use XWayland so always-on-top works without a shell extension.

## Known limitations

- **Linux-first** — best tested on GNOME; other desktops may behave differently
- **Always-on-top on Wayland** — uses XWayland by default; set `CARROTNOTES_NATIVE_WAYLAND=1` to opt into native Wayland (always-on-top may not work without extra setup)
- **Cloud sync** — bring your own server; there is no official Carrot cloud service
- **No mobile or web client** — desktop only
- **Early release (0.1.0)** — feedback and issue reports welcome

## Data locations

| Data | Location |
|------|----------|
| Notes | `~/.local/share/com.shakerbr.carrotnotes/notes.json` |
| Settings | `~/.local/share/com.shakerbr.carrotnotes/settings.json` |
| Sync folder | User-configured (contains `.md` files + `carrotnotes_backup.json`) |

## Tech stack

- **Frontend:** HTML, CSS, JavaScript, [Tiptap](https://tiptap.dev/) (WYSIWYG + Markdown)
- **Backend:** Rust, [Tauri 2](https://tauri.app/)
- **Fonts:** [Inter](https://fonts.google.com/specimen/Inter), [Caveat](https://fonts.google.com/specimen/Caveat)

## License

[MIT](LICENSE) © Shaker Br

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/shakerbr/carrot-notes/issues).

See [CHANGELOG.md](CHANGELOG.md) for release history.
