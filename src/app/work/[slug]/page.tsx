import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StudyFigure, StudySection } from "@/components/work/StudyParts";
import styles from "@/components/work/work.module.css";
import { exhibitFor, getStudy, listedStudies, museumHref, studyHref } from "@/content/work";
import { site } from "@/content/site";

type Props = { params: Promise<{ slug: string }> };

// Only studies with a page are built. A planned study's slug is a 404, never an empty page.
export const dynamicParams = false;

export function generateStaticParams() {
  return listedStudies.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const study = getStudy((await params).slug);
  if (!study) return {};
  return {
    title: study.title,
    description: study.summary,
    // Drafts are readable on this build, but not offered to search engines until they're reviewed.
    robots: study.status === "draft" ? { index: false, follow: false } : undefined,
    openGraph: {
      title: `${study.title} | ${site.name}`,
      description: study.summary,
      url: studyHref(study),
      siteName: site.name,
      type: "article",
      images: [site.ogImage],
    },
  };
}

export default async function StudyPage({ params }: Props) {
  const study = getStudy((await params).slug);
  if (!study) notFound();
  const exhibit = exhibitFor(study);
  const back = museumHref(study.exhibit);
  const sections = study.sections ?? [];
  let n = 0;

  return (
    <article className={styles.study}>
      <header className={styles.studyHead}>
        <nav aria-label="Breadcrumb" className={styles.crumbs}>
          <ol>
            <li>
              <Link href="/work">Selected work</Link>
            </li>
            {exhibit ? (
              <li>
                <Link href={back} prefetch={false}>
                  Return to museum, case {exhibit.number}
                </Link>
              </li>
            ) : null}
          </ol>
        </nav>
        <p className={styles.eyebrow}>
          Case study{exhibit ? ` · from case ${exhibit.number}, ${exhibit.title}` : ""}
          {study.status === "draft" ? <span className={styles.draft}>Draft</span> : null}
        </p>
        <h1 className={styles.studyTitle}>{study.title}</h1>
        <p className={styles.lede}>{study.summary}</p>
        {study.facts ? (
          <dl className={styles.facts}>
            {study.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>
                  {fact.value}
                  {fact.detail ? <span className={styles.factDetail}>{fact.detail}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </header>

      {study.hero ? <StudyFigure figure={study.hero} wide /> : null}

      {sections.length > 2 ? (
        <nav aria-labelledby="contents-title" className={styles.contents}>
          <h2 id="contents-title" className={styles.contentsTitle}>
            On this page
          </h2>
          <ol>
            {sections.map((section) => (
              <li key={section.id} className={section.aside ? styles.contentsAside : undefined}>
                <a href={`#${section.id}`}>{section.heading}</a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {sections.map((section) => (
        <StudySection key={section.id} section={section} number={section.aside ? 0 : ++n} />
      ))}

      <footer className={styles.studyFoot}>
        {exhibit ? (
          <Link href={back} prefetch={false} className={styles.returnLink}>
            <span aria-hidden="true">←</span> Return to museum, case {exhibit.number}: {exhibit.title}
          </Link>
        ) : null}
        <Link href="/work">All selected work</Link>
      </footer>
    </article>
  );
}
