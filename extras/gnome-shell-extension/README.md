# CarrotNotes GNOME Shell extension (optional)

**You do not need this extension.** CarrotNotes automatically uses XWayland on GNOME Wayland so always-on-top works out of the box.

This extension is only for advanced users who explicitly run with native Wayland:

```bash
CARROTNOTES_NATIVE_WAYLAND=1 npm run dev
```

In that mode, GNOME blocks always-on-top from apps, so one of these extensions is required:

- This CarrotNotes extension, or
- [Window Calls](https://extensions.gnome.org/extension/4724/window-calls/)

## Install (optional)

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
