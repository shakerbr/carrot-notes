export const DOCS_NAV = [
  { href: "/docs", label: "Overview", exact: true },
  { href: "/docs/install", label: "Install" },
  { href: "/docs/cloud-sync", label: "Cloud sync API" },
] as const;

export function isDocsNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
