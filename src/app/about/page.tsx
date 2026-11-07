import type { Metadata } from "next";
import Link from "next/link";
import { company, education, lenses, offHours, roles, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Profile",
  description: site.description,
};

export default function AboutPage() {
  const pitch = lenses.find((lens) => lens.id === "all")?.pitch;

  return (
    <div className="page max-w-3xl pt-6 md:pt-12">
      <h1 className="font-display text-[44px] leading-[1.05] tracking-tight md:text-[64px]">{site.firstName}</h1>
      <p className="mt-2 text-sm text-muted">{site.location}</p>
      <p className="mt-6 text-[18px] leading-relaxed">{pitch}</p>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">{offHours}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={site.resume} target="_blank" rel="noreferrer" className="btn btn-primary">
          View résumé
        </a>
        <Link href="/contact" className="btn btn-outline">
          Contact me
        </Link>
      </div>

      <section id="history" aria-labelledby="history-title" className="mt-14 scroll-mt-20">
        <h2 id="history-title" className="aisle-title">
          Order History
        </h2>
        <p className="mt-1 text-sm text-muted">
          {company.name}, {company.place}. {company.about}
        </p>
        <ul className="mt-5 space-y-4">
          {roles.map((role) => (
            <li key={role.title} className="rounded-2xl border border-line p-5 md:p-6">
              <h3 className="font-display text-[24px] leading-tight">{role.title}</h3>
              <p className="mt-2 flex items-center gap-2 text-sm">
                {role.current ? <span aria-hidden="true" className="size-2.5 rounded-full bg-open" /> : null}
                <span>{role.dates}</span>
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-muted">
                {role.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="education-title" className="mt-14">
        <h2 id="education-title" className="aisle-title">
          Where I Learned to Cook
        </h2>
        <p className="mt-1 text-sm text-muted">Education</p>
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {education.map((entry) => (
            <li key={entry.school} className="flex items-baseline justify-between gap-4 py-4">
              <span>
                <span className="block text-[16px]">{entry.school}</span>
                <span className="block text-sm text-muted">{entry.degree}</span>
              </span>
              <span className="text-sm text-muted">{entry.year}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
