import Link from "next/link";
import { site } from "@/content/site";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line pb-[calc(var(--bar-h)+env(safe-area-inset-bottom)+32px)] pt-10">
      <div className="page flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-2xl">{site.wordmark}</p>
          <p className="mt-2 max-w-sm text-sm text-muted">
            A portfolio, not a real store. Nothing here ships except software.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <li>
            <a className="underline underline-offset-4" href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </li>
          <li>
            <a className="underline underline-offset-4" href={site.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </li>
          <li>
            <a className="underline underline-offset-4" href={site.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </li>
          <li>
            <a className="underline underline-offset-4" href={site.resume} target="_blank" rel="noreferrer">
              Résumé
            </a>
          </li>
          <li>
            <Link className="underline underline-offset-4" href="/contact">
              Contact
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
