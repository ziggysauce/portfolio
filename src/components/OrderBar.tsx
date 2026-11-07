"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getItem } from "@/content/catalog";
import { site } from "@/content/site";
import { toastStore, useOrderSlugs } from "@/lib/order";
import { Icon, PinIcon } from "./Icon";
import { ProductArt } from "./ProductArt";

export function OrderBar() {
  const count = useOrderSlugs().length;
  if (usePathname() === "/checkout") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 rounded-t-2xl bg-board pb-[env(safe-area-inset-bottom)] text-white">
      <div className="page flex h-[var(--bar-h)] items-center justify-between gap-3">
        <Link href="/about#history" className="flex min-w-0 items-center gap-3 rounded-sm">
          <PinIcon />
          <span className="min-w-0">
            <span className="block truncate text-xs text-board-muted">{site.replyTime}</span>
            <span className="flex items-center gap-1.5 text-[15px]">
              {site.location} <Icon name="arrowDown" size={16} />
            </span>
          </span>
        </Link>
        <Link
          href="/checkout"
          className="flex shrink-0 items-center gap-3 rounded-full bg-[#2b2b2b] py-2 pl-5 pr-2 text-[15px] transition-colors hover:bg-[#3d3d3d]"
        >
          Your Order
          <span
            className={`grid size-8 place-items-center rounded-full text-sm ${
              count > 0 ? "bg-white text-ink" : "bg-[#6b6b6b] text-white"
            }`}
          >
            {count}
          </span>
          <span className="sr-only">{count === 1 ? "item" : "items"}</span>
        </Link>
      </div>
    </div>
  );
}

export function AddedToast() {
  const toast = toastStore.use();
  const pathname = usePathname();
  const item = toast ? getItem(toast.slug) : undefined;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => toastStore.set(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const show = item && pathname !== "/checkout";

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--bar-h)+env(safe-area-inset-bottom)+72px)] z-30 md:bottom-[calc(var(--bar-h)+16px)] md:left-auto md:right-8 md:w-[380px]"
    >
      {show ? (
        <div key={toast?.id} className="toast-in pointer-events-auto flex items-center gap-3 rounded-xl bg-board p-3 text-white shadow-lg">
          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-tile">
            <ProductArt art={item.art} sizes="64px" />
          </div>
          <p className="min-w-0 flex-1 truncate text-[15px]">
            <span className="sr-only">{item.name}: </span>
            Added to Order
          </p>
          <Link href="/checkout" className="label-caps shrink-0 rounded-sm px-2 py-1 underline-offset-4 hover:underline">
            Checkout
          </Link>
        </div>
      ) : null}
    </div>
  );
}
