import type { Metadata } from "next";
import Link from "next/link";
import { requireItem } from "@/content/catalog";
import { company, roles, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Work history",
  description: `${site.name}'s work history at ${company.name}: each role, its highlights and the work that came out of it.`,
};

export default function OrdersPage() {
  return (
    <div className="page max-w-3xl pt-6 md:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="text-[15px] text-muted">Order history</p>
          <h1 className="font-display text-[44px] leading-[1.08] md:text-[60px]">Work history</h1>
        </div>
        <a href={site.resume} target="_blank" rel="noreferrer" className="btn btn-outline">
          Résumé (PDF)
        </a>
      </div>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">
        My work history at {company.name}, newest first. {company.about}
      </p>

      <ol className="mt-8 space-y-4">
        {roles.map((role) => (
          <li key={role.id} id={role.id} className="scroll-mt-20 rounded-xl border border-line p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <h2 className="font-display text-[22px] font-medium leading-tight md:text-[24px]">{role.title}</h2>
              {role.current ? <span className="status status-live">Current role</span> : null}
            </div>
            <p className="mt-1 text-[15px] text-muted">
              {company.name} · {role.dates}
            </p>

            <details open={role.current} className="group mt-4 border-t border-line pt-4">
              <summary className="receipt-toggle">
                <span className="group-open:hidden">View role details</span>
                <span className="hidden group-open:inline">Hide role details</span>
                <span className="sr-only">: {role.title}</span>
              </summary>
              <ul className="mt-4 space-y-2 text-[15px] leading-relaxed">
                {role.notes.map((note) => (
                  <li key={note} className="flex gap-3">
                    <span aria-hidden="true" className="text-muted">
                      &bull;
                    </span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </details>

            <div className="mt-4">
              <p className="text-[15px] text-muted">Related work and skills</p>
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[15px]">
                {role.items.map(requireItem).map((item) => (
                  <li key={item.slug}>
                    <Link href={`/item/${item.slug}`} className="underline underline-offset-4 hover:text-muted">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
