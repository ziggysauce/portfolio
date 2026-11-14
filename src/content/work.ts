// Selected work: the case studies behind the museum. The museum introduces the career; these pages are
// the evidence. Add a study by adding an entry to `studies`; its page, index card and museum link come
// from that entry.
//
// `status` decides where a study shows:
//   "published"  listed on /work, has a page, linked from the museum
//   "draft"      the same, but marked Draft and kept out of search engines. Not cleared for publication:
//                its facts are waiting on Daniel's review (see docs/case-studies/).
//   "planned"    recorded here only. No page, no card, no link. The plan lives in docs/case-studies/plan.md.
//
// Each study's long-form content lives in its own file under src/content/studies/, so copy can be edited
// without touching layout. Sections are free-form: a study uses the blocks it needs, in its own order.

import { exhibits } from "./exhibits";
import { kitchenDisplay } from "./studies/kitchen-display";

/** The visuals a study can place. Each is drawn in src/components/work/figures.tsx. */
export type FigureKey = "kds-hero" | "kds-screen" | "kds-lifecycle";

export type Figure = {
  figure: FigureKey;
  /** What the visual shows, for screen readers. Leave out when the figure is readable text (a diagram in HTML). */
  alt?: string;
  caption: string;
  /** Shown beside the visual when it isn't an authentic artifact, e.g. "Illustrative reconstruction". */
  label?: string;
  /** Numbered callouts, in order, when the figure is annotated. */
  legend?: string[];
};

export type Decision = {
  title: string;
  when: string;
  constraint: string;
  approach: string;
  alternative: string;
  tradeoff: string;
};

export type TimelineEntry = { when: string; who: string; what: string };

export type Block =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | ({ type: "figure" } & Figure)
  | { type: "decisions"; items: Decision[] }
  | { type: "timeline"; items: TimelineEntry[] }
  | { type: "subhead"; text: string };

export type Section = {
  id: string;
  heading: string;
  /** Optional reading, set apart from the main narrative (e.g. technical notes). */
  aside?: boolean;
  /** A line under the heading saying who the section is for. */
  intro?: string;
  blocks: Block[];
};

export type Fact = { label: string; value: string; detail?: string };

export type Study = {
  slug: string;
  title: string;
  /** One or two sentences: the problem and my contribution. Used on the page, the index card and in metadata. */
  summary: string;
  status: "published" | "draft" | "planned";
  /** Short, for the index card. The page's facts carry the full version. */
  role: string;
  /** Short, for the index card. */
  timeframe: string;
  tags: string[];
  /** The museum case this study expands on, by exhibit id. */
  exhibit?: string;
  /** "full" studies are the main ones; "short" ones are smaller supporting stories. */
  length?: "full" | "short";
  hero?: Figure;
  /** The at-a-glance facts under the title: role, timeframe, team, status, outcome. */
  facts?: Fact[];
  sections?: Section[];
};

export const studies: Study[] = [
  kitchenDisplay,
  {
    slug: "merchant-onboarding",
    title: "Self-service merchant onboarding",
    summary: "From hand-built processor forms to a self-serve signup, across three roles.",
    status: "planned",
    role: "Engineer, then engineering manager, then technical product manager",
    timeframe: "2019–2026",
    tags: ["Payments", "Onboarding"],
  },
  {
    slug: "menus",
    title: "One catalog, many menus",
    summary: "Named, scheduled menus built on one shared catalog.",
    status: "planned",
    role: "Software developer",
    timeframe: "2018–2021",
    tags: ["Data model", "Operator tools"],
  },
  {
    slug: "ai-engineering-workflow",
    title: "AI-assisted engineering workflow",
    summary: "Turning repeated review, triage and QA work into reusable Claude Code skills.",
    status: "planned",
    role: "Designer, builder and main user",
    timeframe: "2026",
    tags: ["Developer tools", "Process"],
  },
  {
    slug: "daily-insights-email",
    title: "The daily insights email",
    summary: "Guest ratings, feedback and a sales projection in the email venue operators read each morning.",
    status: "planned",
    role: "Software developer",
    timeframe: "2018",
    tags: ["Email", "Reporting"],
    length: "short",
  },
];

/** Studies with a page: published ones, and drafts in review. Planned ones never appear. */
export const listedStudies = studies.filter((study) => study.status !== "planned");

export function getStudy(slug: string) {
  return listedStudies.find((study) => study.slug === slug);
}

export const studyHref = (study: Pick<Study, "slug">) => `/work/${study.slug}`;

/** The museum's address for a case: /museum#case-003. The hall walks there on arrival. */
export function museumHref(exhibitId: string | undefined) {
  const exhibit = exhibits.find((item) => item.id === exhibitId);
  return exhibit ? `/museum#case-${exhibit.number}` : "/museum";
}

export function exhibitFor(study: Study) {
  return exhibits.find((item) => item.id === study.exhibit);
}

/** For the museum's labels: which cases have a study to read, keyed by exhibit id. */
export function studyLinksByExhibit(): Record<string, { href: string; title: string }> {
  const links: Record<string, { href: string; title: string }> = {};
  for (const study of listedStudies) if (study.exhibit) links[study.exhibit] = { href: studyHref(study), title: study.title };
  return links;
}

// An exhibit id that doesn't exist would leave a study without its way back to the hall.
for (const study of studies) {
  if (study.exhibit && !exhibits.some((item) => item.id === study.exhibit)) {
    throw new Error(`Study "${study.slug}" names exhibit "${study.exhibit}", which isn't in src/content/exhibits.ts.`);
  }
}
