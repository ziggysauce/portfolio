// Selected work: the case studies behind the museum. The museum introduces the career; these pages are
// the evidence. Add a study by adding an entry to `studies`; its page, index card and museum links come
// from that entry.
//
// `status` decides where a study shows:
//   "published"  listed on /work, has a page, linked from the museum
//   "draft"      the same, but marked Draft and kept out of search engines. Not cleared for publication:
//                its facts are waiting on Daniel's review (see docs/case-studies/).
//   "planned"    recorded here only. No page, no card, no link.
//
// Each study's copy lives in its own file under src/content/studies/, so it can be edited without touching
// layout. Sections are free-form: a study uses the blocks it needs, in its own order.

import { exhibits } from "./exhibits";
import { dailyInsights } from "./studies/daily-insights";
import { kitchenDisplay } from "./studies/kitchen-display";
import { menus } from "./studies/menus";
import { merchantOnboarding } from "./studies/merchant-onboarding";
import { reviewLoop } from "./studies/review-loop";

/** The visuals a study can place. Each is drawn in src/components/work/figures.tsx. */
export type FigureKey =
  | "kds-hero"
  | "kds-screen"
  | "kds-flow"
  | "onboarding-hero"
  | "menus-hero"
  | "menus-availability"
  | "loop-hero"
  | "loop-review"
  | "insights-email";

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

/** A choice worth explaining. Only `title` and `body` are required; add the rest when the story has them. */
export type Decision = {
  title: string;
  when?: string;
  body: string;
  /** What we could have done instead. */
  alternative?: string;
  /** What the choice cost, or what it set up for later. */
  tradeoff?: string;
  /** Heading for `tradeoff` when it's really an outcome, e.g. "What changed". Defaults to "The tradeoff". */
  tradeoffLabel?: string;
};

/** A step in a short evolution: when, what, and a few words of status (e.g. "Shipped", "In internal testing"). */
export type TimelineEntry = { when: string; what: string; tag?: string };

export type Block =
  | { type: "p"; text: string }
  /** `ordered` numbers the items; `leads` sets each item's first sentence in bold, as its name. */
  | { type: "list"; items: string[]; ordered?: boolean; leads?: boolean }
  | ({ type: "figure" } & Figure)
  | { type: "decisions"; items: Decision[] }
  | { type: "timeline"; items: TimelineEntry[] }
  | { type: "subhead"; text: string };

export type Section = {
  id: string;
  heading: string;
  /** Optional reading, set apart from the main narrative. */
  aside?: boolean;
  /** A line under the heading saying who the section is for. */
  intro?: string;
  blocks: Block[];
};

export type Fact = { label: string; value: string; detail?: string };

export type Study = {
  slug: string;
  title: string;
  /** Two or three words, for compact links such as the museum's labels. */
  shortTitle: string;
  /** One or two sentences: the problem and my part. Used on the page, the index card and in metadata. */
  summary: string;
  status: "published" | "draft" | "planned";
  /** Short, for the index card. The page's facts carry the full version. */
  role: string;
  /** Short, for the index card. */
  timeframe: string;
  tags: string[];
  /** The museum case this study belongs to, by exhibit id: "Return to museum" goes there. */
  exhibit?: string;
  /** Museum cases whose labels link to this study. Defaults to `exhibit`; [] for none. */
  featuredOn?: string[];
  /** "full" studies are the main ones; "short" ones are smaller supporting stories. */
  length?: "full" | "short";
  hero?: Figure;
  /** The at-a-glance facts under the title: role first, then when, status and the like. */
  facts?: Fact[];
  sections?: Section[];
};

// Index order: the four main studies, then the shorter supporting one.
export const studies: Study[] = [kitchenDisplay, merchantOnboarding, menus, reviewLoop, dailyInsights];

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

export type StudyLink = { href: string; title: string; shortTitle: string };

/** For the museum's labels: the studies each case links to, keyed by exhibit id, in index order. */
export function studyLinksByExhibit(): Record<string, StudyLink[]> {
  const links: Record<string, StudyLink[]> = {};
  for (const study of listedStudies) {
    for (const id of study.featuredOn ?? (study.exhibit ? [study.exhibit] : [])) {
      (links[id] ??= []).push({ href: studyHref(study), title: study.title, shortTitle: study.shortTitle });
    }
  }
  return links;
}

// An exhibit id that doesn't exist would leave a study without its way back to the hall.
for (const study of studies) {
  for (const id of [study.exhibit, ...(study.featuredOn ?? [])]) {
    if (id && !exhibits.some((item) => item.id === id)) {
      throw new Error(`Study "${study.slug}" names exhibit "${id}", which isn't in src/content/exhibits.ts.`);
    }
  }
}
