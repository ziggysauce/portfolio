import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/work/work.module.css";
import { exhibits } from "@/content/exhibits";
import { about, site } from "@/content/site";
import { museumHref } from "@/content/work";

const description = `About ${site.name}: technical product leader and hands-on engineer at GoTab since 2018.`;

export const metadata: Metadata = {
  title: "About",
  description,
  openGraph: { title: `About | ${site.name}`, description, url: "/about", siteName: site.name, type: "profile", images: [site.ogImage] },
};

/** A link into the hall, named after the exhibit, for a line that has its own case. */
function CaseLink({ id }: { id: string }) {
  const exhibit = exhibits.find((item) => item.id === id);
  return exhibit ? (
    <Link href={museumHref(id)} prefetch={false} className={styles.entryMeta}>
      {exhibit.title}
      <span className="sr-only"> (exhibit in the museum)</span>
    </Link>
  ) : null;
}

export default function AboutPage() {
  return (
    <div className={styles.plain}>
      <header className={styles.indexHead}>
        <p className={styles.eyebrow}>About</p>
        <h1 className={styles.pageTitle}>{site.name}</h1>
        <p className={styles.lede}>{about.summary}</p>
      </header>

      <section aria-labelledby="career-title">
        <h2 id="career-title" className={styles.plainTitle}>
          Career
        </h2>
        <ul className={styles.entries}>
          {about.career.map((role) => (
            <li key={role.title}>
              <span>
                {role.title}, {role.place}
                <br />
                <span className={styles.entryMeta}>{role.dates}</span>
              </span>
              <CaseLink id={role.exhibit} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="education-title">
        <h2 id="education-title" className={styles.plainTitle}>
          Education
        </h2>
        <ul className={styles.entries}>
          {about.education.map((entry) => (
            <li key={entry.school}>
              <span>
                {entry.degree}
                <br />
                <span className={styles.entryMeta}>
                  {entry.school} · {entry.year}
                </span>
              </span>
              <CaseLink id={entry.exhibit} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="hours-title">
        <h2 id="hours-title" className={styles.plainTitle}>
          After hours
        </h2>
        <p>{about.offHours}</p>
      </section>

      <p className={styles.actions}>
        <Link href="/work">Selected work</Link>
        <a href={site.resume} target="_blank" rel="noreferrer">
          Résumé (PDF)<span className="sr-only">, opens in a new tab</span>
        </a>
        <Link href="/contact">Contact</Link>
      </p>
    </div>
  );
}
