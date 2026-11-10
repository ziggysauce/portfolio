import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { AddedToast, CartDrawer } from "@/components/CartDrawer";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { site } from "@/content/site";
import "./globals.css";

// One variable font for the whole site. Weight carries the hierarchy, from
// 400 for reading to 800 for the hero.
const onest = Onest({ subsets: ["latin"], variable: "--font-onest" });

const title = `${site.name}: ${site.tagline}`;

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

export const viewport: Viewport = { themeColor: "#ffffff", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth" // Smooth for #anchors, instant between pages.
      className={onest.variable}
    >
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <AddedToast />
        <BottomNav />
        <CartDrawer />
      </body>
    </html>
  );
}
