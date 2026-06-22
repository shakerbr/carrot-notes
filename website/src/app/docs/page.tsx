import type { Metadata } from "next";
import Link from "next/link";
import { DOCS_NAV } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Docs",
  description: "Installation, cloud sync API, and configuration guides for Carrot Notes.",
};

const DOCS_DESCRIPTIONS: Record<string, string> = {
  "/docs/install":
    "Download from GitHub Releases — .deb, AppImage, .rpm, or build from source. Includes troubleshooting for dependency issues.",
  "/docs/cloud-sync":
    "HTTP contract for self-hosted sync servers — authentication, endpoints, note schema, and security recommendations.",
};

export default function DocsIndexPage() {
  const guides = DOCS_NAV.filter((item) => item.href !== "/docs");

  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Documentation</h1>
        <p>Guides for installing Carrot Notes and running your own sync backend.</p>
      </header>

      <div className="docs-index">
        {guides.map((doc) => (
          <Link key={doc.href} href={doc.href} className="docs-index-card">
            <h2>{doc.label}</h2>
            <p>{DOCS_DESCRIPTIONS[doc.href]}</p>
            <span className="docs-index-arrow">Read guide →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
