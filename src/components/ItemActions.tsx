"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Item } from "@/content/catalog";
import { canGoBack } from "@/lib/nav";
import { addToOrder, removeFromOrder, useOrderSlugs } from "@/lib/order";
import { Icon } from "./Icon";
import { Price } from "./Price";

export function BackLink() {
  const router = useRouter();
  return (
    <Link
      href="/"
      aria-label="Back"
      className="-ml-2 grid size-11 place-items-center"
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
    <div className="absolute bottom-4 right-4 flex items-center gap-2">
      <span aria-live="polite" className={copied ? "rounded-full bg-white px-3 py-1 text-xs" : "sr-only"}>
        {copied ? "Link copied" : ""}
      </span>
      <button
        type="button"
        onClick={share}
        aria-label={`Share ${name}`}
        className="grid size-12 place-items-center rounded-full bg-white transition-colors hover:bg-ink hover:text-white"
      >
        <Icon name="share" size={22} />
      </button>
    </div>
  );
}

export function AddToOrder({ item }: { item: Item }) {
  const inOrder = useOrderSlugs().includes(item.slug);

  return (
    // The white band keeps page text from showing between the button and the order bar.
    <div className="sticky bottom-[calc(var(--bar-h)+env(safe-area-inset-bottom)-16px)] z-10 -mx-4 mt-5 bg-white px-4 pb-7 pt-3 md:static md:mx-0 md:mt-8 md:px-0 md:pb-0 md:pt-0">
      {item.soon ? (
        <Link href="/checkout" className="btn btn-primary w-full justify-between">
          Ask about it at checkout
          <Icon name="arrowRight" size={20} />
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => (inOrder ? removeFromOrder(item.slug) : addToOrder(item.slug))}
          className={`btn w-full justify-between ${inOrder ? "btn-outline" : "btn-primary"}`}
        >
          {inOrder ? "Remove from order" : "Add to order"}
          {inOrder ? <Icon name="check" size={20} /> : <Price price={item.price} className="text-[17px] normal-case tracking-normal" />}
        </button>
      )}
    </div>
  );
}
