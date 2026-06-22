<p align="center">
  <img src="../../docs/svg/carrots/carrot-color.svg" width="48" height="48" alt="Carrot Notes">
</p>

<h1 align="center">GNOME Shell Extension</h1>

<p align="center"><em>Optional · Advanced users only</em></p>

---

## You probably don't need this

Carrot Notes automatically uses **XWayland** on GNOME Wayland, so **always-on-top works out of the box** — no extension required.

This extension is only relevant if you explicitly run with native Wayland:

```bash
CARROTNOTES_NATIVE_WAYLAND=1 npm run dev
```

In that mode, GNOME blocks always-on-top from applications. You then need one of:

- This Carrot Notes extension, or
- [Window Calls](https://extensions.gnome.org/extension/4724/window-calls/)

---

## Install

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/carrot-notes-aot@shakerbr.com
cp -r extras/gnome-shell-extension/carrot-notes-aot/* \
  ~/.local/share/gnome-shell/extensions/carrot-notes-aot@shakerbr.com/
gnome-extensions enable carrot-notes-aot@shakerbr.com
```

Restart GNOME Shell (`Alt+F2` → `restart` → Enter), then verify:

```bash
gdbus call --session \
  --dest com.shakerbr.CarrotNotes.Windows \
  --object-path /com/shakerbr/CarrotNotes/Windows \
  --method com.shakerbr.CarrotNotes.Windows.Ping
```

Expected output: `(true,)`

---

<p align="center">
  <a href="../../README.md">← Back to Carrot Notes</a>
</p>
