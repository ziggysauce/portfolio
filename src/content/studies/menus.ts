// Case study: Menus and the operator dashboard, 2018–2021.
// DRAFT. Sources, attribution and open questions: docs/case-studies/menus.md.

import type { Study } from "../work";

export const menus: Study = {
  slug: "menus",
  title: "Making complex menus easier to manage",
  shortTitle: "Menus",
  summary:
    "Restaurants needed different menus for different times, places and guests without keeping several copies of their catalog. I led development of Menus: named, scheduled menus built on top of one shared catalog.",
  status: "draft",
  role: "Software developer",
  timeframe: "2018–2021",
  tags: ["Operator tools", "Data model", "Menus"],
  exhibit: "marker",
  length: "full",
  hero: {
    figure: "menus-hero",
    caption: "Each menu picks categories from one shared catalog and adds its own schedule, places and audience.",
    label: "Simplified diagram · Sample data",
  },
  facts: [
    {
      label: "My role",
      value: "Software developer on a small team. I built much of the operator dashboard from 2018, and led development of Menus with our product lead and teammates.",
    },
    { label: "When", value: "2018 to 2021. Menus launched in November 2020." },
    { label: "Status", value: "In production. Menus is still core to GoTab’s product." },
  ],
  sections: [
    {
      id: "problem",
      heading: "One catalog, many situations",
      blocks: [
        {
          type: "p",
          text: "Restaurant operators manage their ordering in GoTab’s dashboard. When I joined in 2018 it was small, and over the next two years I built many of its screens: products, categories, ordering areas, kitchen devices, refunds, sales and a log of who changed what.",
        },
        {
          type: "p",
          text: "Each venue had one catalog. Operators could put schedules on categories and products, and could show different things in different areas of a venue. That handles “closed after lunch.” It doesn’t handle a holiday menu guests can order from in October for pickup in late November, or a menu only one group of guests (a segment) can see. Our product lead asked for menus.",
        },
      ],
    },
    {
      id: "role",
      heading: "My role",
      blocks: [
        {
          type: "p",
          text: "I led development of Menus. I built the operator’s Menus page, the guest side, the schedule rules and the options around them (tag filters, guest segments, QR codes, and switching between menus), and I worked with teammates who wrote some of the database logic underneath. Earlier, I’d also done most of the work restructuring the dashboard’s code, which made room for features like this.",
        },
      ],
    },
    {
      id: "approach",
      heading: "What we built, and why",
      blocks: [
        {
          type: "decisions",
          items: [
            {
              title: "Build menus on top of the catalog, not as copies of it",
              body: "The first sketch stored a list of categories on each menu. I changed it to links between menus and categories, and between menus and the areas they serve. Each link carries its own label, description and order, so a menu can present a category its own way.",
              alternative: "Copying categories and products into each menu.",
              tradeoff: "Products stay in one place. A price change applies to every menu, and nothing drifts out of sync between copies.",
            },
            {
              title: "Give each location one source of truth for availability",
              body: "After launch, a product could have its own schedule, its category’s schedule and the schedules of every menu it appeared in. That was too many rules to reason about. We added a per-location switch: with it on, the catalog’s own schedules apply; with it off, guests see only menus, and each product’s availability comes from the menus it’s in.",
              tradeoff: "Venues using both systems had to move their catalog onto a menu, and support needed to be ready for that. The dashboard now shows the menu-derived schedules as read-only, with a note saying why.",
            },
            {
              title: "Keep ordering fast as menus multiplied",
              body: "The first version loaded every menu and its products on each page view. We moved menu switching into the browser, loading one full menu at a time, keeping a light list of the others, and remembering what’s already loaded. The back button still returns to the previous menu.",
            },
          ],
        },
        {
          type: "figure",
          figure: "menus-availability",
          caption: "Several rules gate a single menu. A guest who scans a table’s QR code lands in the first menu that passes all of them.",
        },
      ],
    },
    {
      id: "dashboard",
      heading: "Making room in the dashboard",
      blocks: [
        {
          type: "p",
          text: "Menus landed in a dashboard that had outgrown its structure. Every operator feature added its server code to one shared file that many engineers edited at once. In 2020 I did most of the work of splitting it by feature area, one area at a time, starting with the parts that changed least so open work wasn’t disrupted. We could keep shipping features during the move, and the structure was still the dashboard’s layout six years later.",
        },
      ],
    },
    {
      id: "result",
      heading: "What changed",
      blocks: [
        {
          type: "p",
          text: "Operators could run lunch, holiday, event or members-only menus from one catalog, each with its own schedule, places and audience, without copying products. Menus was a deciding factor for some prospective clients at launch, and its core is still part of GoTab’s product, with later additions from teammates such as menus shared across locations.",
        },
        {
          type: "p",
          text: "It wasn’t a clean finish. In the months after launch, about a third of the menu-related changes were fixes and adjustments. A later rework also broke the rule that hid segment-only menus, so they showed to everyone until a support report surfaced it and a teammate fixed it.",
        },
      ],
    },
    {
      id: "learned",
      heading: "What I learned",
      blocks: [
        {
          type: "p",
          text: "Name the old thing before introducing the new one. The dashboard’s catalog pages were already called “Menu Management,” so for months “menu” meant two things, and the new switch needed its own name. I’d rename the catalog first.",
        },
        {
          type: "p",
          text: "Write the access test before the refactor. One test on who can see a segment-only menu would have caught that regression before it shipped.",
        },
        {
          type: "p",
          text: "Keep branches small. The main Menus change stayed open for weeks. The menu work that followed went out as smaller changes that built on each other, and merged in days.",
        },
      ],
    },
  ],
};
