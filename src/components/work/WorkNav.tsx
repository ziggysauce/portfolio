"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/content/site";
import styles from "./work.module.css";

/** The case-study pages' navigation. Museum links don't prefetch: reading a study never loads the hall. */
export function WorkNav() {
  const path = usePathname();
  const inWork = path === "/work" || path.startsWith("/work/");
  return (
    <nav aria-label="Main" className={styles.nav}>
      <Link href="/museum" prefetch={false}>
        Museum
      </Link>
      <Link href="/work" aria-current={inWork ? (path === "/work" ? "page" : "true") : undefined}>
        Selected work
      </Link>
      <Link href="/about">About</Link>
      <a href={site.resume} target="_blank" rel="noreferrer">
        Résumé<span className="sr-only"> (PDF, opens in a new tab)</span>
      </a>
      <Link href="/contact">Contact</Link>
    </nav>
  );
}
