/* CarrotNotes always-on-top helper for GNOME Wayland */
import Gio from 'gi://Gio';

const IFACE = `
<node>
  <interface name="org.gnome.Shell.Extensions.CarrotNotes">
    <method name="List">
      <arg type="s" direction="out" name="windows"/>
    </method>
    <method name="MakeAbove">
      <arg type="u" direction="in" name="winid"/>
    </method>
    <method name="UnmakeAbove">
      <arg type="u" direction="in" name="winid"/>
    </method>
  </interface>
</node>`;

export default class Extension {
  enable() {
    this._dbus = Gio.DBusExportedObject.wrapJSObject(IFACE, this);
    this._dbus.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/CarrotNotes');
  }

  disable() {
    this._dbus?.unexport();
    delete this._dbus;
  }

  _windowById(winid) {
    const actor = global.get_window_actors().find(
      (w) => w.meta_window.get_id() === winid
    );
    if (!actor) {
      throw new Error(`Window ${winid} not found`);
    }
    return actor.meta_window;
  }

  List() {
    const windows = global.get_window_actors().map((w) => {
      const meta = w.meta_window;
      return {
        id: meta.get_id(),
        title: meta.get_title(),
        wm_class: meta.get_wm_class(),
        pid: meta.get_pid(),
      };
    });
    return JSON.stringify(windows);
  }

  MakeAbove(winid) {
    this._windowById(winid).make_above();
  }

  UnmakeAbove(winid) {
    this._windowById(winid).unmake_above();
  }
}
