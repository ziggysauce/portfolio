import type { Metadata } from "next";
import Link from "next/link";
import { FigureArt } from "@/components/work/figures";
import styles from "@/components/work/work.module.css";
import { exhibitFor, listedStudies, museumHref, studyHref, type Study } from "@/content/work";
import { site } from "@/content/site";

const description = "Case studies from Daniel Nguyen’s work at GoTab: the problem, his role, what the team built, and what changed.";

export const metadata: Metadata = {
  title: "Selected work",
  description,
  // While a draft is listed here, its title and summary stay out of search engines too.
  robots: listedStudies.some((study) => study.status === "draft") ? { index: false, follow: false } : undefined,
  openGraph: { title: `Selected work | ${site.name}`, description, url: "/work", siteName: site.name, type: "website", images: [site.ogImage] },
};

function Draft({ study }: { study: Study }) {
  return study.status === "draft" ? <span className={styles.draft}>Draft</span> : null;
}

export default function WorkIndex() {
  const featured = listedStudies.filter((study) => study.length !== "short");
  const shorter = listedStudies.filter((study) => study.length === "short");
  return (
    <div className={styles.indexPage}>
      <header className={styles.indexHead}>
        <p className={styles.eyebrow}>Case studies</p>
        <h1 className={styles.pageTitle}>Selected work</h1>
        <p className={styles.lede}>
          The museum introduces my career. These pages tell the stories behind it: the problem we were solving, my part in it, what we built,
          and what I learned.
        </p>
      </header>

      <ol className={styles.cards}>
        {featured.map((study, i) => {
          const exhibit = exhibitFor(study);
          return (
            <li key={study.slug} className={styles.card}>
              {study.hero ? (
                <div className={styles.cardArt}>
                  {/* A preview of the study's lead visual; the study page describes it in full. */}
                  <div aria-hidden="true">
                    <FigureArt figure={study.hero.figure} />
                  </div>
                  {study.hero.label ? <p className={styles.cardArtLabel}>{study.hero.label}</p> : null}
                </div>
              ) : null}
              <div className={styles.cardBody}>
                <p className={styles.cardMeta}>
                  <span>No. {String(i + 1).padStart(2, "0")}</span>
                  <Draft study={study} />
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

      {shorter.length ? (
        <section aria-labelledby="shorter-title" className={styles.shorter}>
          <h2 id="shorter-title" className={styles.shorterTitle}>
            A shorter story
          </h2>
          <ul>
            {shorter.map((study) => (
              <li key={study.slug} className={styles.shortCard}>
                <p className={styles.cardMeta}>
                  <span>
                    {study.role} · {study.timeframe}
                  </span>
                  <Draft study={study} />
                </p>
                <h3 className={styles.shortTitle}>
                  <Link href={studyHref(study)} className={styles.cardLink}>
                    {study.title}
                  </Link>
                </h3>
                <p className={styles.cardSummary}>{study.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
