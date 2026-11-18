import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

// The body face for the museum's labels and the reading pages (headings use Instrument Serif and IBM Plex
// Mono, from src/lib/fonts.ts).
const onest = Onest({ subsets: ["latin"], variable: "--font-onest" });

const title = site.name;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: title, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: {
    title,
    description: site.description,
    url: "/",
    siteName: site.name,
    type: "website",
    images: [site.ogImage],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#f6f0e2", viewportFit: "cover" }; // The reading pages' paper.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth" // Smooth for #anchors, instant between pages.
      className={onest.variable}
      suppressHydrationWarning // The homepage sets data-rail (the field guide's state) before React hydrates.
    >
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
