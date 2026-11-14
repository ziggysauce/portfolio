import type { Metadata } from "next";
import Link from "next/link";
import { FigureArt } from "@/components/work/figures";
import styles from "@/components/work/work.module.css";
import { exhibitFor, listedStudies, museumHref, studyHref } from "@/content/work";
import { site } from "@/content/site";

const description = "Case studies from Daniel Nguyen’s work at GoTab: the problem, what he built, what teammates built, and what changed.";

export const metadata: Metadata = {
  title: "Selected work",
  description,
  // While a draft is listed here, its title and summary stay out of search engines too.
  robots: listedStudies.some((study) => study.status === "draft") ? { index: false, follow: false } : undefined,
  openGraph: { title: `Selected work | ${site.name}`, description, url: "/work", siteName: site.name, type: "website", images: [site.ogImage] },
};

export default function WorkIndex() {
  return (
    <div className={styles.indexPage}>
      <header className={styles.indexHead}>
        <p className={styles.eyebrow}>Case studies</p>
        <h1 className={styles.pageTitle}>Selected work</h1>
        <p className={styles.lede}>
          The museum introduces my career. These pages show the work behind it: the problem, what I built, what teammates built, and what changed.
        </p>
      </header>

      <ol className={styles.cards}>
        {listedStudies.map((study, i) => {
          const exhibit = exhibitFor(study);
          return (
            <li key={study.slug} className={styles.card}>
              {study.hero ? (
                <div className={styles.cardArt}>
                  <FigureArt figure={study.hero.figure} />
                  {study.hero.label ? <p className={styles.cardArtLabel}>{study.hero.label}</p> : null}
                </div>
              ) : null}
              <div className={styles.cardBody}>
                <p className={styles.cardMeta}>
                  <span>No. {String(i + 1).padStart(2, "0")}</span>
                  {study.status === "draft" ? <span className={styles.draft}>Draft</span> : null}
                </p>
                <h2 className={styles.cardTitle}>
                  <Link href={studyHref(study)} className={styles.cardLink}>
                    {study.title}
                  </Link>
                </h2>
                <p className={styles.cardSummary}>{study.summary}</p>
                <dl className={styles.cardFacts}>
                  <div>
                    <dt>Role</dt>
                    <dd>{study.role}</dd>
                  </div>
                  <div>
                    <dt>When</dt>
                    <dd>{study.timeframe}</dd>
                  </div>
                </dl>
                <ul className={styles.tags} aria-label="Topics">
                  {study.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
                {exhibit ? (
                  <p className={styles.cardExhibit}>
                    <Link href={museumHref(study.exhibit)} prefetch={false}>
                      See case {exhibit.number}, {exhibit.title}, in the museum
                    </Link>
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <p className={styles.more}>More case studies are in preparation.</p>
    </div>
  );
}
