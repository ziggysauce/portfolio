"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { site } from "@/content/site";
import { noteView } from "@/lib/nav";
import { useOrderSlugs } from "@/lib/order";
import { Icon } from "./Icon";

const nav = [
  { label: "Menu", href: "/" },
  { label: "Profile", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  const count = useOrderSlugs().length;
  const pathname = usePathname();
  const menu = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    noteView();
    menu.current?.close();
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 bg-white">
      <div className="page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="-ml-2 grid size-11 place-items-center md:hidden"
            aria-label="Open menu"
            aria-haspopup="dialog"
            onClick={() => menu.current?.showModal()}
          >
            <Icon name="menu" size={28} />
          </button>
          <Link href="/" aria-label={`${site.wordmark} ${site.name}, home`} className="font-display text-[26px] font-medium tracking-tight">
            {site.wordmark}
          </Link>
        </div>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {nav.map((link) => (
            <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className="nav-link">
              {link.label}
            </Link>
          ))}
          <a href={site.resume} target="_blank" rel="noreferrer" className="nav-link">
            Résumé
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/contact" className="nav-link md:hidden">
            Contact
          </Link>
          <Link
            href="/checkout"
            aria-label={`Your order, ${count} ${count === 1 ? "item" : "items"}`}
            className="relative -mr-2 grid size-11 place-items-center"
          >
            <Icon name="bag" size={28} />
            {count > 0 ? (
              <span
                aria-hidden="true"
                className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] font-medium text-white"
              >
                {count}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      <dialog ref={menu} aria-label="Site menu" className="site-menu">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-5xl">{site.firstName}</p>
            <p className="mt-2 text-sm text-muted">{site.location}</p>
          </div>
          <button
            type="button"
            className="-mr-2 grid size-11 place-items-center"
            aria-label="Close menu"
            onClick={() => menu.current?.close()}
          >
            <Icon name="close" size={28} />
          </button>
        </div>
        <ul className="mt-14 space-y-5 font-display text-[40px] leading-tight">
          <li>
            <Link href="/" onClick={() => menu.current?.close()}>
              Menu
            </Link>
          </li>
          <li>
            <Link href="/about" onClick={() => menu.current?.close()}>
              Profile
            </Link>
          </li>
          <li>
            <Link href="/about#history" onClick={() => menu.current?.close()}>
              Order History
            </Link>
            <p className="font-sans text-sm text-muted">My work history</p>
          </li>
          <li>
            <a href={site.resume} target="_blank" rel="noreferrer">
              Résumé
            </a>
          </li>
          <li>
            <Link href="/contact" onClick={() => menu.current?.close()}>
              Contact
            </Link>
          </li>
          <li>
            <a href={site.linkedin} target="_blank" rel="noreferrer" className="text-link">
              LinkedIn
            </a>
          </li>
        </ul>
      </dialog>
    </header>
  );
}
