import Link from "next/link";
import { WorkNav } from "@/components/work/WorkNav";
import styles from "@/components/work/work.module.css";
import { hall } from "@/content/exhibits";
import { site } from "@/content/site";
import { mono, serif } from "@/lib/fonts";

// The museum's reading pages (Selected work and each study, About, Contact, the 404): the museum's ivory, ink
// and bronze as a plain page. Nothing from the 3D hall loads here, and links back to the hall don't prefetch
// it, so a page reads the same whether or not the visitor has been to the museum.
export function ReadingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${serif.variable} ${mono.variable} ${styles.root}`}>
      <header className={styles.masthead}>
        <Link href="/" prefetch={false} className={styles.brand}>
          <span className={styles.brandName}>{site.name}</span>
          <span className={styles.brandHall}>{hall.name.replace(/^The Daniel Nguyen /, "")}</span>
        </Link>
        <WorkNav />
      </header>
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p>
          {site.name} · <Link href="/contact">Get in touch</Link>
        </p>
      </footer>
    </div>
  );
}
