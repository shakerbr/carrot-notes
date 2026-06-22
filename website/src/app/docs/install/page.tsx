import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/config";
import CodeBlock from "@/components/CodeBlock";

export const metadata: Metadata = {
  title: "Install",
  description:
    "Download and install Carrot Notes v0.1.1 on Linux — .deb, AppImage, .rpm, or build from source.",
};

export default function DocsInstallPage() {
  return (
    <div className="page-content docs-prose">
      <header className="page-header">
        <h1>Install Carrot Notes</h1>
        <p>
          Download <strong>{SITE.versionTag}</strong> from{" "}
          <a href={SITE.releases} target="_blank" rel="noopener noreferrer" className="text-link">
            GitHub Releases
          </a>{" "}
          or use the direct links below.
        </p>
      </header>

      <section className="page-section">
        <h2 className="page-section-title">Download</h2>
        <div className="docs-download-actions">
          <a
            href={SITE.releasesLatest}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download {SITE.versionTag}
          </a>
          <a
            href={SITE.downloads.deb}
            className="btn btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            .deb (amd64)
          </a>
          <a
            href={SITE.downloads.appImage}
            className="btn btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            AppImage (amd64)
          </a>
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Debian / Ubuntu (.deb)</h2>
        <p className="page-section-lead">
          Recommended for Ubuntu and Debian-based distributions. Run{" "}
          <code>apt update</code> before installing so dependencies resolve correctly.
        </p>
        <CodeBlock>{`sudo apt update
sudo apt install ./carrotnotes_${SITE.version}_amd64.deb`}</CodeBlock>
      </section>

      <section className="page-section">
        <div className="docs-callout">
          <h3>Troubleshooting</h3>
          <p>
            On some distros (Kubuntu, fresh Debian, elementary OS, etc.),{" "}
            <code>apt install</code> may fail with unmet dependencies:{" "}
            <code>libayatana-appindicator3-1</code> or <code>libwebkit2gtk-4.1-0</code>.
            Run <strong>sudo apt update</strong> first. If it still fails, use the AppImage.
          </p>
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">AppImage (portable)</h2>
        <p className="page-section-lead">
          No installation required — make it executable and run:
        </p>
        <CodeBlock>{`chmod +x carrotnotes_${SITE.version}_amd64.AppImage
./carrotnotes_${SITE.version}_amd64.AppImage`}</CodeBlock>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Fedora / RPM-based (.rpm)</h2>
        <p className="page-section-lead">
          An <code>.rpm</code> package is also available on the releases page.
        </p>
        <CodeBlock>{`sudo dnf install ./carrotnotes-${SITE.version}-1.x86_64.rpm`}</CodeBlock>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Build from source</h2>
        <p className="page-section-lead">
          Requirements: Node.js 18+, Rust 1.77+, and{" "}
          <a href="https://tauri.app/start/prerequisites/" target="_blank" rel="noopener noreferrer" className="text-link">
            Tauri prerequisites
          </a>{" "}
          for Linux.
        </p>
        <CodeBlock>{`git clone ${SITE.github}.git
cd carrot-notes
npm install
npm run build`}</CodeBlock>
        <p className="page-section-note">
          Built packages are output to <code>src-tauri/target/release/bundle/</code>.
        </p>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Development</h2>
        <CodeBlock>npm run dev</CodeBlock>
        <p className="page-section-note">
          On GNOME + Wayland, dev and production builds use XWayland so always-on-top
          works without a shell extension.
        </p>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Configuration</h2>
        <div className="table-scroll">
          <table className="config-table">
            <tbody>
              <tr>
                <th>Notes</th>
                <td><code>~/.local/share/com.shakerbr.carrotnotes/notes.json</code></td>
              </tr>
              <tr>
                <th>Settings</th>
                <td><code>~/.local/share/com.shakerbr.carrotnotes/settings.json</code></td>
              </tr>
              <tr>
                <th>Sync folder</th>
                <td>User-defined (contains <code>.md</code> files + <code>carrotnotes_backup.json</code>)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Environment variables</h2>
        <div className="table-scroll">
          <table className="config-table">
            <tbody>
              <tr>
                <th><code>CARROTNOTES_NATIVE_WAYLAND=1</code></th>
                <td>
                  Use native Wayland instead of XWayland. Always-on-top may require an
                  optional GNOME shell extension.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Related</h2>
        <ul className="docs-related-list">
          <li>
            <Link href="/docs/cloud-sync">Self-hosted cloud sync API →</Link>
          </li>
          <li>
            <Link href="/">Back to homepage</Link>
          </li>
          <li>
            <a href={SITE.releases} target="_blank" rel="noopener noreferrer">
              GitHub Releases
            </a>
          </li>
        </ul>
      </section>

      <p className="page-back">
        <Link href="/docs/cloud-sync">Cloud sync API</Link>
      </p>
    </div>
  );
}
