# Changelog

All notable changes to [Carrot Notes](https://github.com/shakerbr/carrot-notes) are documented in this file.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned

See the project roadmap and open [issues](https://github.com/shakerbr/carrot-notes/issues) for upcoming work.

---

## [0.1.0] — 2026-06-20

<p align="left">
  <a href="https://github.com/shakerbr/carrot-notes/releases/tag/v0.1.0">
    <img src="https://img.shields.io/badge/Release-v0.1.0-F06E10?style=flat-square" alt="v0.1.0">
  </a>
</p>

**First public release** — floating sticky notes for Linux with rich editing, local-first storage, and optional sync.

### Notes & editor

- Floating sticky note windows — frameless UI, drag, resize, always-on-top
- Notion-style WYSIWYG editor ([Tiptap](https://tiptap.dev/)) with Markdown on disk
- Rich formatting: bold, italic, underline, strikethrough
- Bullet lists, numbered lists, and interactive checklists
- Keyboard shortcuts for formatting and save
- Per-note themes, custom colors, fonts, and font sizes
- Temporary notes — excluded from sync until renamed
- Autosave and manual save with unsaved indicators
- Read-only mode — global, default-on-new, and per-note lock

### Dashboard & desktop

- Dashboard to create, preview, float, pin, rename, duplicate, and delete notes
- System / Light / Dark appearance
- System tray with pinned and recent notes
- Note windows in the dock / taskbar (Linux)
- Window position and size persistence

### Sync & backup

- Local folder sync — JSON backup + individual `.md` files
- Self-hosted cloud sync — HTTP POST with Bearer token
- Sync triggers: manual, on save, or scheduled
- Deleted notes archived to `deleted/` folder on sync
- Restore from sync — local folder and cloud sources
- Danger zone for sync cleanup with typed confirmation

### Linux & packaging

- `.deb`, AppImage, and `.rpm` bundle targets
- GNOME Wayland always-on-top via XWayland — no shell extension required
- Smooth note window open without flash
- Soft window shadows on transparent frames

---

[Unreleased]: https://github.com/shakerbr/carrot-notes/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/shakerbr/carrot-notes/releases/tag/v0.1.0
