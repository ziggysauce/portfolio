import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
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
    <div className="page max-w-2xl pt-6 md:pt-12">
      <h1 className="font-display text-[44px] leading-[1.08] md:text-[60px]">Skip the line</h1>
      <p className="mt-4 text-[17px] leading-relaxed">No order needed. Here&rsquo;s how to reach me directly. I usually reply within a day.</p>

      <div className="mt-8 rounded-2xl border border-line p-5 md:p-6">
        <p className="text-[15px] text-muted">Email</p>
        <a href={`mailto:${site.email}`} className="mt-1 block break-all font-display text-[26px] leading-tight underline-offset-4 hover:underline">
          {site.email}
        </a>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={`mailto:${site.email}`} className="btn btn-primary">
            Send an email
          </a>
          <CopyButton text={site.email} label="Copy address" />
        </div>
      </div>

      <ul className="mt-3 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} target="_blank" rel="noreferrer" className="option-card flex items-center justify-between gap-4 transition-colors hover:border-ink">
              <span>
                <span className="block font-medium">{link.label}</span>
                <span className="block text-[15px] text-muted">{link.detail}</span>
              </span>
              <Icon name="arrowRight" size={24} />
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-[15px]">
        Rather browse first?{" "}
        <Link href="/#menu" className="underline underline-offset-4">
          See the menu
        </Link>
        .
      </p>
    </div>
  );
}
