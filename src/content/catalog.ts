// The menu. Add a skill or project by adding an entry here; its page, card,
// search result and cart behavior all come from this file.

import type { Lens } from "./site";

// Where a piece of work stands. Shown as a labeled pill, so color is never the only cue.
export type Status = "In production" | "In progress" | "Live project" | "Code only" | "Coming soon";

export type CategoryId =
  | "case-studies"
  | "product"
  | "leadership"
  | "frontend"
  | "backend"
  | "tools"
  | "projects";

export type Item = {
  slug: string;
  name: string;
  category: CategoryId;
  blurb: string;
  /** Work and projects: where it stands. */
  status?: Status;
  /** Skills: the year I started, shown as "Since 2018". */
  since?: number;
  /** Skills: how often, shown on the item page only ("Daily", "Every PR"). */
  use?: string;
  /** What came of it, from the résumé. `scope` names what the numbers measure; `note` says what they don't. */
  results?: { scope?: string; points: string[]; note?: string };
  /** Shown on another item's menu card instead of its own, e.g. Next.js on React's. Its page still exists. */
  groupedUnder?: string;
  /** A real screenshot in public/projects/. Most items have none, like most dishes on a menu. */
  image?: { src: string; alt: string };
  /** A small tag on the menu row, such as "New". */
  badge?: string;
  /** Used at GoTab. Shown under "Where I've used it". */
  gotab?: boolean;
  /** Not orderable yet. Shows "Coming soon" instead of the add button. */
  soon?: boolean;
  /** Projects: slugs of the skills that went into it. */
  ingredients?: string[];
  links?: { label: string; href: string }[];
  /** Long-form body. Case studies go here. */
  sections?: { heading: string; body: string }[];
  /** Extra search words. */
  keywords?: string;
};

export const categories: { id: CategoryId; title: string; note: string }[] = [
  { id: "case-studies", title: "GoTab Work", note: "Full case studies are on the way." },
  { id: "product", title: "Product & Delivery", note: "How I run product work from week to week." },
  { id: "leadership", title: "Team & Leadership", note: "Running a team and growing it." },
  { id: "frontend", title: "Frontend", note: "What I build screens with." },
  { id: "backend", title: "Backend & Data", note: "Services, and the data underneath them." },
  { id: "tools", title: "Tools & Platforms", note: "Where the work gets reviewed and shipped." },
  { id: "projects", title: "Projects", note: "Things I've built outside GoTab." },
];

// The three GoTab projects that lead the homepage, in order. They sit above the
// menu, so their section isn't repeated in it.
export const signature = ["merchant-onboarding", "menu-management", "kitchen-display"];

// Menu sections per tab, first to last. GoTab Work is covered by `signature`.
export const categoryOrder: Record<Lens, CategoryId[]> = {
  pm: ["product", "leadership", "projects", "backend", "frontend", "tools"],
  eng: ["frontend", "backend", "tools", "projects", "product", "leadership"],
  all: ["projects", "product", "leadership", "frontend", "backend", "tools"],
};

export const items: Item[] = [
  // ---------- GoTab work ----------
  {
    slug: "kitchen-display",
    name: "Kitchen Display System",
    category: "case-studies",
    blurb:
      "I wrote the first production version of GoTab's Kitchen Display System.",
    status: "In production",
    results: { points: ["Much of the original system remains in production."] },
    gotab: true,
    ingredients: ["javascript", "nodejs", "marko", "postgresql"],
    keywords: "kds restaurant engineering",
  },
  {
    slug: "menu-management",
    name: "Menu Management",
    category: "case-studies",
    blurb:
      "Led development of Menus, the shared menu-management system for QR ordering, POS, Kiosk and Manager Dashboard.",
    status: "In production",
    results: { points: ["A deciding factor for prospective clients at launch.", "Still core infrastructure."] },
    gotab: true,
    keywords: "menus platform qr ordering pos kiosk",
  },
  {
    slug: "merchant-onboarding",
    name: "Merchant Onboarding",
    category: "case-studies",
    blurb:
      "Built and scaled merchant onboarding, then extended it into self-serve signup with automated identity and fraud screening, removing manual setup by Customer Success.",
    status: "In production",
    results: {
      scope: "Assisted flow",
      points: [
        "Activates about 50 venues a month.",
        "65–75% of applications reach activation.",
        "Roughly 97% of those locations remain live.",
      ],
      note: "These numbers are for the assisted flow only. They don't measure self-serve signup.",
    },
    gotab: true,
    keywords: "activation self-serve signup fraud identity growth",
  },
  {
    slug: "gift-cards",
    name: "Gift Card Rebuild",
    category: "case-studies",
    blurb: "Directing the gift card rebuild across issuance, purchase, claiming and redemption in QR ordering and POS.",
    status: "In progress",
    gotab: true,
    keywords: "payments redemption qr ordering pos",
  },
  {
    slug: "gotab-case-studies",
    name: "Full Case Studies",
    category: "case-studies",
    blurb:
      "Longer write-ups of this work: the problem, my role, what shipped and what changed. Still in the kitchen. Ask for the story at checkout and I'll walk you through it.",
    status: "Coming soon",
    soon: true,
    keywords: "case study gotab restaurant",
  },

  // ---------- Product & delivery ----------
  {
    slug: "restaurant-tech",
    name: "Restaurant Tech",
    category: "product",
    blurb:
      "Eight years on a hospitality commerce platform: QR ordering, point of sale, kiosks, kitchen operations, payments and the manager tools behind them.",
    since: 2018,
    gotab: true,
    keywords: "domain hospitality pos kitchen ordering payments",
  },
  {
    slug: "roadmap",
    name: "Roadmap & Prioritization",
    category: "product",
    blurb:
      "I own the roadmap for QR ordering, POS, Kiosk, KDS and Manager Dashboard, used by roughly 2,000 venues, and set priorities for the engineers building them.",
    use: "Daily",
    gotab: true,
    keywords: "product strategy planning product management",
  },
  {
    slug: "scoping",
    name: "Technical Scoping",
    category: "product",
    blurb:
      "Turning a fuzzy ask into a write-up anyone can read, an estimate, and slices that can each merge on their own. Most recently, scoping seven platform requirements for an enterprise launch.",
    use: "Daily",
    gotab: true,
    keywords: "estimation tickets epics requirements discovery planning",
  },
  {
    slug: "prds-specs",
    groupedUnder: "scoping",
    name: "PRDs & Technical Specs",
    category: "product",
    blurb: "Writing requirements and technical specs that engineers can build from and stakeholders can read.",
    use: "Daily",
    gotab: true,
    keywords: "requirements documentation product management",
  },
  {
    slug: "ui-ux",
    name: "UI/UX & Design Review",
    category: "product",
    blurb: "Defining UI and UX standards for guest, staff and manager products through design and code review.",
    use: "Daily",
    gotab: true,
    keywords: "user experience interface standards",
  },
  {
    slug: "accessibility",
    name: "Accessibility (ADA / WCAG)",
    category: "product",
    blurb:
      "Leading ADA and WCAG remediation for guest ordering, based on prospective enterprise client requirements, and holding UI work to AA: keyboard paths, focus, labels and contrast.",
    use: "Every UI PR",
    gotab: true,
    keywords: "wcag ada a11y aria inclusive",
  },
  {
    slug: "release-management",
    name: "Release Management",
    category: "product",
    blurb: "Ran POS, KDS, TDS and Kiosk releases, handling branching, versioning, cutover and release conflicts.",
    since: 2021,
    gotab: true,
    keywords: "versioning deploy cutover delivery",
  },
  {
    slug: "bug-triage",
    name: "Bug Triage",
    category: "product",
    blurb:
      "Reproduce it, size the impact, set a severity and find the owner.",
    use: "Daily",
    results: { points: ["Eliminated more than 15 recurring sources of support requests in two months."] },
    gotab: true,
    keywords: "support incidents severity root cause",
  },
  {
    slug: "evidence",
    name: "Evidence Over Assumption",
    category: "product",
    blurb:
      "Checking rules, schema and assumptions against real production data before designing around them, and putting the query and the numbers in the PR.",
    use: "Daily",
    gotab: true,
    keywords: "analytics sql data-driven metrics",
  },
  {
    slug: "ai-delivery",
    name: "AI-Assisted Delivery",
    category: "product",
    blurb:
      "Running scoping, PR review, triage, QA and retros through my own Claude Code skills, with a context-free second reviewer and production evidence as the bar.",
    use: "Daily",
    badge: "New",
    keywords: "claude code agents llm automation workflow",
  },

  // ---------- Team & leadership ----------
  {
    slug: "engineering-management",
    name: "Engineering Management",
    category: "leadership",
    blurb:
      "Grew and managed a team of junior and mid-level engineers from 2021. Today I set priorities for 3 to 4 engineers and directly manage a team of 2.",
    since: 2021,
    gotab: true,
    keywords: "manager team people director",
  },
  {
    slug: "code-review",
    name: "Code Review & QA",
    category: "leadership",
    blurb:
      "Reviewing and testing PRs against the actual ask: does it do what was requested, what else does it touch, and how do we know it works?",
    use: "Daily",
    gotab: true,
    keywords: "pull requests testing quality",
  },
  {
    slug: "hiring-mentoring",
    groupedUnder: "engineering-management",
    name: "Hiring & Onboarding",
    category: "leadership",
    blurb: "Technical hiring and onboarding as the team grew, and bringing junior engineers along through code review.",
    since: 2021,
    gotab: true,
    keywords: "interviews coaching mentoring junior developers",
  },

  // ---------- Frontend ----------
  {
    slug: "javascript",
    name: "JavaScript",
    category: "frontend",
    blurb: "My first language and still my daily one, on both sides of the stack. ES6 and beyond.",
    since: 2017,
    gotab: true,
    keywords: "es6 js",
  },
  {
    slug: "typescript",
    groupedUnder: "javascript",
    name: "TypeScript",
    category: "frontend",
    blurb: "My default for new projects, including this one.",
    since: 2022,
    keywords: "ts types",
  },
  {
    slug: "marko",
    name: "Marko",
    category: "frontend",
    blurb: "The UI framework behind production GoTab screens. Rarer than React, and I know its sharp edges.",
    since: 2018,
    gotab: true,
    keywords: "markojs mobx",
  },
  {
    slug: "react",
    name: "React",
    category: "frontend",
    blurb: "Components, hooks and state. This site runs on it.",
    since: 2018,
    keywords: "reactjs redux hooks",
  },
  {
    slug: "nextjs",
    groupedUnder: "react",
    name: "Next.js",
    category: "frontend",
    blurb: "My pick for React sites that need real URLs and prerendered pages.",
    since: 2022,
    keywords: "nextjs ssr static",
  },
  {
    slug: "html-css",
    name: "HTML & CSS",
    category: "frontend",
    blurb: "Semantic markup and responsive layouts, mobile-first.",
    since: 2017,
    keywords: "responsive mobile layout",
  },
  {
    slug: "sass",
    groupedUnder: "html-css",
    name: "Sass",
    category: "frontend",
    blurb: "SCSS for larger stylesheets, from client sites to production apps.",
    since: 2018,
    keywords: "scss css",
  },
  {
    slug: "tailwind",
    groupedUnder: "html-css",
    name: "Tailwind CSS",
    category: "frontend",
    blurb: "Utility-first styling for quick, consistent UI. This site's stylesheet.",
    since: 2022,
    keywords: "css utility",
  },
  {
    slug: "bootstrap",
    groupedUnder: "html-css",
    name: "Bootstrap",
    category: "frontend",
    blurb: "A long-time standard for me, in production at GoTab and on earlier projects.",
    since: 2017,
    gotab: true,
    keywords: "css jquery",
  },

  // ---------- Backend & data ----------
  {
    slug: "nodejs",
    name: "Node.js",
    category: "backend",
    blurb: "Services, queue handlers and scripts. The other half of my day-to-day JavaScript.",
    since: 2018,
    gotab: true,
    keywords: "node server javascript backend",
  },
  {
    slug: "express",
    groupedUnder: "nodejs",
    name: "Express",
    category: "backend",
    blurb: "REST APIs and small servers.",
    since: 2018,
    keywords: "rest api server",
  },
  {
    slug: "postgresql",
    name: "PostgreSQL",
    category: "backend",
    blurb:
      "Schema design, migrations, query tuning and reading production data to settle arguments. A product person who writes their own SQL saves everyone a ticket.",
    since: 2018,
    gotab: true,
    keywords: "sql database postgres migrations data",
  },

  {
    slug: "sql",
    groupedUnder: "postgresql",
    name: "SQL",
    category: "backend",
    blurb: "Writing the queries behind features, and reading production data to answer product questions.",
    since: 2018,
    gotab: true,
    keywords: "queries data analytics database",
  },
  {
    slug: "schema-design",
    groupedUnder: "postgresql",
    name: "Schema Design",
    category: "backend",
    blurb: "Modeling data so features hold up across products and venues.",
    since: 2018,
    gotab: true,
    keywords: "database modeling migrations",
  },
  {
    slug: "rest-apis",
    groupedUnder: "nodejs",
    name: "REST APIs",
    category: "backend",
    blurb: "Designing and building the APIs between clients and services.",
    since: 2018,
    gotab: true,
    keywords: "api services backend",
  },

  // ---------- Tools ----------
  {
    slug: "git-github",
    name: "Git & GitHub",
    category: "tools",
    blurb: "Branches, reviews, project boards and release branches. Where most of my day happens.",
    since: 2017,
    gotab: true,
    keywords: "version control pull requests",
  },
  {
    slug: "testing",
    name: "Jest & Cypress",
    category: "tools",
    blurb: "Unit and component tests with Jest, browser tests with Cypress.",
    use: "Every PR",
    keywords: "unit integration e2e qa",
  },
  {
    slug: "vercel",
    name: "Vercel",
    category: "tools",
    blurb: "Previews on every PR and quick deploys. This site lives here.",
    since: 2021,
    keywords: "hosting deploy",
  },
  {
    slug: "cloudflare",
    groupedUnder: "vercel",
    name: "Cloudflare",
    category: "tools",
    blurb: "Workers for small edge services, plus static hosting for side projects.",
    since: 2025,
    keywords: "workers serverless wrangler hosting deploy edge",
  },
  {
    slug: "claude-code",
    groupedUnder: "ai-delivery",
    name: "Claude Code",
    category: "tools",
    blurb: "My daily coding agent, set up with custom skills, hooks and review rules.",
    since: 2025,
    badge: "New",
    keywords: "ai agents llm",
  },

  // ---------- Projects ----------
  {
    slug: "anjali-taneja",
    name: "Anjali Taneja",
    category: "projects",
    blurb:
      "Website for a DC music artist, built around a playable retro radio with drag-to-turn knobs and stations you can tune between.",
    image: { src: "/projects/anjali-taneja.jpg", alt: "A cream-colored retro radio with two speakers, under the Anjali Taneja site header" },
    status: "Live project",
    ingredients: ["javascript", "html-css"],
    links: [
      { label: "View project", href: "https://www.anjalitaneja.com" },
      { label: "View code", href: "https://github.com/ziggysauce/anjali_taneja" },
    ],
    keywords: "music artist client website radio",
  },
  {
    slug: "chem-cleanup",
    name: "Chem Cleanup",
    category: "projects",
    blurb: "A minesweeper game with easy, medium and hard boards and a classic desktop look.",
    image: { src: "/projects/chem-cleanup.jpg", alt: "A minesweeper board with a mine counter, smiley button and timer" },
    status: "Live project",
    ingredients: ["nextjs", "react", "typescript", "tailwind", "testing"],
    links: [
      { label: "View project", href: "https://chemcleanup.vercel.app/" },
      { label: "View code", href: "https://github.com/ziggysauce/minesweeper" },
    ],
    keywords: "game minesweeper",
  },
  {
    slug: "this-site",
    name: "This Site",
    category: "projects",
    blurb:
      "You're ordering from it. A portfolio shaped like the kind of product I work on: static pages, a real cart, and no backend to keep alive.",
    status: "Live project",
    ingredients: ["nextjs", "react", "typescript", "tailwind", "vercel", "claude-code"],
    links: [{ label: "View code", href: "https://github.com/ziggysauce/portfolio" }],
    keywords: "portfolio meta ordering",
  },
  {
    slug: "favorite-fonts",
    name: "Favorite Fonts",
    category: "projects",
    blurb: "A font browser built on the Google Fonts API, with live text previews.",
    status: "Code only",
    ingredients: ["react", "nodejs", "express", "sass", "bootstrap"],
    links: [{ label: "View code", href: "https://github.com/ziggysauce/favorite-fonts" }],
    keywords: "google fonts api typography",
  },
  {
    slug: "gecho",
    name: "Gecho",
    category: "projects",
    blurb: "A video-music player built on YouTube's API with a small team.",
    status: "Code only",
    ingredients: ["javascript", "html-css", "nodejs"],
    links: [{ label: "View code", href: "https://github.com/chingu-voyage4/Geckos-Team-32" }],
    keywords: "youtube music video team chingu",
  },
];

const bySlug = new Map(items.map((item) => [item.slug, item]));

export function getItem(slug: string): Item | undefined {
  return bySlug.get(slug);
}

/** Throws on a typo so a bad slug fails the build instead of shipping a hole. */
export function requireItem(slug: string): Item {
  const item = bySlug.get(slug);
  if (!item) throw new Error(`Unknown catalog slug: ${slug}`);
  return item;
}

export function itemsIn(category: CategoryId): Item[] {
  return items.filter((item) => item.category === category);
}

/** The cards a menu section shows: grouped items ride on their parent's card instead. */
export function menuCardsIn(category: CategoryId): Item[] {
  return itemsIn(category).filter((item) => !item.groupedUnder);
}

/** Items shown on this item's card, such as Next.js on React's. */
export function groupedWith(slug: string): Item[] {
  return items.filter((item) => item.groupedUnder === slug);
}

/** Projects that list this skill as an ingredient. */
export function foundIn(slug: string): Item[] {
  return items.filter((item) => item.ingredients?.includes(slug));
}

/** Same section first, skipping the item itself and anything not ready. */
export function related(item: Item, limit = 6): Item[] {
  const ingredients = (item.ingredients ?? []).map(requireItem);
  const usedIn = foundIn(item.slug);
  const sameSection = itemsIn(item.category);
  const seen = new Set<string>([item.slug]);
  const out: Item[] = [];
  for (const candidate of [...ingredients, ...usedIn, ...sameSection]) {
    if (seen.has(candidate.slug) || candidate.soon) continue;
    seen.add(candidate.slug);
    out.push(candidate);
    if (out.length === limit) break;
  }
  return out;
}

// Years of experience count up to this year. Bump it each January. It's fixed
// rather than read from the clock so prerendered HTML and the browser always agree.
const CONTENT_YEAR = 2026;

export function yearsSince(since: number): number {
  return Math.max(1, CONTENT_YEAR - since);
}

// A typo in a cross-reference fails the build instead of shipping a hole.
signature.forEach(requireItem);
items.forEach((item) => item.groupedUnder && requireItem(item.groupedUnder));

export function search(query: string): Item[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return items.filter((item) =>
    `${item.name} ${item.blurb} ${item.keywords ?? ""} ${item.category}`.toLowerCase().includes(needle),
  );
}
