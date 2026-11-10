import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Icon, PinIcon } from "@/components/Icon";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${site.name}: email, LinkedIn, GitHub and résumé.`,
};

const links = [
  { label: "LinkedIn", detail: "linkedin.com/in/dtn3423", href: site.linkedin },
  { label: "GitHub", detail: "github.com/ziggysauce", href: site.github },
  { label: "Résumé", detail: "PDF, one page", href: site.resume },
];

export default function ContactPage() {
  return (
    <div className="page max-w-3xl pt-4 md:pt-8">
      <h1 className="page-title">Contact</h1>
      <p className="mt-3 text-[17px] leading-relaxed">No order needed. Email is the fastest way to reach me.</p>
      <p className="mt-1 flex items-center gap-1.5 text-[15px] text-muted">
        <PinIcon size={16} className="shrink-0" />
        {site.location} &middot; {site.replyTime}
      </p>

      <div className="card mt-8 p-5 md:p-7">
        <p className="text-[14px] font-semibold text-muted">Email</p>
        <a href={`mailto:${site.email}`} className="mt-1 block break-all text-[24px] font-bold leading-tight tracking-tight underline-offset-4 hover:underline md:text-[28px]">
          {site.email}
        </a>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={`mailto:${site.email}`} className="btn btn-primary">
            Send an email
          </a>
          <CopyButton text={site.email} label="Copy address" />
        </div>
      </div>

      <ul className="mt-3 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} target="_blank" rel="noreferrer" className="card card-link flex items-center justify-between gap-4 px-5 py-4">
              <span>
                <span className="block font-semibold">{link.label}</span>
                <span className="block text-[15px] text-muted">{link.detail}</span>
              </span>
              <Icon name="external" size={20} className="shrink-0 text-muted" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-[15px]">
        Rather browse first?{" "}
        <Link href="/#menu" className="font-medium underline underline-offset-4">
          See the menu
        </Link>
        .
      </p>
    </div>
  );
}
