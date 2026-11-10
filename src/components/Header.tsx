"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { site } from "@/content/site";
import { currentFor, destinations, noteView } from "@/lib/nav";
import { cartOpenStore, openCart, useOrderSlugs } from "@/lib/order";
import { Icon } from "./Icon";

export function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-brand font-bold text-white ${large ? "size-16 text-[22px] md:size-20 md:text-[26px]" : "size-8 text-[13px]"}`}
    >
      {site.initials}
    </span>
  );
}

function CartButton() {
  const count = useOrderSlugs().length;
  const open = cartOpenStore.use();
  return (
    <button
      type="button"
      id="cart-button"
      onClick={openCart}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="cart-drawer"
      className="inline-flex h-10 items-center gap-2 rounded-full bg-ink py-1 pl-4 pr-1.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2b302d]"
    >
      <Icon name="bag" size={18} />
      Cart
      <span className={`grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[13px] font-bold ${count ? "bg-white text-ink" : "bg-[#3a403c] text-white"}`}>
        {count}
      </span>
      <span className="sr-only">{count === 1 ? "item" : "items"}</span>
    </button>
  );
}

export function Header() {
  const pathname = usePathname();

  useEffect(() => {
    noteView();
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white">
      <div className="page flex h-[var(--header-h)] items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-full">
          <BrandMark />
          {/* Tablets need the room for the nav, so the name is visually hidden there but still names the link. */}
          <span className="truncate text-[16px] font-bold tracking-tight md:sr-only lg:not-sr-only">{site.name}</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {destinations.map((link) => (
            <Link key={link.href} href={link.href} aria-current={currentFor(link.href, pathname)} className="nav-link">
              {link.label}
            </Link>
          ))}
          <a href={site.resume} target="_blank" rel="noreferrer" className="nav-link">
            Résumé
            <Icon name="external" size={15} />
            <span className="sr-only">(PDF, opens in a new tab)</span>
          </a>
        </nav>

        <CartButton />
      </div>
    </header>
  );
}
