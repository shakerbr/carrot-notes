import DocsNav from "@/components/docs/DocsNav";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs-layout">
      <div className="container docs-shell">
        <aside className="docs-sidebar">
          <DocsNav />
        </aside>
        <div className="docs-content">{children}</div>
      </div>
    </div>
  );
}
