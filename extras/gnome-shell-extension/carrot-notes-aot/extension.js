/* CarrotNotes — always-on-top helper for GNOME on Wayland */
import Gio from 'gi://Gio';

const BUS_NAME = 'com.shakerbr.CarrotNotes.Windows';
const OBJECT_PATH = '/com/shakerbr/CarrotNotes/Windows';

const DBUS_IFACE = `
<node>
  <interface name="com.shakerbr.CarrotNotes.Windows">
    <method name="MakeAbove">
      <arg type="s" name="noteId" direction="in" />
    </method>
    <method name="UnmakeAbove">
      <arg type="s" name="noteId" direction="in" />
    </method>
    <method name="Ping">
      <arg type="b" name="ok" direction="out" />
    </method>
  </interface>
</node>`;

function findMetaWindow(noteId) {
  const marker = `CarrotNote|${noteId}`;
  for (const actor of global.get_window_actors()) {
    const metaWindow = actor.meta_window;
    const title = metaWindow.get_title?.() || '';
    if (title === marker || title.includes(marker)) {
      return metaWindow;
    }
  }
  return null;
}

export default class CarrotNotesAotExtension {
  enable() {
    this._impl = {
      Ping: () => true,
      MakeAbove: (noteId) => {
        const win = findMetaWindow(noteId);
        if (!win) {
          throw new Error(`CarrotNotes window not found for id ${noteId}`);
        }
        win.make_above();
      },
      UnmakeAbove: (noteId) => {
        const win = findMetaWindow(noteId);
        if (!win) {
          throw new Error(`CarrotNotes window not found for id ${noteId}`);
        }
        win.unmake_above();
      },
    };

    this._ownerId = Gio.bus_own_name(
      Gio.BusType.SESSION,
      BUS_NAME,
      Gio.BusNameOwnerFlags.NONE,
      null,
      (connection, _name) => {
        this._dbus = Gio.DBusExportedObject.wrapJSObject(DBUS_IFACE, this._impl);
        this._dbus.export(connection, OBJECT_PATH);
      },
      (_connection, _name) => {
        this._dbus?.unexport();
        delete this._dbus;
      }
    );
  }

  disable() {
    if (this._ownerId) {
      Gio.bus_unown_name(this._ownerId);
      this._ownerId = null;
    }
    this._dbus?.unexport();
    delete this._dbus;
    delete this._impl;
  }
}
