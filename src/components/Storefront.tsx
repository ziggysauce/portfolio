"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { categories, categoryOrder, featured, itemsIn, requireItem, search } from "@/content/catalog";
import { lenses, site } from "@/content/site";
import { lensStore } from "@/lib/order";
import { Icon } from "./Icon";
import { MenuGrid } from "./MenuItem";

/** The section whose heading has scrolled up under the sticky tabs. */
function useActiveSection(idList: string) {
  const [active, setActive] = useState("");
  useEffect(() => {
    const ids = idList.split(" ");
    function update() {
      const line = 150; // Just below the header and the tabs.
      let current = ids[0];
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) current = id;
      }
      // A short last section can't scroll up to the line, so the page bottom selects it.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = ids[ids.length - 1];
      setActive(current);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [idList]);
  return active;
}

export function Storefront() {
  const lens = lensStore.use();
  const [query, setQuery] = useState("");
  const results = search(query);
  const searching = query.trim().length > 0;
  const activeLens = lenses.find((candidate) => candidate.id === lens) ?? lenses[0];
  const sections = categoryOrder[lens].map((id) => categories.find((category) => category.id === id)!);
  const active = useActiveSection(["popular", ...sections.map((section) => section.id)].join(" "));
  const tabs = useRef<HTMLUListElement>(null);

  // Keep the current tab in view when the row scrolls sideways on a phone.
  useEffect(() => {
    const list = tabs.current;
    const tab = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (list && tab) list.scrollTo({ left: tab.offsetLeft - 16 });
  }, [active]);

  return (
    <>
      <section className="page pb-2 pt-6 md:pt-12">
        <p className="text-[16px] font-medium">{site.name}</p>
        <h1 className="mt-1 max-w-3xl font-display text-[40px] font-normal leading-[1.08] md:text-[56px]">{site.headline}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[15px] text-muted">
          <span>{site.location}</span>
          <span aria-hidden="true">&middot;</span>
          <span>{site.replyTime}</span>
        </p>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed">{activeLens.pitch}</p>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          This portfolio works like an ordering app. Browse my skills and projects, add what interests you, then check out to get in touch. In a hurry? Skip the line.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:flex">
          <a href="#menu" className="btn btn-primary">
            Start an order
          </a>
          <Link href="/contact" className="btn btn-outline">
            Skip the line
          </Link>
        </div>
      </section>

      <div id="menu" className="page mt-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p id="lens-label" className="text-[15px] text-muted">
            Show me
          </p>
          <div role="group" aria-labelledby="lens-label" className="segmented">
            {lenses.map((option) => (
              <button key={option.id} type="button" aria-pressed={lens === option.id} onClick={() => lensStore.set(option.id)}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative md:w-[360px]">
          <Icon name="search" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the menu"
            aria-label="Search the menu"
            className="h-12 w-full rounded-full border border-control bg-white pl-11 pr-4 text-[16px] placeholder:text-muted"
          />
        </div>
      </div>

      {searching ? (
        <section className="page mt-8" aria-label="Search results">
          <p role="status" className="text-[15px] text-muted">
            {results.length} {results.length === 1 ? "item" : "items"} for &ldquo;{query.trim()}&rdquo;
          </p>
          {results.length ? (
            <div className="mt-4">
              <MenuGrid items={results} />
            </div>
          ) : (
            <p className="mt-4 max-w-md">
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
          <nav aria-label="Menu sections" className="menu-tabs mt-6">
            <ul ref={tabs} className="page no-scrollbar relative flex gap-6 overflow-x-auto">
              {[{ id: "popular", title: "Popular" }, ...sections].map((section) => (
                <li key={section.id} className="shrink-0">
                  <a href={`#${section.id}`} aria-current={active === section.id ? "true" : undefined} className="menu-tab">
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <section id="popular" aria-labelledby="popular-title" className="page mt-8">
            <h2 id="popular-title" className="section-title">
              Popular
            </h2>
            <p className="mt-1 text-[15px] text-muted">Chef&rsquo;s picks {activeLens.picks}</p>
            <div className="mt-5">
              <MenuGrid items={featured[lens].map(requireItem)} />
            </div>
          </section>

          {sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="page mt-12">
              <h2 id={`${section.id}-title`} className="section-title">
                {section.title}
              </h2>
              <p className="mt-1 text-[15px] text-muted">{section.note}</p>
              <div className="mt-5">
                <MenuGrid items={itemsIn(section.id)} />
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}
