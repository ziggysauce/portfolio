"use client";

import Link from "next/link";
import type { Item } from "@/content/catalog";
import { addToOrder, removeFromOrder, useOrderSlugs } from "@/lib/order";
import { Icon } from "./Icon";
import { Price } from "./Price";
import { ProductArt } from "./ProductArt";

export function QuickAdd({ item }: { item: Item }) {
  const inOrder = useOrderSlugs().includes(item.slug);
  return (
    <button
      type="button"
      onClick={() => (inOrder ? removeFromOrder(item.slug) : addToOrder(item.slug))}
      aria-label={`${inOrder ? "Remove" : "Add"} ${item.name} ${inOrder ? "from" : "to"} your order`}
      className={`absolute right-2 top-2 grid size-9 place-items-center rounded-full transition-colors ${
        inOrder ? "bg-ink text-white" : "bg-white text-ink hover:bg-ink hover:text-white"
      }`}
    >
      <Icon name={inOrder ? "check" : "plus"} size={18} />
    </button>
  );
}

export function ProductCard({ item }: { item: Item }) {
  return (
    <article className="relative w-[42vw] min-w-[150px] max-w-[230px] shrink-0 snap-start md:w-auto md:max-w-none">
      <Link href={`/item/${item.slug}`} className="group block rounded-sm">
        <div className="relative aspect-[4/3] overflow-hidden bg-tile">
          <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <ProductArt art={item.art} />
          </div>
          {item.badge ? <span className="badge absolute left-2 top-2">{item.badge}</span> : null}
        </div>
        <h3 className="mt-3 text-[15px] leading-snug group-hover:underline">{item.name}</h3>
        <Price price={item.price} className="mt-1.5 block" />
      </Link>
      {item.soon ? null : <QuickAdd item={item} />}
    </article>
  );
}

export function Shelf({ items, label }: { items: Item[]; label: string }) {
  return (
    <div
      aria-label={label}
      role="group"
      className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3.5 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:gap-x-5 md:gap-y-8 md:overflow-visible md:px-0 lg:grid-cols-5 xl:grid-cols-6"
    >
      {items.map((item) => (
        <ProductCard key={item.slug} item={item} />
      ))}
    </div>
  );
}
