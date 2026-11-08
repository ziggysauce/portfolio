// Everything personal that isn't a menu item. Edit freely.

export const site = {
  name: "Daniel Nguyen",
  firstName: "Daniel",
  wordmark: "dtn.",
  location: "Washington, DC",
  replyTime: "Replies within a day",
  tagline: "Technical Product Management and Software Engineering",
  headline: "From the line to the leadership table.",
  email: "dtn3423@gmail.com",
  linkedin: "https://www.linkedin.com/in/dtn3423/",
  github: "https://github.com/ziggysauce",
  resume: "/Daniel_Nguyen_Resume.pdf",
  url: "https://www.danieltnguyen.com",
  ogImage: { url: "/og.png", width: 1200, height: 630, alt: "Daniel Nguyen's portfolio, built like an ordering app" },
  description:
    "Daniel Nguyen is a technical product leader and hands-on engineer with eight years at GoTab, a hospitality commerce platform.",
};

export type Lens = "pm" | "eng" | "all";

export const lenses: { id: Lens; label: string; picks: string; pitch: string }[] = [
  {
    id: "pm",
    label: "Product",
    picks: "from the product side",
    pitch:
      "Director of Technical Product Management at GoTab. I own the roadmap for QR ordering, POS, Kiosk, KDS and Manager Dashboard, used by roughly 2,000 venues, and I still write production code.",
  },
  {
    id: "eng",
    label: "Engineering",
    picks: "from the engineering side",
    pitch:
      "Hands-on engineer with eight years at GoTab. I wrote the first production version of its Kitchen Display System and still ship fixes, UI improvements and small features.",
  },
  {
    id: "all",
    label: "Everything",
    picks: "from the whole menu",
    pitch:
      "Technical product leader and hands-on engineer with eight years at GoTab, from software developer through engineering management to Director of Technical Product Management.",
  },
];

export const company = {
  name: "GoTab",
  place: "Washington, DC",
  about: "Hospitality commerce platform for ordering, point of sale, kitchen operations and payments.",
};

// Work history, newest first. Each role is an order on /orders and a line on the Profile page.
// `items` are menu slugs this role's notes back up; an unknown slug fails the build.
export const roles = [
  {
    id: "director",
    title: "Director, Technical Product Management",
    dates: "July 2026 to present",
    current: true,
    items: ["gift-cards", "roadmap", "accessibility", "ui-ux", "scoping", "bug-triage"],
    notes: [
      "Own the roadmap for QR ordering, POS, Kiosk, KDS and Manager Dashboard, used by roughly 2,000 venues. Set priorities for 3 to 4 engineers and directly manage a team of 2.",
      "Ship production fixes, UI improvements and small features. Eliminated more than 15 recurring sources of support requests in two months by fixing underlying product and engineering issues.",
      "Direct the gift card rebuild across issuance, purchase, claiming and redemption in QR ordering and POS.",
      "Lead ADA and WCAG remediation for guest ordering based on prospective enterprise client requirements.",
      "Define UI and UX standards for guest, staff and manager products through design and code review.",
      "Scoped seven platform requirements for an enterprise launch.",
    ],
  },
  {
    id: "engineering-manager",
    title: "Engineering Manager",
    dates: "June 2021 to July 2026",
    current: false,
    items: ["menu-management", "merchant-onboarding", "engineering-management", "code-review", "hiring-mentoring", "release-management"],
    notes: [
      "Led development of Menus, the shared menu-management system for QR ordering, POS, Kiosk and Manager Dashboard. A deciding factor for prospective clients at launch, it remains core infrastructure.",
      "Built and scaled merchant onboarding. The assisted flow activates about 50 venues a month at a 65-75% application-to-activation rate; roughly 97% of those locations remain live.",
      "Extended onboarding into self-serve signup with automated identity and fraud screening, removing manual setup by Customer Success.",
      "Grew and managed a team of junior and mid-level engineers; led code reviews, technical hiring and onboarding.",
      "Ran POS, KDS, TDS and Kiosk releases, handling branching, versioning, cutover and release conflicts.",
    ],
  },
  {
    id: "software-developer",
    title: "Software Developer",
    dates: "June 2018 to June 2021",
    current: false,
    items: ["kitchen-display", "javascript", "nodejs", "marko", "postgresql"],
    notes: [
      "Wrote the first production version of GoTab's Kitchen Display System. Much of the original system remains in production.",
      "Shipped full-stack features for ordering and display systems in JavaScript, Node.js, MarkoJS and PostgreSQL.",
    ],
  },
];

export const education = [
  { school: "Rutgers University", degree: "M.S., Biomedical Science", year: "2016" },
  { school: "University of Michigan", degree: "B.S., Evolutionary Anthropology", year: "2015" },
];

export const offHours =
  "When I'm not working, I'm in the kitchen experimenting with new dishes, out for a run, at the local Michigan bar cheering on my alma mater (go blue), or behind a keyboard playing video games.";
