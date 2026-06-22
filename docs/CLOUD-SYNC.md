# Cloud sync API

Carrot Notes can sync to **your own HTTP server**. There is no official Carrot cloud — you host the endpoint and store the backup JSON yourself.

This document describes the contract the desktop app expects so you can build a compatible sync backend.

**Related:** Local folder sync writes the same note JSON to `carrotnotes_backup.json` plus `.md` files. Cloud sync sends only the JSON array.

---

## Overview

| Operation | Method | URL | Body |
|-----------|--------|-----|------|
| Sync (push) | `POST` | `{endpoint}` | Notes JSON array |
| Fetch backup | `GET` | `{endpoint}` | — |
| Clean trash | `DELETE` | `{endpoint}/deleted` | — |
| Remove all | `POST` | `{endpoint}` | `[]` |

All requests use **`Content-Type: application/json`** where a body is sent.

---

## Authentication

If the app has a token configured, every request includes:

```http
Authorization: Bearer <token>
```

If the token field is empty in Carrot Notes settings, the `Authorization` header is omitted (GET/DELETE only — POST sync still sends the header as `Bearer ` with an empty token from the Rust client; prefer setting a token in production).

---

## Sync — `POST {endpoint}`

Pushes the current note list to your server.

### Request

```http
POST https://your-server.example.com/carrotnotes HTTP/1.1
Authorization: Bearer your-secret-token
Content-Type: application/json

[{ ...note objects... }]
```

### Notes included

- **Permanent notes only** — entries with `"isTemporary": true` are **stripped** before upload.
- The body is a **JSON array** of note objects (not wrapped in `{ "notes": [...] }`).

### Response

- **2xx** — success (response body is shown in the app status line but not parsed)
- **Non-2xx** — sync fails; body text is included in the error message

### Example minimal server (Node.js / Express)

```javascript
const express = require('express');
const fs = require('fs');
const app = express();

const TOKEN = process.env.CARROT_TOKEN || 'change-me';
const DATA_FILE = './carrotnotes_backup.json';

app.use(express.json({ limit: '10mb' }));

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// GET — return backup for restore scan
app.get('/carrotnotes', auth, (req, res) => {
  if (!fs.existsSync(DATA_FILE)) return res.json([]);
  res.type('json').send(fs.readFileSync(DATA_FILE, 'utf8'));
});

// POST — save backup (full replace)
app.post('/carrotnotes', auth, (req, res) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

// DELETE — clean trash (optional; cloud has no deleted/ folder by default)
app.delete('/carrotnotes/deleted', auth, (req, res) => {
  // Implement if you store archived deletes server-side
  res.json({ ok: true });
});

app.listen(3000, () => console.log('Carrot sync on :3000'));
```

Configure in Carrot Notes: **Sync & Cloud → Cloud Server Sync**

- **Endpoint:** `https://your-server.example.com/carrotnotes`
- **Token:** same as `CARROT_TOKEN`

---

## Fetch backup — `GET {endpoint}`

Used when **Find Restorable Notes** runs with sync source **Cloud Server**.

### Request

```http
GET https://your-server.example.com/carrotnotes HTTP/1.1
Authorization: Bearer your-secret-token
Accept: application/json
```

### Response

- **2xx** with body = JSON **array** of note objects (same shape as POST)
- Empty backup: `[]`

The app compares this backup to local notes to list items that were deleted or changed locally since the last sync.

---

## Clean trash — `DELETE {endpoint}/deleted`

Triggered from **Danger Zone → Cloud Server → Clean Trash**.

### Request

```http
DELETE https://your-server.example.com/carrotnotes/deleted HTTP/1.1
Authorization: Bearer your-secret-token
```

The URL is `{endpoint}` with trailing slash removed, plus `/deleted`.

### Response

- **2xx** — success
- **Non-2xx** — error shown in the app

**Note:** Unlike local sync, cloud sync does not automatically maintain a `deleted/` archive on the server. Implement this route only if you store deleted note archives at that path.

---

## Remove everything — `POST {endpoint}` with `[]`

Triggered from **Danger Zone → Cloud Server → Remove Everything**.

Equivalent to:

```http
POST https://your-server.example.com/carrotnotes HTTP/1.1
Authorization: Bearer your-secret-token
Content-Type: application/json

[]
```

Your server should replace the stored backup with an empty array.

---

## Note object schema

Each element in the sync array is a note object. Fields the app reads and writes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique ID (e.g. `note_1718891234_abc123`) |
| `title` | string | Display title |
| `content` | string | Note body as **Markdown** |
| `theme` | string | Color theme ID (e.g. `theme-orange`) |
| `isTemporary` | boolean | If `true`, **excluded from sync** |
| `isOpen` | boolean | Whether the note window is open |
| `pinned` | boolean | Pinned in tray / dashboard |
| `alwaysOnTop` | boolean | Window always-on-top |
| `readOnly` | boolean | Per-note lock |
| `fontFamily` | string | e.g. `Caveat`, `Inter` |
| `fontSize` | string | e.g. `20px` |
| `width` | number | Window width (px) |
| `height` | number | Window height (px) |
| `x` | number | Window X position |
| `y` | number | Window Y position |
| `rotation` | number / string | Card rotation for preview |

Additional fields are preserved if present in JSON but are not required for sync.

### Example note

```json
{
  "id": "note_1718891234567_x9k2m",
  "title": "Shopping list",
  "content": "- [ ] Milk\n- [x] Bread",
  "theme": "theme-yellow",
  "isTemporary": false,
  "isOpen": false,
  "pinned": true,
  "alwaysOnTop": false,
  "readOnly": false,
  "fontFamily": "Caveat",
  "fontSize": "20px",
  "width": 280,
  "height": 300,
  "x": 120,
  "y": 80,
  "rotation": "0.5"
}
```

---

## Sync modes (in the app)

| Mode | Behavior |
|------|----------|
| **Manual** | Sync only when you click **Sync Cloud Now** |
| **On save** | Sync after each note save |
| **Scheduled** | Sync every N seconds (minimum 5) |

These modes only control **when** the app calls `POST`. Your server always receives the full current list (last-write-wins).

---

## Conflict handling

There is **no merge or conflict resolution** in v0.1.0:

- Each sync **replaces** the remote backup with the local non-temporary notes.
- **Restore** pulls a note from the last synced backup if you deleted or changed it locally and have not synced since.

For multi-device use, treat the server as a **backup snapshot**, not a real-time collaborative store.

---

## Security recommendations

1. **Always use HTTPS** in production.
2. **Use a strong Bearer token** — the app stores it in local settings.
3. **Validate** that the POST body is a JSON array before writing.
4. **Rate-limit** your endpoint if exposed to the internet.
5. Do not expose the endpoint without authentication.

---

## Local folder sync (reference)

If you prefer files over HTTP, use **Local Folder Sync** instead. The app writes:

```
sync-folder/
├── carrotnotes_backup.json    # Same JSON array as cloud POST body
├── My Note {id}.md            # One markdown file per note
└── deleted/                   # Archived notes after delete + sync
    ├── {id}.json
    └── ...
```

See the main [README](../README.md) for install and usage.

---

## Changelog

| Version | Changes |
|---------|---------|
| 0.1.0 | Initial cloud sync API (POST, GET, DELETE `/deleted`, POST `[]`) |
