import type { Metadata } from "next";
import Link from "next/link";
import { requireItem } from "@/content/catalog";
import { company, roles, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Orders",
  description: `${site.name}'s work history at ${company.name}: each role, its highlights and the work that came out of it.`,
};

export default function OrdersPage() {
  return (
    <div className="page max-w-3xl pt-6 md:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <h1 className="font-display text-[44px] leading-[1.05] tracking-tight md:text-[64px]">Orders</h1>
        <a href={site.resume} target="_blank" rel="noreferrer" className="btn btn-outline">
          Résumé (PDF)
        </a>
      </div>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">
        My work history at {company.name}, newest first. {company.about}
      </p>

      <ol className="mt-8 space-y-4">
        {roles.map((role) => (
          <li key={role.id} id={role.id} className="scroll-mt-20 rounded-2xl border border-line p-5 md:p-6">
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-[11px] tracking-[0.07em] text-white"
              >
                {role.code}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <h2 className="font-display text-[22px] leading-tight md:text-[24px]">{role.title}</h2>
                  <span className={role.current ? "status status-live" : "status"}>
                    {role.current ? "In progress" : "Delivered"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {company.name} · {role.dates}
                </p>
              </div>
            </div>

            <details open={role.current} className="group mt-4 border-t border-line pt-4">
              <summary className="receipt-toggle">
                <span className="group-open:hidden">View receipt</span>
                <span className="hidden group-open:inline">Hide receipt</span>
                <span className="sr-only"> for {role.title}</span>
              </summary>
              <ul className="mt-4 space-y-2 text-[15px] leading-relaxed">
                {role.notes.map((note) => (
                  <li key={note} className="flex gap-3">
                    <span aria-hidden="true" className="text-muted">
                      1×
                    </span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </details>

            <div className="mt-4">
              <p className="text-sm text-muted">On the menu from this role</p>
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
