import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { requireItem } from "@/content/catalog";
import { company, roles, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Work history",
  description: `${site.name}'s work history at ${company.name}: each role, its highlights and the work that came out of it.`,
};

export default function OrdersPage() {
  return (
    <div className="page max-w-4xl pt-4 md:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="text-[15px] text-muted">Order history</p>
          <h1 className="page-title mt-1">Work history</h1>
        </div>
        <a href={site.resume} target="_blank" rel="noreferrer" className="btn btn-outline">
          Résumé (PDF)
          <Icon name="external" size={16} />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
      <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted">
        My work history at {company.name}, newest first. {company.about}
      </p>

      <ol className="mt-8 space-y-4">
        {roles.map((role) => (
          <li key={role.id} id={role.id} className="card scroll-mt-24 p-5 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <h2 className="text-[20px] font-bold leading-tight tracking-tight md:text-[24px]">{role.title}</h2>
              {role.current ? <span className="status status-live">Current role</span> : null}
            </div>
            <p className="mt-1 text-[15px] text-muted">
              {company.name} &middot; {role.dates}
            </p>

            <details open={role.current} className="group mt-4 border-t border-dashed border-line pt-4">
              <summary className="receipt-toggle">
                <span className="group-open:hidden">View role details</span>
                <span className="hidden group-open:inline">Hide role details</span>
                <span className="sr-only">: {role.title}</span>
              </summary>
              <ul className="mt-4 space-y-2.5 text-[15px] leading-relaxed">
                {role.notes.map((note) => (
                  <li key={note} className="flex gap-3">
                    <span aria-hidden="true" className="font-bold text-brand">
                      &bull;
                    </span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </details>

            <div className="mt-5">
              <p className="text-[14px] font-semibold text-muted">Related work and skills</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {role.items.map(requireItem).map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/item/${item.slug}`}
                      className="inline-flex min-h-9 items-center rounded-full border border-line px-3 text-[14px] font-medium transition-colors hover:border-brand hover:text-brand-strong"
                    >
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
