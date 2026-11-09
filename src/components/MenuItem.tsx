"use client";

import Image from "next/image";
import Link from "next/link";
import { groupedWith, type Item } from "@/content/catalog";
import { addToOrder, removeFromOrder, useOrderSlugs } from "@/lib/order";
import { Icon } from "./Icon";
import { ItemMeta, ResultLine } from "./ItemMeta";

/** `className` must position it (relative or absolute) so it sits above the card's link. */
export function QuickAdd({ item, className }: { item: Item; className: string }) {
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

/** One dish on the menu: name, two lines of description, a result if there is one, the meta row, and a quick add. */
export function MenuItem({ item }: { item: Item }) {
  const grouped = groupedWith(item.slug);
  const result = item.results?.points[0];
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
        {grouped.length ? (
          <p className="mt-0.5 text-[14px] text-muted">Also: {grouped.map((other) => other.name).join(", ")}</p>
        ) : null}
        <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-muted">{item.blurb}</p>
        {result ? <ResultLine text={result} className="mt-2" /> : null}
        <ItemMeta item={item} className="mt-auto pt-3" />
      </div>

      {item.image ? (
        <div className="relative size-24 shrink-0 self-start sm:size-32">
          <div className="relative size-full overflow-hidden rounded-lg bg-tile">
            <Image src={item.image.src} alt={item.image.alt} fill sizes="128px" className="object-cover object-top" />
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
