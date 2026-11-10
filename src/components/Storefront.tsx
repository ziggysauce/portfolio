"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { categories, categoryOrder, itemsIn, menuCardsIn, search, signature, type CategoryId } from "@/content/catalog";
import { company, intro, lenses, roles, site } from "@/content/site";
import { lensStore } from "@/lib/order";
import { Icon, PinIcon } from "./Icon";
import { MenuGrid, type MenuVariant } from "./MenuItem";
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

/** "June 2021 to July 2026" becomes "2021–2026"; a current role ends in "now". */
function yearRange(dates: string) {
  const [start, end] = dates.match(/\d{4}/g) ?? [];
  return `${start}–${end ?? "now"}`;
}

/** The two résumé facts. Side by side in the hero text on smaller screens, stacked in the wide-screen card. */
function Facts({ stacked = false, className = "" }: { stacked?: boolean; className?: string }) {
  return (
    <ul className={`flex flex-col ${stacked ? "gap-3" : "gap-2 sm:flex-row sm:gap-8"} ${className}`}>
      {intro.facts.map((fact) => (
        <li key={fact.value} className="text-[15px] leading-snug">
          <span className="text-[22px] font-extrabold tracking-tight">{fact.value}</span> <span className="opacity-90">{fact.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** The hero's right side on wide screens: the résumé facts, then the path from developer to director, newest first. */
function CareerPath() {
  return (
    <div className="hidden rounded-[20px] bg-brand-strong p-6 lg:block">
      <Facts stacked />
      <ol aria-label={`Roles at ${company.name}`} className="mt-6 border-t border-white/25 pt-5">
        {roles.map((role, index) => (
          <li key={role.id} className="relative flex gap-4 pb-5 last:pb-0">
            {index < roles.length - 1 ? <span aria-hidden="true" className="absolute bottom-0 left-[7px] top-6 w-px bg-white/35" /> : null}
            <span
              aria-hidden="true"
              className={`relative mt-1 size-4 shrink-0 rounded-full border-2 ${role.current ? "border-mint bg-mint" : "border-white/80 bg-brand-strong"}`}
            />
            <div>
              <p className="font-semibold leading-snug">{role.title}</p>
              <p className="mt-0.5 text-[14px] text-white/85">
                {yearRange(role.dates)}
                {role.current ? <span className="ml-2 rounded-full bg-mint px-2 py-0.5 text-[12px] font-bold text-brand-strong">Now</span> : null}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/orders" className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold underline underline-offset-4">
        Work history <Icon name="arrowRight" size={16} />
      </Link>
    </div>
  );
}

function Opening() {
  return (
    <section aria-labelledby="hero-title" className="page pt-4 md:pt-8">
      <div className="rounded-panel bg-brand text-white [--focus:#fff]">
        <div className="grid gap-10 px-5 py-7 sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] lg:items-center lg:px-14 lg:py-14">
          <div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-medium text-white/90">
              <span>{site.name}</span>
              <span aria-hidden="true">&middot;</span>
              <span className="inline-flex items-center gap-1">
                <PinIcon size={15} className="shrink-0" />
                {site.location}
              </span>
            </p>
            <h1 id="hero-title" className="display mt-4 text-[38px] sm:text-[54px] xl:text-[66px]">
              {site.headline}
            </h1>
            <p className="mt-5 max-w-xl text-[19px] font-semibold leading-snug md:text-[21px]">{intro.role}</p>
            <p className="mt-1 max-w-xl text-[17px] leading-relaxed text-white/90">{intro.current}</p>
            <Facts className="mt-5 lg:hidden" />

            {/* Side by side even at 320px: the padding tightens on phones. */}
            <div className="mt-7 grid grid-cols-2 gap-3 sm:flex">
              <Link href="/contact" className="btn btn-on-brand px-3 sm:px-[22px]">
                Contact me
              </Link>
              <a href={site.resume} target="_blank" rel="noreferrer" className="btn btn-ghost-on-brand gap-1.5 px-3 sm:px-[22px]">
                Résumé (PDF)
                <Icon name="external" size={16} />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/90">
              {intro.howItWorks} Or{" "}
              <Link href="/contact" className="font-semibold text-white underline underline-offset-4">
                skip the line
              </Link>{" "}
              and write to me directly.
            </p>
          </div>
          <CareerPath />
        </div>
      </div>
    </section>
  );
}

/** GoTab work sits on a mint band: it's the reason for the whole concept. */
function SignatureWork() {
  const alsoAtGoTab = itemsIn("case-studies").filter((item) => !signature.includes(item.slug));
  return (
    <div className="mt-12 border-y border-[#d5eadc] bg-mint-soft py-10">
      <section id="work" aria-labelledby="work-title" className="page scroll-mt-20">
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
          <div className="mt-8">
            <h3 className="text-[16px] font-bold">Also at GoTab</h3>
            <MenuGrid items={alsoAtGoTab} className="mt-3" />
          </div>
        ) : null}
      </section>
    </div>
  );
}

/** Product / Engineering / Everything. Native radios, so arrow keys and the checked state come for free. */
function ExploreSwitch() {
  const lens = lensStore.use();
  const activeLens = lenses.find((candidate) => candidate.id === lens) ?? lenses[0];
  return (
    <fieldset aria-describedby="lens-note">
      <legend className="page-title">Explore my work</legend>
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

function variantFor(id: CategoryId): MenuVariant {
  return id === "projects" ? "project" : "compact";
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

      <div id="menu" className="page mt-14 flex scroll-mt-20 flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <ExploreSwitch />
        <div className="relative md:mb-[46px] md:w-[340px]">
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
              <Link href="/checkout" className="font-medium underline underline-offset-4">
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

          {sections.map((section, index) => {
            const variant = variantFor(section.id);
            const cards = menuCardsIn(section.id);
            // Screenshots lead the projects, so the image cards line up on the first row.
            const ordered = variant === "project" ? [...cards].sort((a, b) => Number(!!b.image) - Number(!!a.image)) : cards;
            return (
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
                  <MenuGrid items={ordered} variant={variant} />
                </div>
              </section>
            );
          })}
        </>
      )}
    </>
  );
}
