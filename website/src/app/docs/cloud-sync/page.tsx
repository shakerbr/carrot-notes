import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/config";
import CodeBlock from "@/components/CodeBlock";

export const metadata: Metadata = {
  title: "Cloud sync API",
  description:
    "Self-hosted HTTP sync contract for Carrot Notes — endpoints, authentication, note schema, and security.",
};

const NOTE_SCHEMA = [
  ["id", "string", "Unique ID (e.g. note_1718891234_abc123)"],
  ["title", "string", "Display title"],
  ["content", "string", "Note body as Markdown"],
  ["theme", "string", "Color theme ID (e.g. theme-orange)"],
  ["isTemporary", "boolean", "If true, excluded from sync"],
  ["isOpen", "boolean", "Whether the note window is open"],
  ["pinned", "boolean", "Pinned in tray / dashboard"],
  ["alwaysOnTop", "boolean", "Window always-on-top"],
  ["readOnly", "boolean", "Per-note lock"],
  ["fontFamily", "string", "e.g. Caveat, Inter"],
  ["fontSize", "string", "e.g. 20px"],
  ["width", "number", "Window width (px)"],
  ["height", "number", "Window height (px)"],
  ["x", "number", "Window X position"],
  ["y", "number", "Window Y position"],
  ["rotation", "number / string", "Card rotation for preview"],
] as const;

const EXAMPLE_NOTE = `{
  "id": "note_1718891234567_x9k2m",
  "title": "Shopping list",
  "content": "- [ ] Milk\\n- [x] Bread",
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
}`;

const EXAMPLE_SERVER = `const express = require('express');
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

app.get('/carrotnotes', auth, (req, res) => {
  if (!fs.existsSync(DATA_FILE)) return res.json([]);
  res.type('json').send(fs.readFileSync(DATA_FILE, 'utf8'));
});

app.post('/carrotnotes', auth, (req, res) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

app.delete('/carrotnotes/deleted', auth, (req, res) => {
  res.json({ ok: true });
});

app.listen(3000, () => console.log('Carrot sync on :3000'));`;

export default function CloudSyncDocsPage() {
  return (
    <div className="page-content docs-prose">
      <header className="page-header">
        <h1>Cloud sync API</h1>
        <p>
          Carrot Notes can sync to <strong>your own HTTP server</strong>. There is no official
          Carrot cloud — you host the endpoint and store the backup JSON yourself.
        </p>
        <p className="page-section-lead" style={{ marginTop: "1rem" }}>
          Local folder sync writes the same note JSON to <code>carrotnotes_backup.json</code> plus{" "}
          <code>.md</code> files. Cloud sync sends only the JSON array.
        </p>
      </header>

      <section className="page-section">
        <h2 className="page-section-title">Overview</h2>
        <div className="table-scroll">
          <table className="platform-table docs-table">
            <thead>
              <tr>
                <th>Operation</th>
                <th>Method</th>
                <th>URL</th>
                <th>Body</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sync (push)</td>
                <td><code>POST</code></td>
                <td><code>{`{endpoint}`}</code></td>
                <td>Notes JSON array</td>
              </tr>
              <tr>
                <td>Fetch backup</td>
                <td><code>GET</code></td>
                <td><code>{`{endpoint}`}</code></td>
                <td>—</td>
              </tr>
              <tr>
                <td>Clean trash</td>
                <td><code>DELETE</code></td>
                <td><code>{`{endpoint}/deleted`}</code></td>
                <td>—</td>
              </tr>
              <tr>
                <td>Remove all</td>
                <td><code>POST</code></td>
                <td><code>{`{endpoint}`}</code></td>
                <td><code>[]</code></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="page-section-note">
          All requests use <code>Content-Type: application/json</code> where a body is sent.
        </p>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Authentication</h2>
        <p className="page-section-lead">
          If the app has a token configured, every request includes:
        </p>
        <CodeBlock>{`Authorization: Bearer <token>`}</CodeBlock>
        <p className="page-section-note">
          Use a strong token in production. The app stores it in local settings.
        </p>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Sync — POST {`{endpoint}`}</h2>
        <p className="page-section-lead">Pushes the current note list to your server.</p>
        <ul className="docs-list">
          <li>
            <strong>Permanent notes only</strong> — entries with <code>isTemporary: true</code> are
            stripped before upload.
          </li>
          <li>The body is a JSON <strong>array</strong> of note objects (not wrapped).</li>
          <li>
            <strong>2xx</strong> — success. <strong>Non-2xx</strong> — sync fails; body text is shown
            in the app.
          </li>
        </ul>
        <CodeBlock>{`POST https://your-server.example.com/carrotnotes HTTP/1.1
Authorization: Bearer your-secret-token
Content-Type: application/json

[{ ...note objects... }]`}</CodeBlock>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Example server (Node.js / Express)</h2>
        <CodeBlock>{EXAMPLE_SERVER}</CodeBlock>
        <p className="page-section-note">
          Configure in Carrot Notes: <strong>Sync &amp; Cloud → Cloud Server Sync</strong>. Set
          endpoint to <code>https://your-server.example.com/carrotnotes</code> and token to match{" "}
          <code>CARROT_TOKEN</code>.
        </p>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Fetch backup — GET {`{endpoint}`}</h2>
        <p className="page-section-lead">
          Used when <strong>Find Restorable Notes</strong> runs with sync source{" "}
          <strong>Cloud Server</strong>. Returns a JSON array of note objects; empty backup is{" "}
          <code>[]</code>.
        </p>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Clean trash — DELETE {`{endpoint}/deleted`}</h2>
        <p className="page-section-lead">
          Triggered from <strong>Danger Zone → Cloud Server → Clean Trash</strong>. Unlike local
          sync, cloud sync does not automatically maintain a <code>deleted/</code> archive on the
          server — implement this route only if you store deleted note archives server-side.
        </p>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Remove everything — POST with []</h2>
        <p className="page-section-lead">
          Triggered from <strong>Danger Zone → Cloud Server → Remove Everything</strong>. Your server
          should replace the stored backup with an empty array.
        </p>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Note object schema</h2>
        <div className="table-scroll">
          <table className="platform-table docs-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {NOTE_SCHEMA.map(([field, type, desc]) => (
                <tr key={field}>
                  <td><code>{field}</code></td>
                  <td>{type}</td>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="page-section-note" style={{ marginTop: "1rem" }}>
          Additional fields are preserved if present but are not required for sync.
        </p>
        <CodeBlock>{EXAMPLE_NOTE}</CodeBlock>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Sync modes (in the app)</h2>
        <div className="table-scroll">
          <table className="platform-table docs-table">
            <thead>
              <tr>
                <th>Mode</th>
                <th>Behavior</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Manual</strong></td>
                <td>Sync only when you click Sync Cloud Now</td>
              </tr>
              <tr>
                <td><strong>On save</strong></td>
                <td>Sync after each note save</td>
              </tr>
              <tr>
                <td><strong>Scheduled</strong></td>
                <td>Sync every N seconds (minimum 5)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="page-section-note">
          These modes control <em>when</em> the app calls POST. Your server always receives the full
          current list (last-write-wins).
        </p>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Conflict handling</h2>
        <p className="page-section-lead">
          There is no merge or conflict resolution — each sync <strong>replaces</strong> the remote
          backup with local non-temporary notes. Restore pulls a note from the last synced backup if
          you deleted or changed it locally and have not synced since. Treat the server as a backup
          snapshot, not a real-time collaborative store.
        </p>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Security recommendations</h2>
        <ul className="docs-list">
          <li>Always use HTTPS in production.</li>
          <li>Use a strong Bearer token.</li>
          <li>Validate that the POST body is a JSON array before writing.</li>
          <li>Rate-limit your endpoint if exposed to the internet.</li>
          <li>Do not expose the endpoint without authentication.</li>
        </ul>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Local folder sync (reference)</h2>
        <CodeBlock>{`sync-folder/
├── carrotnotes_backup.json    # Same JSON array as cloud POST body
├── My Note {id}.md            # One markdown file per note
└── deleted/                   # Archived notes after delete + sync
    ├── {id}.json
    └── ...`}</CodeBlock>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Source</h2>
        <p className="page-section-lead">
          Full upstream documentation:{" "}
          <a
            href={`${SITE.github}/blob/main/docs/CLOUD-SYNC.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            docs/CLOUD-SYNC.md on GitHub
          </a>
        </p>
      </section>

      <p className="page-back">
        <Link href="/docs/install">Install guide</Link>
      </p>
    </div>
  );
}
