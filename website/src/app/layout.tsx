import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ThemeScript from "@/components/ThemeScript";
import { SITE } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description:
    "Local-first desktop sticky notes for Linux. Rich WYSIWYG editing, Markdown on disk, floating windows, and optional self-hosted sync. Built with Tauri & Rust.",
  metadataBase: new URL(SITE.url),
  openGraph: {
    title: SITE.name,
    description: SITE.subtitle,
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
  },
  icons: {
    icon: "/assets/svg/carrots/carrot-color.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="stylesheet" href="/assets/css/main.css" />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
