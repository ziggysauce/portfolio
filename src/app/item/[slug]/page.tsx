import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToOrder, BackLink, ShareButton } from "@/components/ItemActions";
import { Icon } from "@/components/Icon";
import { ResultLine, StatusPill } from "@/components/ItemMeta";
import { MenuGrid } from "@/components/MenuItem";
import { foundIn, getItem, groupedWith, items, related, requireItem, yearsSince, type Item } from "@/content/catalog";
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

export default async function ItemPage({ params }: Props) {
  const item = getItem((await params).slug);
  if (!item) notFound();

  const details = detailsFor(item);
  const grouped = groupedWith(item.slug);
  const usedIn = foundIn(item.slug);
  const ingredients = item.ingredients?.map(requireItem) ?? [];
  const also = related(item);

  return (
    <>
      <div className="page flex max-w-3xl items-center justify-between">
        <BackLink />
        <ShareButton name={item.name} />
      </div>
      <article className="page mt-1 max-w-3xl">
        {item.image ? (
          <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-xl bg-tile">
            <Image
              src={item.image.src}
              alt={item.image.alt}
              fill
              sizes="(min-width: 768px) 704px, 100vw"
              className="object-cover object-top"
            />
          </div>
        ) : null}

        <div>
          {item.badge ? <span className="tag">{item.badge}</span> : null}
          <h1 className="mt-2 font-display text-[36px] font-normal leading-[1.12] md:text-[48px]">{item.name}</h1>
          <p className="mt-3 text-[17px] leading-relaxed">{item.blurb}</p>

          <div className="mt-8 space-y-3">
            {item.status ? (
              <div className="option-card flex items-center justify-between gap-4">
                <p className="font-medium">Status</p>
                <StatusPill status={item.status} />
              </div>
            ) : null}

            {item.results ? (
              <div className="option-card">
                <p className="font-medium">{item.results.scope ? `${item.results.scope} results` : "Results"}</p>
                <ul className="mt-2 space-y-1.5">
                  {item.results.points.map((point) => (
                    <li key={point}>
                      <ResultLine text={point} className="text-[15px] font-normal" />
                    </li>
                  ))}
                </ul>
                {item.results.note ? <p className="mt-2 text-[14px] text-muted">{item.results.note}</p> : null}
              </div>
            ) : null}

            {details.map((detail) => (
              <div key={detail.label} className="option-card">
                <p className="font-medium">{detail.label}</p>
                <p className="mt-0.5 text-[15px] text-muted">{detail.value}</p>
              </div>
            ))}

            {grouped.length ? (
              <div className="option-card">
                <p className="font-medium">Goes with</p>
                <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[15px] text-muted">
                  {grouped.map((other) => (
                    <li key={other.slug}>
                      <Link href={`/item/${other.slug}`} className="underline underline-offset-4 hover:text-ink">
                        {other.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {item.gotab || usedIn.length ? (
              <div className="option-card">
                <p className="font-medium">Where I&rsquo;ve used it</p>
                <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[15px] text-muted">
                  {item.gotab ? <li>GoTab</li> : null}
                  {usedIn.map((project) => (
                    <li key={project.slug}>
                      <Link href={`/item/${project.slug}`} className="underline underline-offset-4 hover:text-ink">
                        {project.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {ingredients.length ? (
              <div className="option-card">
                <p className="font-medium">Ingredients</p>
                <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[15px] text-muted">
                  {ingredients.map((ingredient) => (
                    <li key={ingredient.slug}>
                      <Link href={`/item/${ingredient.slug}`} className="underline underline-offset-4 hover:text-ink">
                        {ingredient.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {item.links?.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="option-card flex items-center justify-between font-medium transition-colors hover:border-ink"
              >
                {link.label}
                <Icon name="arrowRight" size={24} />
              </a>
            ))}
          </div>

          {item.sections?.map((section) => (
            <section key={section.heading} className="mt-8">
              <h2 className="section-title">{section.heading}</h2>
              <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed">{section.body}</p>
            </section>
          ))}

          <AddToOrder item={item} />
        </div>
      </article>

      {also.length ? (
        <section aria-labelledby="also-like" className="page mt-14 max-w-3xl">
          <h2 id="also-like" className="section-title">
            You might also like
          </h2>
          <div className="mt-5">
            <MenuGrid items={also} />
          </div>
        </section>
      ) : null}
    </>
  );
}
