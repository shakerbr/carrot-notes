"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/config";
import { DOCS_NAV, isDocsNavActive } from "@/lib/docs-nav";
import ThemeToggle from "@/components/ThemeToggle";

const MOBILE_LINKS: Array<
  | { href: string; label: string; external?: false }
  | { href: string; label: string; external: true }
> = [
  { href: "/#features", label: "Features" },
  { href: "/#screenshots", label: "Screenshots" },
  { href: "/changelog", label: "Changelog" },
  { href: SITE.github, label: "GitHub", external: true },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    if (path === "/docs") return pathname.startsWith("/docs");
    return pathname.startsWith(path);
  };

  return (
    <header className="header">
      <div className="container navbar">
        <div className="navbar-bar">
          <Link href="/" className="logo" onClick={closeMenu}>
            <img
              src="/assets/svg/carrots/carrot-color.svg"
              alt=""
              className="logo-icon"
              width={32}
              height={32}
            />
            <span className="logo-text">{SITE.name}</span>
          </Link>

          <div className="navbar-bar-end">
            <ThemeToggle className="nav-theme-mobile" />
            <button
              className={`menu-toggle${menuOpen ? " is-active" : ""}`}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="menu-toggle-bars" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>

          <ul className="nav-links">
            <li>
              <Link href="/#features">Features</Link>
            </li>
            <li>
              <Link href="/#screenshots">Screenshots</Link>
            </li>
            <li className={`nav-item-dropdown${isActive("/docs") ? " is-active" : ""}`}>
              <Link href="/docs" className={isActive("/docs") ? "active" : ""}>
                Docs
              </Link>
              <ul className="nav-dropdown" aria-label="Documentation pages">
                {DOCS_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={
                        isDocsNavActive(pathname, item.href, "exact" in item ? item.exact : false)
                          ? "active"
                          : undefined
                      }
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li>
              <Link href="/changelog" className={isActive("/changelog") ? "active" : ""}>
                Changelog
              </Link>
            </li>
            <li>
              <a href={SITE.github} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
          </ul>

          <div className="nav-actions">
            <ThemeToggle className="nav-theme-desktop" />
            <a
              href={SITE.releasesLatest}
              className="btn btn-secondary btn-sm nav-download"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
            <a
              href={SITE.releasesLatest}
              className="btn btn-primary btn-sm nav-get"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="nav-get-full">Get {SITE.versionTag}</span>
              <span className="nav-get-short">{SITE.versionTag}</span>
            </a>
          </div>
        </div>

        <div
          className={`mobile-menu${menuOpen ? " is-open" : ""}`}
          aria-hidden={!menuOpen}
        >
          <div className="mobile-menu-panel">
            <ul className="mobile-menu-links">
              {MOBILE_LINKS.map((item) => (
                <li key={item.href}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeMenu}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} onClick={closeMenu}>
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            <div className="mobile-menu-docs">
              <p className="mobile-menu-docs-label">Docs</p>
              <ul className="mobile-menu-docs-links">
                {DOCS_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      className={
                        isDocsNavActive(pathname, item.href, "exact" in item ? item.exact : false)
                          ? "active"
                          : undefined
                      }
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mobile-menu-divider" />
            <div className="mobile-menu-actions">
              <a
                href={SITE.releasesLatest}
                className="btn btn-secondary btn-sm"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
              >
                Download
              </a>
              <a
                href={SITE.releasesLatest}
                className="btn btn-primary btn-sm"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
              >
                Get {SITE.versionTag}
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
