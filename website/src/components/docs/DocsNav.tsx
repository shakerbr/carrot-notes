"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_NAV, isDocsNavActive } from "@/lib/docs-nav";

export default function DocsNav() {
  const pathname = usePathname();

  return (
    <nav className="docs-nav" aria-label="Documentation">
      <p className="docs-nav-label">Documentation</p>
      <ul className="docs-nav-list">
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
      <p className="docs-nav-back">
        <Link href="/">← Back to site</Link>
      </p>
    </nav>
  );
}
