// The menu. Add a skill or project by adding an entry here; its page, card,
// search result and cart behavior all come from this file.

import type { Lens } from "./site";

export type Pack = "cup" | "can" | "bag" | "jar" | "box" | "bottle";

export type Art =
  | { pack: Pack; tint: string; ink: string; label: string }
  | { image: string; alt: string };

// What shows in the price slot.
//   since: years of experience, worked out from a start year.
//   free:  public projects, shown as $0.00.
//   text:  anything else ("Daily", "Market price").
export type Price = { since: number } | { free: true } | { text: string };

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
  price: Price;
  art: Art;
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
  { id: "case-studies", title: "Case Studies", note: "From the GoTab kitchen" },
  { id: "product", title: "Product & Delivery", note: "Single origin, roasted in production" },
  { id: "leadership", title: "Team & Leadership", note: "Served family style" },
  { id: "frontend", title: "Frontend", note: "Poured fresh daily" },
  { id: "backend", title: "Backend & Data", note: "From the pantry" },
  { id: "tools", title: "Tools & Platforms", note: "Stocked and ready" },
  { id: "projects", title: "Projects", note: "Made to order" },
];

// Which aisles come first, and what goes on the "Start Here" shelf, per role.
export const categoryOrder: Record<Lens, CategoryId[]> = {
  pm: ["case-studies", "product", "leadership", "projects", "backend", "frontend", "tools"],
  eng: ["case-studies", "frontend", "backend", "tools", "projects", "product", "leadership"],
  all: ["case-studies", "projects", "product", "leadership", "frontend", "backend", "tools"],
};

export const featured: Record<Lens, string[]> = {
  pm: ["restaurant-tech", "scoping", "feature-lifecycle", "evidence", "ai-delivery", "engineering-management"],
  eng: ["javascript", "postgresql", "nodejs", "marko", "anjali-taneja", "ai-delivery"],
  all: ["restaurant-tech", "scoping", "javascript", "postgresql", "anjali-taneja", "engineering-management"],
};

const bag = (tint: string, label: string): Art => ({ pack: "bag", tint, ink: "#111111", label });
const bottle = (tint: string, label: string): Art => ({ pack: "bottle", tint, ink: "#111111", label });
const cup = (tint: string, label: string, ink = "#ffffff"): Art => ({ pack: "cup", tint, ink, label });
const can = (tint: string, label: string, ink = "#ffffff"): Art => ({ pack: "can", tint, ink, label });
const jar = (tint: string, label: string): Art => ({ pack: "jar", tint, ink: "#111111", label });
const box = (tint: string, label: string, ink = "#ffffff"): Art => ({ pack: "box", tint, ink, label });

export const items: Item[] = [
  // ---------- Case studies ----------
  {
    slug: "gotab-case-studies",
    name: "GoTab Case Studies",
    category: "case-studies",
    blurb:
      "Write-ups of real product work at GoTab: the problem, my role, what shipped and what changed. Still in the kitchen. Ask for the story at checkout and I'll walk you through it.",
    price: { text: "Coming soon" },
    art: bag("#c9a77c", "SOON"),
    soon: true,
    badge: "Soon",
    keywords: "case study gotab restaurant",
  },

  // ---------- Product & delivery ----------
  {
    slug: "restaurant-tech",
    name: "Restaurant Tech",
    category: "product",
    blurb:
      "Years of building for operators: ordering, the kitchen, the people on shift, and all the configuration that makes every venue a little different.",
    price: { since: 2018 },
    art: bag("#f1c9a5", "RESTO"),
    gotab: true,
    badge: "GoTab",
    keywords: "domain hospitality pos kitchen ordering",
  },
  {
    slug: "scoping",
    name: "Scoping & Slicing",
    category: "product",
    blurb:
      "Turning a fuzzy feature ask into a write-up anyone can read, then an epic with slices that can each merge on their own.",
    price: { text: "Daily" },
    art: bag("#d8dcc0", "SCOPE"),
    gotab: true,
    keywords: "tickets epics requirements discovery planning product management",
  },
  {
    slug: "feature-lifecycle",
    name: "Feature Lifecycle Tracking",
    category: "product",
    blurb:
      "Following work from discussed to written, assigned, PR open and merged on a GitHub project board, and watching cycle time to spot where it stalls.",
    price: { text: "Daily" },
    art: bag("#c6d8e4", "TRACK"),
    gotab: true,
    keywords: "project board roadmap sprint planning cycle time delivery",
  },
  {
    slug: "bug-triage",
    name: "Bug Triage",
    category: "product",
    blurb:
      "Reproduce it, size the impact, set a severity and find the owner. The first question is always whether it happens for a second venue with a different config.",
    price: { text: "Daily" },
    art: bag("#efc4bd", "TRIAGE"),
    gotab: true,
    keywords: "support incidents severity root cause",
  },
  {
    slug: "evidence",
    name: "Evidence Over Assumption",
    category: "product",
    blurb:
      "Checking rules, schema and assumptions against real production data before designing around them, and putting the query and the numbers in the PR.",
    price: { text: "Daily" },
    art: bag("#e6dcb0", "DATA"),
    gotab: true,
    keywords: "analytics sql data-driven metrics",
  },
  {
    slug: "accessibility",
    name: "Accessibility Reviews",
    category: "product",
    blurb:
      "Holding UI work to WCAG 2.1 AA: keyboard paths, focus, labels, contrast and color that isn't the only signal.",
    price: { text: "Every UI PR" },
    art: bag("#d6cfe6", "A11Y"),
    gotab: true,
    keywords: "wcag a11y aria inclusive",
  },
  {
    slug: "ai-delivery",
    name: "AI-Assisted Delivery",
    category: "product",
    blurb:
      "Running scoping, PR review, triage, QA and retros through my own Claude Code skills, with a context-free second reviewer and production evidence as the bar.",
    price: { text: "Daily" },
    art: bag("#e9b89f", "AI"),
    badge: "New",
    keywords: "claude code agents llm automation workflow",
  },

  // ---------- Team & leadership ----------
  {
    slug: "engineering-management",
    name: "Engineering Management",
    category: "leadership",
    blurb:
      "Leading developers at GoTab: planning the work, unblocking reviews and keeping delivery moving while staying close enough to the code to help.",
    price: { text: "Daily" },
    art: bottle("#c9d6c3", "LEAD"),
    gotab: true,
    badge: "GoTab",
    keywords: "manager team people",
  },
  {
    slug: "code-review",
    name: "Code Review & QA",
    category: "leadership",
    blurb:
      "Reviewing and testing PRs against the actual ask: does it do what was requested, what else does it touch, and how do we know it works?",
    price: { text: "Daily" },
    art: bottle("#d9d2c0", "REVIEW"),
    gotab: true,
    keywords: "pull requests testing quality",
  },
  {
    slug: "hiring-mentoring",
    name: "Hiring & Mentoring",
    category: "leadership",
    blurb: "Helping hire as the team grew, and bringing junior developers up through review and pairing.",
    price: { text: "Ongoing" },
    art: bottle("#e7cfc0", "GROW"),
    gotab: true,
    keywords: "interviews coaching junior developers",
  },

  // ---------- Frontend ----------
  {
    slug: "javascript",
    name: "JavaScript",
    category: "frontend",
    blurb: "My first language and still my daily one, on both sides of the stack. ES6 and beyond.",
    price: { since: 2017 },
    art: cup("#e8c92c", "JS", "#111111"),
    gotab: true,
    keywords: "es6 js",
  },
  {
    slug: "typescript",
    name: "TypeScript",
    category: "frontend",
    blurb: "My default for new projects, including this one.",
    price: { since: 2022 },
    art: cup("#3178c6", "TS"),
    keywords: "ts types",
  },
  {
    slug: "marko",
    name: "Marko",
    category: "frontend",
    blurb: "The UI framework behind production GoTab screens. Rarer than React, and I know its sharp edges.",
    price: { since: 2018 },
    art: cup("#d6336c", "MARKO"),
    gotab: true,
    badge: "GoTab",
    keywords: "markojs mobx",
  },
  {
    slug: "react",
    name: "React",
    category: "frontend",
    blurb: "Components, hooks and state. This site runs on it.",
    price: { since: 2018 },
    art: cup("#1c8fb5", "REACT"),
    keywords: "reactjs redux hooks",
  },
  {
    slug: "nextjs",
    name: "Next.js",
    category: "frontend",
    blurb: "My pick for React sites that need real URLs and prerendered pages.",
    price: { since: 2022 },
    art: cup("#1b1b1b", "NEXT"),
    keywords: "nextjs ssr static",
  },
  {
    slug: "html-css",
    name: "HTML & CSS",
    category: "frontend",
    blurb: "Semantic markup and responsive layouts, mobile-first.",
    price: { since: 2017 },
    art: cup("#e2622f", "HTML"),
    keywords: "responsive mobile layout",
  },
  {
    slug: "sass",
    name: "Sass",
    category: "frontend",
    blurb: "SCSS for larger stylesheets, from client sites to production apps.",
    price: { since: 2018 },
    art: cup("#c76494", "SASS"),
    keywords: "scss css",
  },
  {
    slug: "tailwind",
    name: "Tailwind CSS",
    category: "frontend",
    blurb: "Utility-first styling for quick, consistent UI. This site's stylesheet.",
    price: { since: 2022 },
    art: cup("#0e9fb8", "WIND"),
    keywords: "css utility",
  },
  {
    slug: "bootstrap",
    name: "Bootstrap",
    category: "frontend",
    blurb: "A long-time standard for me, in production at GoTab and on earlier projects.",
    price: { since: 2017 },
    art: cup("#7952b3", "BOOT"),
    gotab: true,
    keywords: "css jquery",
  },

  // ---------- Backend & data ----------
  {
    slug: "nodejs",
    name: "Node.js",
    category: "backend",
    blurb: "Services, queue handlers and scripts. The other half of my day-to-day JavaScript.",
    price: { since: 2018 },
    art: can("#3c873a", "NODE"),
    gotab: true,
    keywords: "node server javascript backend",
  },
  {
    slug: "express",
    name: "Express",
    category: "backend",
    blurb: "REST APIs and small servers.",
    price: { since: 2018 },
    art: can("#3a3a3a", "EXPRESS"),
    keywords: "rest api server",
  },
  {
    slug: "postgresql",
    name: "PostgreSQL",
    category: "backend",
    blurb:
      "Schema design, migrations, query tuning and reading production data to settle arguments. A product person who writes their own SQL saves everyone a ticket.",
    price: { since: 2018 },
    art: jar("#5b86ad", "POSTGRES"),
    gotab: true,
    badge: "GoTab",
    keywords: "sql database postgres migrations data",
  },
  {
    slug: "mysql",
    name: "MySQL",
    category: "backend",
    blurb: "Relational modeling and SQL outside the Postgres world.",
    price: { since: 2018 },
    art: jar("#e0a458", "MYSQL"),
    keywords: "sql database",
  },
  {
    slug: "graphql",
    name: "GraphQL",
    category: "backend",
    blurb: "Schemas and clients, including Apollo.",
    price: { since: 2019 },
    art: can("#d6249f", "GRAPHQL"),
    keywords: "apollo api",
  },
  {
    slug: "mongodb",
    name: "MongoDB",
    category: "backend",
    blurb: "Document modeling with Mongoose.",
    price: { since: 2018 },
    art: jar("#7cb88a", "MONGO"),
    keywords: "database nosql mongoose",
  },

  // ---------- Tools ----------
  {
    slug: "git-github",
    name: "Git & GitHub",
    category: "tools",
    blurb: "Branches, reviews, project boards and release branches. Where most of my day happens.",
    price: { since: 2017 },
    art: box("#d9502e", "GIT"),
    gotab: true,
    keywords: "version control pull requests",
  },
  {
    slug: "testing",
    name: "Jest & Cypress",
    category: "tools",
    blurb: "Unit and component tests with Jest, browser tests with Cypress. Tests run before anything gets pushed.",
    price: { text: "Every PR" },
    art: box("#8f5a3c", "TEST"),
    keywords: "unit integration e2e qa",
  },
  {
    slug: "cloudflare",
    name: "Cloudflare Workers",
    category: "tools",
    blurb: "Small edge services and static hosting for side projects.",
    price: { since: 2025 },
    art: box("#ee7f1f", "EDGE", "#111111"),
    keywords: "serverless wrangler hosting",
  },
  {
    slug: "vercel",
    name: "Vercel",
    category: "tools",
    blurb: "Previews on every PR and quick deploys. This site lives here.",
    price: { since: 2021 },
    art: box("#1b1b1b", "SHIP"),
    keywords: "hosting deploy",
  },
  {
    slug: "claude-code",
    name: "Claude Code",
    category: "tools",
    blurb: "My daily coding agent, set up with custom skills, hooks and review rules.",
    price: { since: 2025 },
    art: box("#c96f4a", "CLAUDE"),
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
    price: { free: true },
    art: { image: "/projects/anjali-taneja.jpg", alt: "A cream-colored retro radio with two speakers, under the Anjali Taneja site header" },
    badge: "Live",
    ingredients: ["javascript", "html-css"],
    links: [
      { label: "Visit site", href: "https://www.anjalitaneja.com" },
      { label: "View code", href: "https://github.com/ziggysauce/anjali_taneja" },
    ],
    keywords: "music artist client website radio",
  },
  {
    slug: "chem-cleanup",
    name: "Chem Cleanup",
    category: "projects",
    blurb: "A minesweeper game with easy, medium and hard boards and a classic desktop look.",
    price: { free: true },
    art: { image: "/projects/chem-cleanup.jpg", alt: "A minesweeper board with a mine counter, smiley button and timer" },
    badge: "Live",
    ingredients: ["nextjs", "react", "typescript", "tailwind", "testing"],
    links: [
      { label: "Play it", href: "https://chemcleanup.vercel.app/" },
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
    price: { free: true },
    art: box("#111111", "dtn."),
    badge: "Live",
    ingredients: ["nextjs", "react", "typescript", "tailwind", "vercel", "claude-code"],
    links: [{ label: "View code", href: "https://github.com/ziggysauce/portfolio" }],
    keywords: "portfolio meta ordering",
  },
  {
    slug: "favorite-fonts",
    name: "Favorite Fonts",
    category: "projects",
    blurb: "A font browser built on the Google Fonts API, with live text previews. Code only for now.",
    price: { free: true },
    art: box("#4b6fd6", "Aa"),
    ingredients: ["react", "nodejs", "express", "sass", "bootstrap"],
    links: [{ label: "View code", href: "https://github.com/ziggysauce/favorite-fonts" }],
    keywords: "google fonts api typography",
  },
  {
    slug: "gecho",
    name: "Gecho",
    category: "projects",
    blurb: "A video-music player built on YouTube's API with a small team. Code only.",
    price: { free: true },
    art: box("#b23a48", "PLAY"),
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

/** Projects that list this skill as an ingredient. */
export function foundIn(slug: string): Item[] {
  return items.filter((item) => item.ingredients?.includes(slug));
}

/** Same aisle first, skipping the item itself and anything not ready. */
export function related(item: Item, limit = 6): Item[] {
  const ingredients = (item.ingredients ?? []).map(requireItem);
  const usedIn = foundIn(item.slug);
  const sameAisle = itemsIn(item.category);
  const seen = new Set<string>([item.slug]);
  const out: Item[] = [];
  for (const candidate of [...ingredients, ...usedIn, ...sameAisle]) {
    if (seen.has(candidate.slug) || candidate.soon) continue;
    seen.add(candidate.slug);
    out.push(candidate);
    if (out.length === limit) break;
  }
  return out;
}

export function yearsSince(since: number): number {
  return Math.max(1, new Date().getFullYear() - since);
}

export function search(query: string): Item[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return items.filter((item) =>
    `${item.name} ${item.blurb} ${item.keywords ?? ""} ${item.category}`.toLowerCase().includes(needle),
  );
}
