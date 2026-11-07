"use client";

import Link from "next/link";
import { useState } from "react";
import { categories, categoryOrder, featured, itemsIn, requireItem, search } from "@/content/catalog";
import { lenses, site } from "@/content/site";
import { lensStore, REWARD_AT, REWARD_TEXT, useOrderSlugs } from "@/lib/order";
import { Icon } from "./Icon";
import { ProductArt } from "./ProductArt";
import { ProductCard, Shelf } from "./ProductCard";

function rewardMessage(count: number) {
  if (count >= REWARD_AT) return `Unlocked: ${REWARD_TEXT.toLowerCase()}. Check out to claim it.`;
  const left = REWARD_AT - count;
  return `Add ${left} ${count ? "more " : ""}${left === 1 ? "item" : "items"} and the first coffee\u2019s on me.`;
}

function Rewards() {
  const count = Math.min(useOrderSlugs().length, REWARD_AT);
  const progress = (count / REWARD_AT) * 100;
  return (
    <section aria-label="Rewards" className="rounded-2xl border border-cream-line bg-cream px-5 py-4 md:px-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-[34px] leading-none">Rewards</h2>
        <p className="font-display text-[34px] leading-none">
          {count}
          <span className="text-base font-medium"> /{REWARD_AT}</span>
        </p>
      </div>
      <p className="mt-2 text-sm text-muted" aria-live="polite">
        {count >= REWARD_AT ? (
          <Link href="/checkout" className="text-ink underline underline-offset-4">
            {rewardMessage(count)}
          </Link>
        ) : (
          rewardMessage(count)
        )}
      </p>
      <div className="relative mb-1 mt-4 h-2.5 rounded-full bg-[#e2e0d6]">
        <div className="h-full rounded-full bg-gold transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className="absolute top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-300 motion-reduce:transition-none"
          style={{ left: `max(16px, min(${progress}%, 100% - 16px))` }}
        >
          <path
            fill="var(--color-gold)"
            d="M16 1l3 4.200 4.800-2 1 5.100 5.200.300-1.500 5 4 3.200-4.200 3 1.400 5-5.200.500-1.200 5-4.700-2.100L16 33l-3-4.100-4.700 2-1-5.100-5.300-.300 1.500-5-4-3.200 4.200-3-1.400-5 5.200-.500 1.200-5 4.700 2.100z"
            transform="translate(1.200 -.500) scale(.93)"
          />
          <text x="16" y="17" textAnchor="middle" dominantBaseline="central" fontSize="13" style={{ fontFamily: "var(--font-fat), serif" }}>
            d
          </text>
        </svg>
      </div>
    </section>
  );
}

function LetterBoard({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/about"
      className={`group flex flex-col justify-between rounded-2xl bg-board p-6 text-[#f6f2e7] md:p-8 ${className}`}
    >
      <span className="letterboard">
        <span>NOW</span>
        <span>SERVING</span>
        <span className="col-span-2">TECHNICAL PM</span>
        <span className="col-span-2">ENGINEERING</span>
      </span>
      <span className="mt-5 flex items-center justify-between">
        <span className="label-caps">See my profile</span>
        <Icon name="arrowRight" size={30} className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
      </span>
    </Link>
  );
}

export function Storefront() {
  const lens = lensStore.use();
  const [query, setQuery] = useState("");
  const results = search(query);
  const searching = query.trim().length > 0;
  const activeLens = lenses.find((candidate) => candidate.id === lens) ?? lenses[0];
  const aisles = categoryOrder[lens].map((id) => categories.find((category) => category.id === id)!);

  return (
    <>
      <section className="page grid gap-8 pb-7 pt-2 md:pt-10 lg:grid-cols-[1.15fr_1fr] lg:items-stretch lg:gap-14">
        <div className="lg:py-4">
          <p className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-open" />
            {site.status}
          </p>
          <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-tight md:text-[64px]">{site.name}</h1>
          <p className="mt-3 max-w-xl text-[16px] leading-relaxed md:text-[17px]">{activeLens.pitch}</p>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted md:text-sm">
            This portfolio works like an ordering app. Browse my skills and projects, add what fits your role, then check out to get in touch. In a hurry? Skip the line.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:flex">
            <a href="#menu" className="btn btn-primary px-3 sm:px-[26px]">
              Start an order
            </a>
            <Link href="/contact" className="btn btn-outline px-3 sm:px-[26px]">
              Skip the line
            </Link>
          </div>
        </div>
        <LetterBoard className="hidden lg:flex" />
      </section>

      <div id="menu" className="page scroll-mt-20 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-1">
          <div>
          <p id="lens-label" className="text-[13px] text-muted">
            Hiring for
          </p>
          <div role="group" aria-labelledby="lens-label" className="flex flex-wrap items-center gap-x-4 sm:gap-x-6">
            {lenses.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={lens === option.id}
                onClick={() => lensStore.set(option.id)}
                className={`lens-tab ${lens === option.id ? "text-ink" : "text-muted hover:text-ink"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          </div>
        </div>

        <div className="relative">
          <Icon name="search" size={22} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What are you looking for?"
            aria-label="Search the menu"
            className="h-14 w-full rounded-full border border-line bg-white pl-14 pr-5 text-[16px] placeholder:text-muted"
          />
        </div>
      </div>

      {searching ? (
        <section className="page mt-8" aria-label="Search results">
          <p role="status" className="text-sm text-muted">
            {results.length} {results.length === 1 ? "item" : "items"} for &ldquo;{query.trim()}&rdquo;
          </p>
          {results.length ? (
            <div className="mt-5 grid grid-cols-2 gap-x-3.5 gap-y-7 md:grid-cols-4 md:gap-x-5 lg:grid-cols-5 xl:grid-cols-6 [&>article]:w-auto [&>article]:max-w-none">
              {results.map((item) => (
                <ProductCard key={item.slug} item={item} />
              ))}
            </div>
          ) : (
            <p className="mt-4 max-w-md text-[15px]">
              Not on the menu yet. Add it to your special instructions at{" "}
              <Link href="/checkout" className="underline underline-offset-4">
                checkout
              </Link>{" "}
              and ask. The kitchen takes requests.
            </p>
          )}
        </section>
      ) : (
        <>
          <div className="page mt-5">
            <Rewards />
          </div>

          <nav aria-label="Menu sections" className="page mt-8">
            <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 md:mx-0 md:px-0">
              {aisles.map((aisle) => {
                const cover = itemsIn(aisle.id).find((item) => !("image" in item.art)) ?? itemsIn(aisle.id)[0];
                return (
                  <li key={aisle.id} className="w-[84px] shrink-0">
                    <a href={`#${aisle.id}`} className="group block rounded-sm text-center">
                      <span className="relative mx-auto block size-[72px] overflow-hidden rounded-full bg-tile">
                        <ProductArt art={cover.art} sizes="72px" />
                      </span>
                      <span className="mt-2 block text-xs leading-tight group-hover:underline">{aisle.title}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section aria-labelledby="start-here" className="page mt-10">
            <h2 id="start-here" className="aisle-title">
              Start Here
            </h2>
            <p className="mt-1 text-sm text-muted">Chef&rsquo;s picks for {activeLens.label === "Everything" ? "anyone hiring" : `${activeLens.label} roles`}</p>
            <div className="mt-5">
              <Shelf items={featured[lens].map(requireItem)} label="Start here" />
            </div>
          </section>

          <div className="page mt-10 lg:hidden">
            <LetterBoard />
          </div>

          {aisles.map((aisle) => (
            <section key={aisle.id} id={aisle.id} aria-labelledby={`${aisle.id}-title`} className="page mt-12 scroll-mt-20">
              <h2 id={`${aisle.id}-title`} className="aisle-title">
                {aisle.title}
              </h2>
              <p className="mt-1 text-sm text-muted">{aisle.note}</p>
              <div className="mt-5">
                <Shelf items={itemsIn(aisle.id)} label={aisle.title} />
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}
