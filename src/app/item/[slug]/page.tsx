import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToOrder, BackLink, ShareButton } from "@/components/ItemActions";
import { Icon } from "@/components/Icon";
import { ResultLine, StatusPill } from "@/components/ItemMeta";
import { MenuGrid } from "@/components/MenuItem";
import { categories, foundIn, getItem, groupedWith, items, related, requireItem, yearsSince, type Item } from "@/content/catalog";
import { site } from "@/content/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = getItem((await params).slug);
  if (!item) return {};
  return {
    title: item.name,
    description: item.blurb,
    openGraph: {
      title: `${item.name} | ${site.name}`,
      description: item.blurb,
      url: `/item/${item.slug}`,
      siteName: site.name,
      type: "website",
      images: [site.ogImage],
    },
  };
}

/** Experience and how often, when known. Status and results get their own cards. */
function detailsFor(item: Item): { label: string; value: string }[] {
  const details = [];
  if (item.since) {
    const years = yearsSince(item.since);
    details.push({ label: "Experience", value: `${years} ${years === 1 ? "year" : "years"}, since ${item.since}` });
  }
  if (item.use) details.push({ label: "How often", value: item.use });
  return details;
}

/** A labeled list of links to other items, such as "Built with". */
function LinkTile({ label, items: linked, extra, wide = false }: { label: string; items: Item[]; extra?: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl bg-canvas p-4 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-[14px] font-semibold text-muted">{label}</dt>
      <dd className="mt-1">
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {extra ? <li>{extra}</li> : null}
          {linked.map((other) => (
            <li key={other.slug}>
              <Link href={`/item/${other.slug}`} className="font-medium underline underline-offset-4 hover:text-brand">
                {other.name}
              </Link>
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

export default async function ItemPage({ params }: Props) {
  const item = getItem((await params).slug);
  if (!item) notFound();

  const details = detailsFor(item);
  const grouped = groupedWith(item.slug);
  const usedIn = foundIn(item.slug);
  const ingredients = item.ingredients?.map(requireItem) ?? [];
  const also = related(item);
  const section = categories.find((category) => category.id === item.category)?.title;

  return (
    <div className="page max-w-4xl pt-3 md:pt-6">
      <div className="flex items-center justify-between">
        <BackLink />
        <ShareButton name={item.name} />
      </div>

      <article className="card mt-1 overflow-hidden">
        {item.image ? (
          <div className="relative aspect-[16/9] border-b border-line bg-canvas">
            <Image src={item.image.src} alt={item.image.alt} fill sizes="(min-width: 896px) 832px, 100vw" className="object-cover object-top" priority />
          </div>
        ) : null}

        <div className="p-5 md:p-8">
          <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-muted">
            {item.status ? <StatusPill status={item.status} /> : null}
            {item.badge ? <span className="tag">{item.badge}</span> : null}
            {section}
          </p>
          <h1 className="page-title mt-3">{item.name}</h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed">{item.blurb}</p>

          {item.results ? (
            <div className="mt-6 max-w-2xl rounded-xl bg-mint-soft p-4 md:p-5">
              <p className="text-[14px] font-bold text-brand-strong">{item.results.scope ? `${item.results.scope} results` : "Results"}</p>
              <ul className="mt-2 space-y-1.5">
                {item.results.points.map((point) => (
                  <li key={point}>
                    <ResultLine text={point} className="text-[15px]" />
                  </li>
                ))}
              </ul>
              {item.results.note ? <p className="mt-2 text-[14px] text-muted">{item.results.note}</p> : null}
            </div>
          ) : null}

          <div className="mt-6">
            {item.links?.length ? (
              <div className="mb-3 flex flex-wrap gap-3 md:mb-0 md:mr-3 md:inline-flex md:align-middle">
                {item.links.map((link) => (
                  <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="btn btn-outline">
                    {link.label}
                    <Icon name="external" size={16} />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ))}
              </div>
            ) : null}
            <AddToOrder item={item} />
          </div>

          {details.length || grouped.length || item.gotab || usedIn.length || ingredients.length ? (
            <dl className="mt-8 grid gap-3 sm:grid-cols-2">
              {details.map((detail) => (
                <div key={detail.label} className="rounded-xl bg-canvas p-4">
                  <dt className="text-[14px] font-semibold text-muted">{detail.label}</dt>
                  <dd className="mt-1">{detail.value}</dd>
                </div>
              ))}
              {grouped.length ? <LinkTile label="Goes with" items={grouped} /> : null}
              {item.gotab || usedIn.length ? <LinkTile label="Where I’ve used it" items={usedIn} extra={item.gotab ? "GoTab" : undefined} /> : null}
              {ingredients.length ? <LinkTile label="Built with" items={ingredients} wide /> : null}
            </dl>
          ) : null}

          {item.sections?.map((part) => (
            <section key={part.heading} className="mt-8">
              <h2 className="section-title">{part.heading}</h2>
              <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed">{part.body}</p>
            </section>
          ))}
        </div>
      </article>

      {also.length ? (
        <section aria-labelledby="also-like" className="mt-12">
          <h2 id="also-like" className="section-title">
            You might also like
          </h2>
          <div className="mt-5">
            <MenuGrid items={also} className="lg:grid-cols-2" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
