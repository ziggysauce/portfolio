import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/Header";
import { Icon } from "@/components/Icon";
import { company, education, offHours, pitch, roles, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Profile",
  description: site.description,
};

export default function AboutPage() {
  const current = roles.find((role) => role.current);
  const facts = [
    { label: "Based in", value: site.location },
    { label: "Replies", value: site.replyTime.replace(/^Replies /, "") },
    { label: `At ${company.name} since`, value: roles[roles.length - 1].dates.match(/\d{4}/)?.[0] ?? "" },
  ];

  return (
    <div className="page max-w-4xl pt-4 md:pt-8">
      <section aria-labelledby="profile-title" className="card p-5 md:p-8">
        <div className="flex items-center gap-4 md:gap-5">
          <BrandMark large />
          <div className="min-w-0">
            <h1 id="profile-title" className="page-title">
              {site.name}
            </h1>
            <p className="mt-1 text-[16px] font-medium">
              {current?.title}, {company.name}
            </p>
          </div>
        </div>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed">{pitch}</p>
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted">{offHours}</p>

        <dl className="mt-6 grid grid-cols-3 gap-2 md:max-w-xl md:gap-3">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-xl bg-canvas px-3 py-3 md:px-4">
              <dt className="text-[13px] text-muted">{fact.label}</dt>
              <dd className="mt-0.5 text-[15px] font-semibold leading-snug">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <a href={site.resume} target="_blank" rel="noreferrer" className="btn btn-primary">
            Résumé (PDF)
            <Icon name="external" size={16} />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <Link href="/contact" className="btn btn-outline">
            Contact me
          </Link>
        </div>
      </section>

      <section id="history" aria-labelledby="history-title" className="mt-12 scroll-mt-24">
        <h2 id="history-title" className="section-title">
          Work history
        </h2>
        <p className="mt-1 text-[15px] text-muted">
          {company.name}, {company.place}. {company.about}
        </p>
        <ul className="mt-5 space-y-3">
          {roles.map((role) => (
            <li key={role.id}>
              <Link href={`/orders#${role.id}`} className="card card-link group flex items-center justify-between gap-4 px-5 py-4">
                <span className="min-w-0">
                  <span className="block font-semibold group-hover:underline group-hover:underline-offset-4">{role.title}</span>
                  <span className="block text-[15px] text-muted">{role.dates}</span>
                </span>
                {role.current ? <span className="status status-live">Current role</span> : null}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/orders" className="btn btn-outline mt-5">
          See full work history
        </Link>
      </section>

      <section aria-labelledby="education-title" className="mt-12">
        <h2 id="education-title" className="section-title">
          Where I learned to cook
        </h2>
        <p className="mt-1 text-[15px] text-muted">Education</p>
        <ul className="card mt-5 divide-y divide-line">
          {education.map((entry) => (
            <li key={entry.school} className="flex items-baseline justify-between gap-4 px-5 py-4">
              <span>
                <span className="block font-semibold">{entry.school}</span>
                <span className="block text-[15px] text-muted">{entry.degree}</span>
              </span>
              <span className="text-[15px] text-muted">{entry.year}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
