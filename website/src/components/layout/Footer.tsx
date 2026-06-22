import Link from "next/link";
import { SITE } from "@/lib/config";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="logo">
              <img
                src="/assets/svg/carrots/carrot-color.svg"
                alt=""
                className="footer-carrot"
                width={24}
                height={24}
              />
              <span>{SITE.name}</span>
            </Link>
            <p>
              Local-first sticky notes for Linux. Your notes, your machine, your
              rules.
            </p>
            <span className="footer-badge">Open source · {SITE.license}</span>
          </div>

          <div>
            <h4>Product</h4>
            <ul>
              <li>
                <Link href="/#features">Features</Link>
              </li>
              <li>
                <Link href="/changelog">Changelog</Link>
              </li>
              <li>
                <a href={SITE.releasesLatest} target="_blank" rel="noopener noreferrer">
                  Download {SITE.versionTag}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4>Docs</h4>
            <ul>
              <li>
                <Link href="/docs">Overview</Link>
              </li>
              <li>
                <Link href="/docs/install">Install</Link>
              </li>
              <li>
                <Link href="/docs/cloud-sync">Cloud sync API</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Resources</h4>
            <ul>
              <li>
                <a href={SITE.github} target="_blank" rel="noopener noreferrer">
                  Source code
                </a>
              </li>
              <li>
                <a href={`${SITE.github}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer">
                  Contributing
                </a>
              </li>
              <li>
                <a href={SITE.issues} target="_blank" rel="noopener noreferrer">
                  Issues
                </a>
              </li>
              <li>
                <a href={`${SITE.github}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">
                  License ({SITE.license})
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4>SpidraHub</h4>
            <ul>
              <li>
                <a href="https://spidrahub.com" target="_blank" rel="noopener noreferrer">
                  spidrahub.com
                </a>
              </li>
              <li>
                <a href="https://shaker.spidrahub.com" target="_blank" rel="noopener noreferrer">
                  shaker.spidrahub.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            {SITE.license} © {year}{" "}
            <a href="https://github.com/shakerbr" target="_blank" rel="noopener noreferrer">
              {SITE.author}
            </a>
          </span>
          <img
            src="/assets/svg/carrots/carrot-color.svg"
            alt="Carrot Notes"
            className="footer-carrot"
            width={24}
            height={24}
          />
        </div>
      </div>
    </footer>
  );
}
