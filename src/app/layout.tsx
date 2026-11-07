import type { Metadata, Viewport } from "next";
import { Abril_Fatface, Big_Shoulders_Stencil, Outfit, Sora } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { AddedToast, OrderBar } from "@/components/OrderBar";
import { ArtDefs } from "@/components/ProductArt";
import { site } from "@/content/site";
import "./globals.css";

// Swap a font here and the whole site follows.
const heading = Outfit({ subsets: ["latin"], variable: "--font-heading", weight: ["400", "500"] });
const body = Sora({ subsets: ["latin"], variable: "--font-body", weight: ["300", "400"] });
const fat = Abril_Fatface({ subsets: ["latin"], variable: "--font-fat", weight: "400" });
const stencil = Big_Shoulders_Stencil({ subsets: ["latin"], variable: "--font-sten", weight: ["600", "700"] });

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
      className={`${heading.variable} ${body.variable} ${fat.variable} ${stencil.variable}`}
    >
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <ArtDefs />
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <AddedToast />
        <OrderBar />
      </body>
    </html>
  );
}
