import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { AddedToast, OrderBar } from "@/components/OrderBar";
import { site } from "@/content/site";
import "./globals.css";

// Swap a font here and the whole site follows. Fraunces for headings, like a
// restaurant's menu; Inter for everything you read and tap.
const heading = Fraunces({ subsets: ["latin"], variable: "--font-heading", weight: ["400", "500"] });
const body = Inter({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500"] });

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

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth" // Smooth for #anchors, instant between pages.
      className={`${heading.variable} ${body.variable}`}
    >
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <AddedToast />
        <OrderBar />
      </body>
    </html>
  );
}
