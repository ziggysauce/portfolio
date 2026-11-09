"use client";

import Link from "next/link";
import { requireItem } from "@/content/catalog";
import { roles } from "@/content/site";
import { Icon } from "./Icon";
import { ResultLine, StatusPill } from "./ItemMeta";
import { QuickAdd } from "./MenuItem";

/** "Engineering Manager, 2021–2026", from the role whose notes back this item up. */
function roleLine(slug: string): string | null {
  const role = roles.find((candidate) => candidate.items.includes(slug));
  if (!role) return null;
  const [start, end] = role.dates.match(/\d{4}/g) ?? [];
  return `${role.title}, ${start}–${role.current ? "now" : end}`;
}

/** A GoTab project at the top of the homepage: what I did, then what came of it. */
export function SignatureCard({ slug }: { slug: string }) {
  const item = requireItem(slug);
  const role = roleLine(slug);
  return (
    <article className="group relative flex w-full flex-col rounded-2xl border border-line bg-white p-5 transition-colors hover:border-control md:p-6">
      {role ? <p className="text-[14px] text-muted">{role}</p> : null}
      <h3 className="mt-1 font-display text-[26px] font-medium leading-tight">
        {/* The link's ::after covers the card so the whole thing opens the item. */}
        <Link
          href={`/item/${item.slug}`}
          className="underline-offset-4 after:absolute after:inset-0 after:z-[1] after:rounded-2xl group-hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-link"
        >
          {item.name}
        </Link>
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed">{item.blurb}</p>

      {item.results ? (
        <div className="mt-4 rounded-xl bg-tile p-4">
          <p className="text-[13px] font-medium text-muted">{item.results.scope ? `${item.results.scope} results` : "Results"}</p>
          <ul className="mt-2 space-y-1.5">
            {item.results.points.map((point) => (
              <li key={point}>
                <ResultLine text={point} />
              </li>
            ))}
          </ul>
          {item.results.note ? <p className="mt-2.5 text-[13px] leading-snug text-muted">{item.results.note}</p> : null}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <div className="flex items-center gap-3">
          {item.status ? <StatusPill status={item.status} /> : null}
          <span aria-hidden="true" className="inline-flex items-center gap-1 text-[14px] font-medium">
            Details <Icon name="arrowRight" size={14} />
          </span>
        </div>
        <QuickAdd item={item} className="relative shrink-0" />
      </div>
    </article>
  );
}
