# Changelog

All notable changes to Carrot Notes are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-20

First public release.

### Added

- Floating sticky note windows with frameless UI, resize, and drag
- Dashboard to create, preview, float, pin, rename, duplicate, and delete notes
- Notion-style WYSIWYG editor (Tiptap) with Markdown storage on disk
- Rich formatting: bold, italic, underline, strikethrough, bullets, numbers, checklists
- Keyboard shortcuts for formatting and save
- Per-note themes, custom colors, fonts, and font sizes
- Temporary notes (excluded from sync until renamed)
- Autosave and manual save modes with unsaved indicators
- Read-only mode (global, default-on-new, and per-note lock)
- System / Light / Dark dashboard appearance
- System tray with pinned and recent notes
- Always-on-top per note window
- Local folder sync (JSON backup + `.md` files)
- Self-hosted cloud sync (HTTP POST + Bearer token)
- Sync triggers: manual, on save, scheduled
- Deleted notes archived to `deleted/` on sync
- Restore from sync (local folder and cloud)
- Danger zone for sync cleanup with typed confirmation
- Linux `.deb`, AppImage, and RPM bundle targets
- GNOME Wayland always-on-top via XWayland (no shell extension required)

[0.1.0]: https://github.com/shakerbr/carrot-notes/releases/tag/v0.1.0
