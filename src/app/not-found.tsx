import type { Metadata } from "next";
import Link from "next/link";
import { ReadingShell } from "@/components/work/ReadingShell";
import styles from "@/components/work/work.module.css";

export const metadata: Metadata = { title: "Not on the map", robots: { index: false, follow: true } };

// Any unknown URL: a museum-styled 404 with the two ways back in.
export default function NotFound() {
  return (
    <ReadingShell>
      <div className={styles.plain}>
        <header className={styles.indexHead}>
          <p className={styles.eyebrow}>Error 404 · Room not found</p>
          <h1 className={styles.pageTitle}>This room isn’t on the map.</h1>
          <p className={styles.lede}>
            It may have moved when the museum rearranged its galleries, or it was never here. Everything on display is a short walk away.
          </p>
          <p className={styles.actions}>
            <Link href="/" prefetch={false}>
              Enter the hall
            </Link>
            <Link href="/work">Selected work</Link>
          </p>
        </header>
      </div>
    </ReadingShell>
  );
}
