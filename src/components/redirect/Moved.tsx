import Link from "next/link";
import styles from "@/components/work/work.module.css";

/**
 * A page that has moved, for a static host with no server redirects: an inline script sends the visitor
 * on before anything renders (keeping the URL's #fragment when asked, so /museum#case-003 still lands on
 * case 003), with a plain link for anyone without JavaScript. Use inside the reading shell.
 */
export function Moved({ to, keepHash = false, label }: { to: string; keepHash?: boolean; label: string }) {
  const target = JSON.stringify(to);
  const script = keepHash ? `location.replace(${target} + location.hash);` : `location.replace(${target});`;
  return (
    <div className={styles.plain}>
      <script dangerouslySetInnerHTML={{ __html: script }} />
      <header className={styles.indexHead}>
        <p className={styles.eyebrow}>This room has moved</p>
        <h1 className={styles.pageTitle}>{label}</h1>
        <p className={styles.lede}>
          <Link href={to} prefetch={false}>
            Continue to {label}
          </Link>
        </p>
      </header>
    </div>
  );
}

/** Metadata for a moved page: not indexed, pointing search engines at its new address. */
export function movedMetadata(to: string, title: string) {
  return { title, robots: { index: false, follow: true }, alternates: { canonical: to } };
}
