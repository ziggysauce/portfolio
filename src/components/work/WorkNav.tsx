"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/content/site";
import styles from "./work.module.css";

/** The reading pages' navigation. The museum link doesn't prefetch: reading a page never loads the hall. */
export function WorkNav() {
  const path = usePathname();
  const inWork = path === "/work" || path.startsWith("/work/");
  return (
    <nav aria-label="Main" className={styles.nav}>
      <Link href="/" prefetch={false}>
        Museum
      </Link>
      <Link href="/work" aria-current={inWork ? (path === "/work" ? "page" : "true") : undefined}>
        Selected work
      </Link>
      <Link href="/about" aria-current={path === "/about" ? "page" : undefined}>
        About
      </Link>
      <a href={site.resume} target="_blank" rel="noreferrer">
        Résumé<span className="sr-only"> (PDF, opens in a new tab)</span>
      </a>
      <Link href="/contact" aria-current={path === "/contact" ? "page" : undefined}>
        Contact
      </Link>
    </nav>
  );
}
