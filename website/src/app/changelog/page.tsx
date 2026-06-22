import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Release history and notable changes for Carrot Notes.",
};

export default function ChangelogPage() {
  return (
    <div className="container" style={{ paddingBottom: "4rem" }}>
      <header className="page-header">
        <h1>Changelog</h1>
        <p>
          All notable changes to{" "}
          <a href={SITE.github} target="_blank" rel="noopener noreferrer">
            Carrot Notes
          </a>{" "}
          are documented here. The project follows{" "}
          <a href="https://keepachangelog.com/en/1.1.0/" target="_blank" rel="noopener noreferrer">
            Keep a Changelog
          </a>{" "}
          and{" "}
          <a href="https://semver.org/spec/v2.0.0.html" target="_blank" rel="noopener noreferrer">
            Semantic Versioning
          </a>
          .
        </p>
      </header>

      <article className="changelog-entry">
        <div className="changelog-version">
          <h2>Unreleased</h2>
        </div>
        <div className="changelog-section">
          <h3>Changed</h3>
          <ul>
            <li>
              README install notes: run <code>apt update</code> before <code>.deb</code> install when
              dependencies are missing
            </li>
          </ul>
        </div>
      </article>

      <article className="changelog-entry">
        <div className="changelog-version">
          <h2>0.1.1</h2>
          <span className="version-badge">Latest</span>
          <span className="changelog-date">June 20, 2026</span>
        </div>

        <div className="changelog-section">
          <h3>Fixed</h3>
          <ul>
            <li>
              Bundled Inter and Caveat fonts — handwriting and UI fonts work without system fonts
            </li>
            <li>Dashboard minimum width increased to 480px</li>
          </ul>
        </div>

        <div className="changelog-section">
          <h3>Added</h3>
          <ul>
            <li>
              <Link href="/docs/cloud-sync">Cloud sync API documentation</Link> for self-hosted servers
            </li>
          </ul>
        </div>

        <p style={{ marginTop: "1.5rem" }}>
          <a
            href={`${SITE.releases}/tag/v0.1.1`}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download v0.1.1
          </a>
        </p>
      </article>

      <article className="changelog-entry">
        <div className="changelog-version">
          <h2>0.1.0</h2>
          <span className="changelog-date">June 20, 2026</span>
        </div>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          <strong>First public release</strong> — floating sticky notes for Linux with
          rich editing, local-first storage, and optional sync.
        </p>

        <div className="changelog-section">
          <h3>Notes & editor</h3>
          <ul>
            <li>Floating sticky note windows — frameless UI, drag, resize, always-on-top</li>
            <li>Notion-style WYSIWYG editor (Tiptap) with Markdown on disk</li>
            <li>Rich formatting: bold, italic, underline, strikethrough</li>
            <li>Bullet lists, numbered lists, and interactive checklists</li>
            <li>Keyboard shortcuts for formatting and save</li>
            <li>Per-note themes, custom colors, fonts, and font sizes</li>
            <li>Temporary notes — excluded from sync until renamed</li>
            <li>Autosave and manual save with unsaved indicators</li>
            <li>Read-only mode — global, default-on-new, and per-note lock</li>
          </ul>
        </div>

        <div className="changelog-section">
          <h3>Dashboard & desktop</h3>
          <ul>
            <li>Dashboard to create, preview, float, pin, rename, duplicate, and delete notes</li>
            <li>System / Light / Dark appearance</li>
            <li>System tray with pinned and recent notes</li>
            <li>Note windows in the dock / taskbar (Linux)</li>
            <li>Window position and size persistence</li>
          </ul>
        </div>

        <div className="changelog-section">
          <h3>Sync & backup</h3>
          <ul>
            <li>Local folder sync — JSON backup + individual .md files</li>
            <li>Self-hosted cloud sync — HTTP POST with Bearer token</li>
            <li>Sync triggers: manual, on save, or scheduled</li>
            <li>Deleted notes archived to deleted/ folder on sync</li>
            <li>Restore from sync — local folder and cloud sources</li>
            <li>Danger zone for sync cleanup with typed confirmation</li>
          </ul>
        </div>

        <div className="changelog-section">
          <h3>Linux & packaging</h3>
          <ul>
            <li>.deb, AppImage, and .rpm bundle targets</li>
            <li>GNOME Wayland always-on-top via XWayland — no shell extension required</li>
            <li>Smooth note window open without flash</li>
            <li>Soft window shadows on transparent frames</li>
          </ul>
        </div>

        <p style={{ marginTop: "1.5rem" }}>
          <a
            href={`${SITE.releases}/tag/v0.1.0`}
            className="btn btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download v0.1.0
          </a>
        </p>
      </article>

      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
        <Link href="/">← Back to home</Link>
      </p>
    </div>
  );
}
