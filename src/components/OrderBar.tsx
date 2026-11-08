"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getItem } from "@/content/catalog";
import { site } from "@/content/site";
import { toastStore, useOrderSlugs } from "@/lib/order";
import { Icon, PinIcon } from "./Icon";

export function OrderBar() {
  const count = useOrderSlugs().length;
  if (usePathname() === "/checkout") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="page flex h-[var(--bar-h)] items-center justify-between gap-3">
        <Link href="/about#history" className="flex min-w-0 items-center gap-2.5 rounded-sm">
          <PinIcon size={22} className="shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] leading-snug text-muted">{site.replyTime}</span>
            <span className="flex items-center gap-1 text-[15px] font-medium leading-snug">
              {site.location} <Icon name="arrowDown" size={14} />
            </span>
          </span>
        </Link>
        <Link href="/checkout" className="btn btn-primary shrink-0 gap-3 py-2 pl-5 pr-2">
          Your order
          <span
            className={`grid size-8 place-items-center rounded-full text-sm ${count > 0 ? "bg-white text-ink" : "bg-[#4a4640] text-white"}`}
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
        <div key={toast?.id} className="toast-in pointer-events-auto flex items-center gap-3 rounded-xl bg-ink py-3 pl-4 pr-3 text-white shadow-lg">
          <Icon name="check" size={20} className="shrink-0" />
          <p className="min-w-0 flex-1 truncate text-[15px]">
            <span className="sr-only">{item.name}: </span>
            Added to order
          </p>
          <Link href="/checkout" className="shrink-0 rounded-sm px-2 py-1 text-[15px] font-medium underline underline-offset-4">
            Checkout
          </Link>
        </div>
      ) : item ? (
        <p className="sr-only">{item.name} added to your order</p>
      ) : null}
    </div>
  );
}
