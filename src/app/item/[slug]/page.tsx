import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToOrder, BackLink, ShareButton } from "@/components/ItemActions";
import { Icon } from "@/components/Icon";
import { ProductArt } from "@/components/ProductArt";
import { Shelf } from "@/components/ProductCard";
import { foundIn, getItem, items, related, requireItem, yearsSince, type Item } from "@/content/catalog";
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

function detailFor(item: Item): { label: string; value: string } {
  if ("since" in item.price) {
    const years = yearsSince(item.price.since);
    return { label: "Experience", value: `${years} ${years === 1 ? "year" : "years"}, since ${item.price.since}` };
  }
  if ("free" in item.price) return { label: "Price", value: "Free. The code is public." };
  if (item.soon) return { label: "Status", value: item.price.text };
  return { label: item.category === "case-studies" ? "Format" : "How often", value: item.price.text };
}

export default async function ItemPage({ params }: Props) {
  const item = getItem((await params).slug);
  if (!item) notFound();

  const detail = detailFor(item);
  const usedIn = foundIn(item.slug);
  const ingredients = item.ingredients?.map(requireItem) ?? [];
  const also = related(item);

  return (
    <>
      <div className="page">
        <BackLink />
      </div>
      <article className="page mt-1 grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="-mx-4 md:mx-0">
          <div className="relative aspect-[4/3] overflow-hidden bg-tile lg:sticky lg:top-20">
            <ProductArt art={item.art} sizes="(min-width: 1024px) 50vw, 100vw" />
            {item.badge ? <span className="badge absolute left-4 top-4">{item.badge}</span> : null}
            <ShareButton name={item.name} />
          </div>
        </div>

        <div className="lg:pt-4">
          <h1 className="text-center font-display text-[36px] leading-[1.12] tracking-tight md:text-[44px] lg:text-left">{item.name}</h1>
          <p className="mt-3 text-center text-[16px] leading-relaxed lg:text-left">{item.blurb}</p>

          <div className="mt-8 space-y-3">
            <div className="option-card">
              <p className="text-[17px]">{detail.label}</p>
              <p className="mt-0.5 text-[15px] text-muted">{detail.value}</p>
            </div>

            {item.gotab || usedIn.length ? (
              <div className="option-card">
                <p className="text-[17px]">Where I&rsquo;ve used it</p>
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
                <p className="text-[17px]">Ingredients</p>
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
                className="option-card flex items-center justify-between text-[17px] transition-colors hover:border-ink"
              >
                {link.label}
                <Icon name="arrowRight" size={24} />
              </a>
            ))}
          </div>

          {item.sections?.map((section) => (
            <section key={section.heading} className="mt-8">
              <h2 className="aisle-title">{section.heading}</h2>
              <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed">{section.body}</p>
            </section>
          ))}

          <AddToOrder item={item} />
        </div>
      </article>

      {also.length ? (
        <section aria-labelledby="also-like" className="page mt-14">
          <h2 id="also-like" className="aisle-title">
            You Might Also Like
          </h2>
          <div className="mt-5">
            <Shelf items={also} label="You might also like" />
          </div>
        </section>
      ) : null}
    </>
  );
}
