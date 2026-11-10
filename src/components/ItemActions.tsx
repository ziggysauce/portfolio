"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Item } from "@/content/catalog";
import { canGoBack } from "@/lib/nav";
import { addToOrder, removeFromOrder, useOrderSlugs } from "@/lib/order";
import { Icon } from "./Icon";

export function BackLink() {
  const router = useRouter();
  return (
    <Link
      href="/"
      aria-label="Back"
      className="-ml-2 grid size-11 place-items-center rounded-full transition-colors hover:bg-white"
      onClick={(event) => {
        if (canGoBack()) {
          event.preventDefault();
          router.back();
        }
      }}
    >
      <Icon name="back" size={28} />
    </Link>
  );
}

export function ShareButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      // Cancelling the share sheet rejects, and that's not an error worth showing.
      await navigator.share({ title: name, url }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked. The address bar still has the link.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span aria-live="polite" className={copied ? "rounded-full bg-mint px-3 py-1 text-[13px] font-semibold text-brand-strong" : "sr-only"}>
        {copied ? "Link copied" : ""}
      </span>
      <button
        type="button"
        onClick={share}
        aria-label={`Share ${name}`}
        className="-mr-2 grid size-11 place-items-center rounded-full transition-colors hover:bg-white"
      >
        <Icon name="share" size={22} />
      </button>
    </div>
  );
}

export function AddToOrder({ item }: { item: Item }) {
  const inOrder = useOrderSlugs().includes(item.slug);

  return (
    // Full width on phones; inline with the project links from tablet up.
    <div className="md:inline-block md:align-middle">
      {item.soon ? (
        <Link href="/checkout" className="btn btn-primary w-full md:w-auto">
          Ask about it at checkout
          <Icon name="arrowRight" size={18} />
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => (inOrder ? removeFromOrder(item.slug) : addToOrder(item.slug))}
          className={`btn w-full md:w-auto ${inOrder ? "btn-outline" : "btn-primary"}`}
        >
          <Icon name={inOrder ? "check" : "plus"} size={18} />
          {inOrder ? "Remove from order" : "Add to order"}
        </button>
      )}
    </div>
  );
}
