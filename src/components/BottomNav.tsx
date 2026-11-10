"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentFor, destinations } from "@/lib/nav";
import { Icon } from "./Icon";

/** Phones only. Desktop has the same four links in the header. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex h-[var(--bar-h)] max-w-md items-stretch px-2">
        {destinations.map((link) => (
          <li key={link.href} className="flex flex-1">
            <Link href={link.href} aria-current={currentFor(link.href, pathname)} className="tab-link">
              <span className="tab-icon">
                <Icon name={link.icon} size={22} />
              </span>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
