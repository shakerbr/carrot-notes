import Link from "next/link";
import { SITE } from "@/lib/config";
import AppIcon from "@/components/AppIcon";
import CodeBlock from "@/components/CodeBlock";
import ThemeScreenshot from "@/components/ThemeScreenshot";

const FEATURES = [
  {
    title: "Notes & editor",
    icon: (
      <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
    items: [
      "Independent floating note windows",
      "WYSIWYG editing — bold, italic, underline, strikethrough",
      "Bullets, numbered lists, and interactive checklists",
      "Keyboard shortcuts (Ctrl+B/I/U, Ctrl+Shift+L/O/C, Ctrl+S)",
      "Per-note colors, fonts, and sizes",
      "Temporary notes (excluded from sync until named)",
      "Autosave or manual save with unsaved indicators",
      "Read-only mode — global, default, or per-note",
    ],
  },
  {
    title: "Dashboard & desktop",
    icon: (
      <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    items: [
      "Grid preview of all notes",
      "Float, archive, pin, rename, duplicate, delete",
      "System / Light / Dark appearance",
      "System tray with pinned and recent notes",
      "Always-on-top per note",
      "Dock / taskbar entries (Linux)",
      "Remembers window position and size",
    ],
  },
  {
    title: "Sync & backup",
    icon: (
      <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
      </svg>
    ),
    items: [
      "Local folder — JSON backup + individual .md files",
      "Cloud — POST to your own endpoint (Bearer token)",
      "Manual, on-save, or scheduled sync",
      "Deleted notes archived to deleted/ on sync",
      "Restore from sync — recover deleted or overwritten notes",
      "Danger zone with typed confirmation",
    ],
    link: { href: "/docs/cloud-sync", label: "Self-hosted cloud sync API →" },
  },
  {
    title: "Data & privacy",
    icon: (
      <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    items: [
      "Notes stored locally on your machine",
      "Markdown export via sync folder",
      "No telemetry or bundled cloud service",
      "Self-hosted sync when you want it",
      "Temporary notes never leave your device until named",
    ],
  },
];

const TECH_STACK = [
  { layer: "UI", tech: "HTML, CSS, JavaScript" },
  { layer: "Editor", tech: "Tiptap", href: "https://tiptap.dev/" },
  { layer: "Runtime", tech: "Tauri 2", href: "https://tauri.app/" },
  { layer: "Backend", tech: "Rust" },
  { layer: "Fonts", tech: "Inter, Caveat", href: "https://fonts.google.com/specimen/Inter" },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              {SITE.versionTag} — {SITE.releaseHighlight}
            </div>

            <p className="hero-tagline">{SITE.tagline}</p>
            <h1 className="hero-title">{SITE.name}</h1>
            <p className="hero-subtitle">{SITE.subtitle}</p>
            <p className="hero-description">
              A local-first desktop sticky-notes app built with Tauri and Rust.
              Each note lives in its own floating window — resize it, pin it,
              keep it always on top — while you write in a clean, Notion-style
              editor. Content is stored as Markdown, so your notes stay portable
              and under your control.
            </p>

            <div className="hero-actions">
              <a
                href={SITE.releasesLatest}
                className="btn btn-primary btn-lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download {SITE.versionTag}
              </a>
              <Link href="/docs/install" className="btn btn-secondary btn-lg">
                Install guide
              </Link>
            </div>

            <div className="hero-meta">
              <span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                No account required
              </span>
              <span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                Markdown on disk
              </span>
              <span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
                Linux-first
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <AppIcon className="hero-icon" width={200} height={200} />
            <img
              src="/assets/screenshots/note-theme-carrot-orange.png"
              alt="Carrot Orange note window"
              className="hero-note hero-note-a"
              width={160}
              height={179}
            />
            <img
              src="/assets/screenshots/note-theme-clean-dark-gray.png"
              alt="Clean Dark Gray note window"
              className="hero-note hero-note-b"
              width={160}
              height={179}
            />
            <img
              src="/assets/screenshots/note-theme-lavender-purple.png"
              alt="Lavender Purple note window"
              className="hero-note hero-note-c"
              width={160}
              height={179}
            />
          </div>
        </div>
      </section>

      <section id="features" className="section section-alt">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Features</span>
            <h2 className="section-title">Everything you need, nothing you don&apos;t</h2>
            <p className="section-subtitle">
              No vendor lock-in. Optional sync to a folder or your own server.
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map((group) => (
              <article key={group.title} className="feature-card">
                <h3>
                  {group.icon}
                  {group.title}
                </h3>
                <ul className="feature-list">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {"link" in group && group.link ? (
                  <p className="feature-card-link">
                    <Link href={group.link.href}>{group.link.label}</Link>
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="screenshots" className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Screenshots</span>
            <h2 className="section-title">See it in action</h2>
            <p className="section-subtitle">
              Floating notes, a full dashboard, sync settings, and rich formatting — all on your desktop.
            </p>
          </div>

          <div className="screenshots-stack">
            <div className="screenshots-pair">
              <article className="screenshot-card">
                <div className="screenshot-card-text">
                  <h3>Floating notes</h3>
                  <p>Each note is its own window. Pick a theme, resize, and keep it on your desktop.</p>
                </div>
                <div className="screenshot-notes-stack">
                  <img
                    src="/assets/screenshots/note-theme-lavender-purple.png"
                    alt=""
                    className="screenshot-img screenshot-stack-item screenshot-stack-back"
                    loading="lazy"
                  />
                  <img
                    src="/assets/screenshots/note-theme-clean-dark-gray.png"
                    alt=""
                    className="screenshot-img screenshot-stack-item screenshot-stack-mid"
                    loading="lazy"
                  />
                  <img
                    src="/assets/screenshots/note-theme-carrot-orange.png"
                    alt="Floating note windows in Carrot Orange, dark gray, and lavender themes"
                    className="screenshot-img screenshot-stack-item screenshot-stack-front"
                    loading="lazy"
                  />
                </div>
              </article>

              <article className="screenshot-card">
                <div className="screenshot-card-text">
                  <h3>Note toolbar</h3>
                  <p>Save, lock, color, font, formatting, and always-on-top — everything in reach.</p>
                </div>
                <div className="screenshot-media">
                  <img
                    src="/assets/screenshots/note-toolbar.png"
                    alt="Note window toolbar with labeled controls"
                    className="screenshot-img"
                    loading="lazy"
                  />
                </div>
              </article>
            </div>

            <div className="screenshots-trio">
              <article className="screenshot-card">
                <div className="screenshot-card-text">
                  <h3>Dashboard</h3>
                  <p>
                    Manage all your notes from one place — create, float, archive, pin, and preview at a glance.
                  </p>
                </div>
                <div className="screenshot-media">
                  <ThemeScreenshot
                    lightSrc="/assets/screenshots/dashboard-my-notes-light.png"
                    darkSrc="/assets/screenshots/dashboard-my-notes-dark.png"
                    alt="Carrot Notes dashboard — My Notes"
                    className="screenshot-img"
                  />
                </div>
              </article>

              <article className="screenshot-card">
                <div className="screenshot-card-text">
                  <h3>Sync &amp; Cloud</h3>
                  <p>
                    Local folder sync, self-hosted cloud, restore from backup, and a danger zone for
                    cleanup.{" "}
                    <Link href="/docs/cloud-sync">Self-hosted cloud sync API →</Link>
                  </p>
                </div>
                <div className="screenshot-media">
                  <ThemeScreenshot
                    lightSrc="/assets/screenshots/dashboard-sync-cloud-light.png"
                    darkSrc="/assets/screenshots/dashboard-sync-cloud-dark.png"
                    alt="Dashboard — Sync and Cloud settings"
                    className="screenshot-img"
                  />
                </div>
              </article>

              <article className="screenshot-card">
                <div className="screenshot-card-text">
                  <h3>Preferences</h3>
                  <p>Appearance, autosave, default formatting, custom fonts, and note colors.</p>
                </div>
                <div className="screenshot-media">
                  <ThemeScreenshot
                    lightSrc="/assets/screenshots/dashboard-preferences-light.png"
                    darkSrc="/assets/screenshots/dashboard-preferences-dark.png"
                    alt="Dashboard — Preferences"
                    className="screenshot-img"
                  />
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Platform</span>
            <h2 className="section-title">Built for Linux</h2>
            <p className="section-subtitle">
              Carrot Notes is Linux-first. Windows and macOS builds may work but
              have not been validated in this release.
            </p>
          </div>

          <div className="table-scroll">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Status</th>
                  <th>Packages</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Linux</strong></td>
                  <td className="status-primary">
                    Primary — tested on Ubuntu/GNOME, Kubuntu, Debian, elementary OS, and more
                  </td>
                  <td>.deb, AppImage, .rpm</td>
                </tr>
                <tr>
                  <td><strong>Windows</strong></td>
                  <td className="status-muted">May build via Tauri</td>
                  <td>Not officially tested</td>
                </tr>
                <tr>
                  <td><strong>macOS</strong></td>
                  <td className="status-muted">May build via Tauri</td>
                  <td>Not officially tested</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">{SITE.versionTag}</span>
            <h2 className="section-title">Get started in minutes</h2>
            <p className="section-subtitle">
              Download the latest release from GitHub — or jump to the full install guide.
            </p>
          </div>

          <div className="install-compact">
            <a
              href={SITE.releasesLatest}
              className="btn btn-primary btn-lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download {SITE.versionTag}
            </a>
            <CodeBlock>{`sudo apt update && sudo apt install ./carrotnotes_${SITE.version}_amd64.deb`}</CodeBlock>
            <p className="install-compact-link">
              <Link href="/docs/install" className="text-link">
                Full install guide →
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Tech stack</span>
            <h2 className="section-title">Modern, lightweight stack</h2>
          </div>

          <dl className="tech-grid">
            {TECH_STACK.map((item) => (
              <div key={item.layer} className="tech-item">
                <dt>{item.layer}</dt>
                <dd>
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-link">
                      {item.tech}
                    </a>
                  ) : (
                    item.tech
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-section">
            <img
              src="/assets/svg/carrots/carrot-color.svg"
              alt=""
              width={48}
              height={48}
              className="cta-carrot"
            />
            <h2>Ready to stick some notes?</h2>
            <p>
              Download Carrot Notes for free. No account, no cloud required —
              just floating sticky notes that work the way you do.
            </p>
            <div className="cta-actions">
              <a
                href={SITE.releasesLatest}
                className="btn btn-primary btn-lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download {SITE.versionTag}
              </a>
              <a
                href={SITE.github}
                className="btn btn-secondary btn-lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
