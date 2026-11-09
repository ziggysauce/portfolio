"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { categories, categoryOrder, itemsIn, menuCardsIn, search, signature } from "@/content/catalog";
import { intro, lenses, site } from "@/content/site";
import { lensStore } from "@/lib/order";
import { Icon } from "./Icon";
import { MenuGrid } from "./MenuItem";
import { SignatureCard } from "./SignatureCard";

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

function Opening() {
  return (
    <section className="page pb-2 pt-6 md:pt-12">
      <p className="text-[16px] font-medium">{site.name}</p>
      <h1 className="mt-1 max-w-3xl font-display text-[40px] font-normal leading-[1.08] md:text-[56px]">{site.headline}</h1>
      <p className="mt-4 max-w-2xl text-[19px] leading-snug md:text-[21px]">{intro.role}</p>
      <p className="mt-1 max-w-2xl text-[17px] leading-relaxed text-muted">{intro.current}</p>

      <ul className="mt-5 flex flex-col gap-2 sm:flex-row sm:gap-8">
        {intro.facts.map((fact) => (
          <li key={fact.value} className="text-[15px] leading-snug">
            <span className="font-display text-[22px] font-medium">{fact.value}</span> <span className="text-muted">{fact.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/contact" className="btn btn-primary">
          Contact me
        </Link>
        <a href={site.resume} target="_blank" rel="noreferrer" className="btn btn-outline">
          Résumé (PDF)
        </a>
      </div>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
        {intro.howItWorks} Or{" "}
        <Link href="/contact" className="text-ink underline underline-offset-4">
          skip the line
        </Link>{" "}
        and write to me directly.
      </p>
    </section>
  );
}

function SignatureWork() {
  const alsoAtGoTab = itemsIn("case-studies").filter((item) => !signature.includes(item.slug));
  return (
    <section id="work" aria-labelledby="work-title" className="page mt-12 scroll-mt-20">
      <h2 id="work-title" className="section-title">
        Signature work at GoTab
      </h2>
      <p className="mt-1 text-[15px] text-muted">Three projects I&rsquo;d point to first.</p>
      <ol className="mt-5 grid gap-3 md:gap-4 lg:grid-cols-3">
        {signature.map((slug) => (
          <li key={slug} className="flex">
            <SignatureCard slug={slug} />
          </li>
        ))}
      </ol>
      {alsoAtGoTab.length ? (
        <div className="mt-6">
          <h3 className="text-[15px] font-medium">Also at GoTab</h3>
          <MenuGrid items={alsoAtGoTab} className="mt-3" />
        </div>
      ) : null}
    </section>
  );
}

/** Product / Engineering / Everything. Native radios, so arrow keys and the checked state come for free. */
function ExploreSwitch() {
  const lens = lensStore.use();
  const activeLens = lenses.find((candidate) => candidate.id === lens) ?? lenses[0];
  return (
    <fieldset aria-describedby="lens-note">
      <legend className="section-title">Explore my work</legend>
      <div className="segmented mt-4">
        {lenses.map((option) => (
          <label key={option.id}>
            <input
              type="radio"
              name="lens"
              value={option.id}
              checked={lens === option.id}
              onChange={() => lensStore.set(option.id)}
              className="sr-only"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <p id="lens-note" className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
        {activeLens.note}
      </p>
    </fieldset>
  );
}

export function Storefront() {
  const lens = lensStore.use();
  const [query, setQuery] = useState("");
  const results = search(query);
  const searching = query.trim().length > 0;
  const sections = categoryOrder[lens].map((id) => categories.find((category) => category.id === id)!);
  const active = useActiveSection(sections.map((section) => section.id).join(" "));
  const tabs = useRef<HTMLUListElement>(null);

  // Keep the current tab in view when the row scrolls sideways on a phone.
  useEffect(() => {
    const list = tabs.current;
    const tab = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (list && tab) list.scrollTo({ left: tab.offsetLeft - 16 });
  }, [active]);

  return (
    <>
      <Opening />
      <SignatureWork />

      <div id="menu" className="page mt-16 flex scroll-mt-20 flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <ExploreSwitch />
        {/* Lines up with the switch: the legend is 34px tall plus 16px of margin. */}
        <div className="relative md:mt-[50px] md:w-[340px]">
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
            {results.length} {results.length === 1 ? "result" : "results"} for &ldquo;{query.trim()}&rdquo;
          </p>
          {results.length ? (
            <div className="mt-4">
              <MenuGrid items={results} />
            </div>
          ) : (
            <p className="mt-4 max-w-md">
              Not on the menu. Ask me about it in your note at{" "}
              <Link href="/checkout" className="underline underline-offset-4">
                checkout
              </Link>
              .
            </p>
          )}
        </section>
      ) : (
        <>
          <nav aria-label="Menu sections" className="menu-tabs mt-6">
            <ul ref={tabs} className="page no-scrollbar relative flex gap-6 overflow-x-auto">
              {sections.map((section) => (
                <li key={section.id} className="shrink-0">
                  <a href={`#${section.id}`} aria-current={active === section.id ? "true" : undefined} className="menu-tab">
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className={`page ${index === 0 ? "mt-8" : "mt-12"}`}
            >
              <h2 id={`${section.id}-title`} className="section-title">
                {section.title}
              </h2>
              <p className="mt-1 text-[15px] text-muted">{section.note}</p>
              <div className="mt-5">
                <MenuGrid items={menuCardsIn(section.id)} />
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}
