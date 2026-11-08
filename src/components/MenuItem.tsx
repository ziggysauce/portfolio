"use client";

import Image from "next/image";
import Link from "next/link";
import type { Item } from "@/content/catalog";
import { addToOrder, removeFromOrder, useOrderSlugs } from "@/lib/order";
import { Icon } from "./Icon";
import { Price } from "./Price";

/** `className` must position it (relative or absolute) so it sits above the card's link. */
function QuickAdd({ item, className }: { item: Item; className: string }) {
  const inOrder = useOrderSlugs().includes(item.slug);
  return (
    <button
      type="button"
      onClick={() => (inOrder ? removeFromOrder(item.slug) : addToOrder(item.slug))}
      aria-label={`${inOrder ? "Remove" : "Add"} ${item.name} ${inOrder ? "from" : "to"} your order`}
      className={`z-10 grid size-10 place-items-center rounded-full border transition-colors ${
        inOrder ? "border-ink bg-ink text-white" : "border-control bg-white text-ink hover:border-ink"
      } ${className}`}
    >
      <Icon name={inOrder ? "check" : "plus"} size={18} />
    </button>
  );
}

/** One dish on the menu: name, two lines of description, price, and a quick add. */
export function MenuItem({ item }: { item: Item }) {
  return (
    <article className="group relative flex gap-4 rounded-xl border border-line bg-white p-4 transition-colors hover:border-control">
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-[16px] font-medium leading-snug">
          {/* The link's ::after covers the card, photo included, so the whole row opens the item. */}
          <Link
            href={`/item/${item.slug}`}
            className="underline-offset-4 after:absolute after:inset-0 after:z-[1] after:rounded-xl group-hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-link"
          >
            {item.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-muted">{item.blurb}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-3">
          <Price price={item.price} />
          {item.badge ? <span className="tag">{item.badge}</span> : null}
        </div>
      </div>

      {item.image ? (
        <div className="relative size-24 shrink-0 self-start md:size-28">
          <div className="relative size-full overflow-hidden rounded-lg bg-tile">
            <Image src={item.image.src} alt="" fill sizes="112px" className="object-cover object-top" />
          </div>
          {item.soon ? null : <QuickAdd item={item} className="absolute bottom-1.5 right-1.5 shadow-sm" />}
        </div>
      ) : item.soon ? null : (
        <QuickAdd item={item} className="relative shrink-0 self-end" />
      )}
    </article>
  );
}

export function MenuGrid({ items, className = "" }: { items: Item[]; className?: string }) {
  return (
    <div className={`grid gap-3 md:grid-cols-2 md:gap-4 ${className}`}>
      {items.map((item) => (
        <MenuItem key={item.slug} item={item} />
      ))}
    </div>
  );
}
