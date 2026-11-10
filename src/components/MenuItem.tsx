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
      data-selected={inOrder}
      className={`quick-add z-10 ${className}`}
    >
      <Icon name={inOrder ? "check" : "plus"} size={20} />
    </button>
  );
}

/** The name links to the item, and its ::after covers the card so the whole card opens it. */
export function NameLink({ item }: { item: Item }) {
  return (
    <Link
      href={`/item/${item.slug}`}
      className="underline-offset-4 after:absolute after:inset-0 after:z-[1] after:rounded-card group-hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
    >
      {item.name}
    </Link>
  );
}

function Grouped({ item }: { item: Item }) {
  const grouped = groupedWith(item.slug);
  return grouped.length ? <p className="mt-0.5 text-[14px] text-muted">Also: {grouped.map((other) => other.name).join(", ")}</p> : null;
}

/** Projects: led by a real screenshot when there is one, then the description, a result and the meta row. */
function ProjectCard({ item }: { item: Item }) {
  const result = item.results?.points[0];
  return (
    <article className="card card-link group flex flex-col overflow-hidden">
      {item.image ? (
        <div className="relative aspect-[2/1] border-b border-line bg-canvas">
          <Image src={item.image.src} alt={item.image.alt} fill sizes="(min-width: 768px) 560px, 100vw" className="object-cover object-top" />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pt-1.5">
            <h3 className="text-[18px] font-bold leading-snug">
              <NameLink item={item} />
            </h3>
            <Grouped item={item} />
          </div>
          {item.soon ? null : <QuickAdd item={item} className="relative shrink-0" />}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-muted">{item.blurb}</p>
        {result ? <ResultLine text={result} className="mt-2" /> : null}
        <ItemMeta item={item} className="mt-auto pt-4" />
      </div>
    </article>
  );
}

/** Skills, "Also at GoTab", search results and suggestions: the name, what rides with it, and the meta row. */
function CompactCard({ item }: { item: Item }) {
  return (
    <article className="card card-link group flex items-center gap-3 p-4">
      {item.image ? (
        <span className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas">
          <Image src={item.image.src} alt="" fill sizes="48px" className="object-cover object-top" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h3 className="text-[16px] font-semibold leading-snug">
          <NameLink item={item} />
        </h3>
        <Grouped item={item} />
        <ItemMeta item={item} className="mt-1.5" />
      </div>
      {item.soon ? null : <QuickAdd item={item} className="relative shrink-0" />}
    </article>
  );
}

const layouts = {
  project: { Card: ProjectCard, grid: "grid gap-4 md:grid-cols-2" },
  compact: { Card: CompactCard, grid: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" },
};

export type MenuVariant = keyof typeof layouts;

export function MenuGrid({ items, variant = "compact", className = "" }: { items: Item[]; variant?: MenuVariant; className?: string }) {
  const { Card, grid } = layouts[variant];
  return (
    <div className={`${grid} ${className}`}>
      {items.map((item) => (
        <Card key={item.slug} item={item} />
      ))}
    </div>
  );
}
