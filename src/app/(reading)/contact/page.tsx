import type { Metadata } from "next";
import styles from "@/components/work/work.module.css";
import { site } from "@/content/site";

const description = `Contact ${site.name}: email, LinkedIn, GitHub and résumé.`;

export const metadata: Metadata = {
  title: "Contact",
  description,
  openGraph: { title: `Contact | ${site.name}`, description, url: "/contact", siteName: site.name, type: "website", images: [site.ogImage] },
};

const elsewhere = [
  { label: "LinkedIn", detail: "linkedin.com/in/dtn3423", href: site.linkedin },
  { label: "GitHub", detail: "github.com/ziggysauce", href: site.github },
  { label: "Résumé", detail: "PDF, one page", href: site.resume },
];

export default function ContactPage() {
  return (
    <div className={styles.plain}>
      <header className={styles.indexHead}>
        <p className={styles.eyebrow}>Contact</p>
        <h1 className={styles.pageTitle}>Get in touch</h1>
        <p className={styles.lede}>
          Email is the fastest way to reach me. {site.location} · {site.replyTime.toLowerCase().replace(/^replies/, "I reply")}.
        </p>
        <a href={`mailto:${site.email}`} className={styles.email}>
          {site.email}
        </a>
      </header>

      <section aria-labelledby="elsewhere-title">
        <h2 id="elsewhere-title" className={styles.plainTitle}>
          Elsewhere
        </h2>
        <ul className={styles.entries}>
          {elsewhere.map((link) => (
            <li key={link.label}>
              <a href={link.href} target="_blank" rel="noreferrer">
                {link.label}
                <span className="sr-only">{link.href.endsWith(".pdf") ? " (PDF, opens in a new tab)" : " (opens in a new tab)"}</span>
              </a>
              <span className={styles.entryMeta}>{link.detail}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
