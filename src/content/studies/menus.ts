// Case study: Menus and the operator dashboard, 2018–2021.
// DRAFT. Sources, attribution and open questions: docs/case-studies/menus.md.

import type { Study } from "../work";

export const menus: Study = {
  slug: "menus",
  title: "Making complex menus easier to manage",
  shortTitle: "Menus",
  summary:
    "A holiday preorder menu shouldn’t mean copying a restaurant’s whole catalog. I led development of Menus: distinct, scheduled menus built on top of one shared catalog, so each menu can have its own dates, places and guests while products stay in one place.",
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
      value: "Software developer. I built much of the operator dashboard from 2018, and led development of Menus with our product lead and teammates.",
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
          text: "Each venue had one catalog in GoTab’s dashboard. Operators could put schedules on categories and products, and show different things in different areas of a venue. That handles “closed after lunch.”",
        },
        {
          type: "p",
          text: "It doesn’t handle a holiday preorder: a menu guests can order from in October for pickup in late November, with its own items, its own dates and its own place on the ordering page, while regular service carries on beside it. With one catalog, the only way to offer that was to bend the everyday schedules around it or duplicate products, and then keep the copies’ prices and details in sync by hand. Menus that only one group of guests (a segment) should see had the same problem.",
        },
      ],
    },
    {
      id: "role",
      heading: "My role",
      blocks: [
        {
          type: "p",
          text: "I led development of Menus. I built the operator’s Menus page, the guest side, the schedule rules and the options around them: tag filters, guest segments, QR codes, and switching between menus. Earlier, I’d built many of the dashboard screens Menus sits among.",
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
              body: "Instead of copying products into each menu, a menu links to categories in the catalog and to the areas it serves. Each link carries its own label, description and order, so the holiday menu can present a category its own way without changing the everyday one.",
              alternative: "Copying categories and products into each menu.",
              tradeoff: "Products stay in one place. A price change applies to every menu that includes the product, and nothing drifts out of sync between copies.",
            },
            {
              title: "Give each location one source of truth for availability",
              body: "After launch, a product could have its own schedule, its category’s schedule and the schedules of every menu it appeared in. That was too many rules to reason about. We added a per-location switch: with it on, the catalog’s own schedules apply; with it off, guests see only menus, and each product’s availability comes from the menus it’s in.",
              tradeoff: "Venues using both systems had to move their catalog onto a menu, and support needed to be ready for that. The dashboard now shows the menu-derived schedules as read-only, with a note saying why.",
            },
            {
              title: "Keep ordering fast as menus multiplied",
              body: "The first version loaded every menu and its products on each page view. We changed it to load one full menu at a time, keep a light list of the others, and remember what’s already loaded, so a guest can switch menus quickly and the back button still returns to the previous one.",
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
      id: "result",
      heading: "What changed",
      blocks: [
        {
          type: "p",
          text: "Operators could run a holiday preorder next to everyday lunch, or an event or members-only menu, all from one catalog, each with its own schedule, places and audience, and without copying a single product. The core of Menus is still part of GoTab’s product.",
        },
        {
          type: "p",
          text: "It wasn’t a clean finish. In the months after launch, about a third of the menu-related changes were fixes and adjustments.",
        },
      ],
    },
    {
      id: "learned",
      heading: "What I learned",
      blocks: [
        {
          type: "p",
          text: "Name the old thing before introducing the new one. The dashboard’s catalog pages were already called “Menu Management,” so for months “menu” meant two different things: the catalog, and the new scheduled menus built on it. People talking about “the menu” often meant different things without noticing, and the new switch needed its own name. I’d rename the catalog first.",
        },
        {
          type: "p",
          text: "Keep branches small. The main Menus change stayed open for weeks. The menu work that followed went out as smaller changes that built on each other, and merged in days.",
        },
      ],
    },
  ],
};
