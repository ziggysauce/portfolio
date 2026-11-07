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
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {roles.map((role) => (
            <li key={role.id}>
              <Link href={`/orders#${role.id}`} className="group flex items-center justify-between gap-4 py-4">
                <span className="min-w-0">
                  <span className="block text-[16px] group-hover:underline group-hover:underline-offset-4">{role.title}</span>
                  <span className="block text-sm text-muted">{role.dates}</span>
                </span>
                <span className={role.current ? "status status-live" : "status"}>{role.current ? "In progress" : "Delivered"}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/orders" className="btn btn-outline mt-5">
          See all orders
        </Link>
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
