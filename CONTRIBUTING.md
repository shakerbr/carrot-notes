<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/svg/carrot-app-icon/carrot-app-icon-dark.svg">
    <img src="docs/svg/carrot-app-icon/carrot-app-icon-light.svg" width="64" height="64" alt="Carrot Notes">
  </picture>
</p>

<h1 align="center">Contributing to Carrot Notes</h1>

<p align="center">
  Thank you for helping improve Carrot Notes.<br>
  All contributions — bug reports, ideas, docs, and code — are welcome.
</p>

---

## Ways to contribute

| Type | How |
|------|-----|
| **Bug report** | [Open an issue](https://github.com/shakerbr/carrot-notes/issues/new) with steps to reproduce, OS/desktop, and expected vs actual behavior |
| **Feature request** | [Open an issue](https://github.com/shakerbr/carrot-notes/issues/new) describing the use case, not just the solution |
| **Pull request** | Fork, branch, implement, test locally, open a PR with a clear description |
| **Documentation** | Fix typos, improve README, or clarify install steps |

---

## Development setup

### Prerequisites

- **Node.js** 18+
- **Rust** 1.77+ ([rustup](https://rustup.rs/))
- **Tauri Linux dependencies** — see [Tauri prerequisites](https://tauri.app/start/prerequisites/)

### Clone and run

```bash
git clone https://github.com/shakerbr/carrot-notes.git
cd carrot-notes
npm install
npm run dev
```

The dev script uses XWayland on GNOME Wayland so always-on-top behaves like production builds.

### Build a release locally

```bash
npm run build
```

Packages are written to `src-tauri/target/release/bundle/`.

---

## Project structure

```
carrot-notes/
├── src/                  # Frontend (HTML, CSS, JS)
│   ├── js/               # Dashboard, note editor, line formatting
│   ├── css/              # Styles
│   ├── note.html         # Note window shell
│   └── index.html        # Dashboard shell
├── src-tauri/            # Rust backend (Tauri commands, sync, windowing)
├── scripts/              # Vendor bundling (Tiptap, fonts)
├── docs/                 # Screenshots and brand assets
│   ├── screenshots/      # README / marketing images
│   └── svg/              # Logos and icons
└── extras/               # Optional GNOME Shell extension
```

---

## Pull request guidelines

1. **One concern per PR** — easier to review and merge
2. **Test on Linux** — this is the primary platform for v0.1.x
3. **Match existing style** — naming, formatting, and patterns in surrounding code
4. **No unrelated changes** — avoid drive-by refactors in the same PR
5. **Update docs** — if behavior or install steps change, update README or CHANGELOG

### Commit messages

Use clear, imperative subject lines:

```
Fix always-on-top when reopening an existing note window
Add search field to dashboard header
```

---

## Code notes

- **Editor** — [Tiptap](https://tiptap.dev/) with Markdown serialization; vendor bundle built via `scripts/build-vendor.mjs`
- **Sync** — Rust backend in `src-tauri/src/lib.rs`; temporary notes are filtered before sync
- **Linux windowing** — `src-tauri/src/linux_windowing.rs` handles Wayland / XWayland always-on-top
- **Line formatting** — `src/js/editor-line-format.js` handles per-line list conversion

---

## Brand assets

When adding docs or UI that needs the logo, use files from [`docs/svg/`](docs/svg/) rather than raster screenshots where possible.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

<p align="center">
  <img src="docs/svg/carrots/carrot-color.svg" width="32" height="32" alt="" aria-hidden="true">
</p>
