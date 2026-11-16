// Case study: GoTab's first kitchen display system.
// DRAFT. Sources, attribution and open questions: docs/case-studies/kitchen-display.md.

import type { Study } from "../work";

export const kitchenDisplay: Study = {
  slug: "kitchen-display",
  title: "From printed tickets to a working kitchen display",
  shortTitle: "Kitchen display",
  summary:
    "GoTab’s first kitchen display system, where every station shares the same up-to-date view of each order’s progress. I built the first release, and when it launched I was in the restaurant, making changes while the kitchen used it.",
  status: "draft",
  role: "Software developer",
  timeframe: "2018–2019",
  tags: ["Kitchen operations", "First release", "On-site launch"],
  exhibit: "kds",
  length: "full",
  hero: {
    figure: "kds-hero",
    alt: "A printed kitchen ticket beside a tablet showing the same order as a card on a kitchen display, with an elapsed-time bar and other open orders for the grill station.",
    caption:
      "A printed ticket is one station’s copy: a cook can mark it, but nobody else sees the mark. On the screen, claiming or finishing an order updates it for every station at once, along with how long it has waited.",
    label: "Illustrative reconstruction",
  },
  facts: [
    {
      label: "My role",
      value: "Software developer. I built the first release, was on site for its launch, and kept improving it through its first months.",
    },
    { label: "When", value: "Late 2018 to mid-2019" },
    { label: "Status", value: "Shipped in 2019. Parts of the first release are still in production." },
  ],
  sections: [
    {
      id: "launch",
      heading: "Launch night, in the kitchen",
      blocks: [
        {
          type: "p",
          text: "Building the first KDS was fun and exciting, and the best part was the launch. I was in the restaurant when the kitchen started using it, watching cooks work with something I’d built and making changes in real time as they used it. Seeing it in use for the first time was really cool.",
        },
        {
          type: "p",
          text: "Being there meant I didn’t have to wait for a report to learn what needed to change. I could see the kitchen using it and change it while they did.",
        },
      ],
    },
    {
      id: "problem",
      heading: "What paper couldn’t share",
      blocks: [
        {
          type: "p",
          text: "Before the KDS, an order reached a GoTab kitchen as printed tickets, one for each station’s printer. A cook can mark a ticket by hand, but that mark lives on one piece of paper at one station. The grill can’t see that the cold station has finished its half, and expo, the station that pulls each order together, can’t see either from its own ticket.",
        },
        {
          type: "p",
          text: "A screen could keep every station looking at the same order, updated automatically as each one claimed or finished its part, with each order’s waiting time in view. It also had to run on whatever tablets a kitchen already owned.",
        },
      ],
    },
    {
      id: "role",
      heading: "My role",
      blocks: [
        {
          type: "p",
          text: "I started building the KDS in December 2018, working from a designer’s mockups, and built the first release. It merged about two months later, and I kept building on it through mid-2019.",
        },
      ],
    },
    {
      id: "approach",
      heading: "A focused first release",
      blocks: [
        {
          type: "p",
          text: "We kept the first release to what a station needs during service. Each station sees only its own items, and expo sees them all. A cook taps to claim an order and taps twice to finish it, and every other screen shows the change. A finished order can be recalled or its ticket reprinted, and every order shows its elapsed time, colored against how long it should take.",
        },
        {
          type: "decisions",
          items: [
            {
              title: "Choose the simple way to keep every screen current",
              body: "New orders and other stations’ progress had to appear without anyone touching the screen. I first prototyped live updates pushed from the server, but the prototype still had a reliability problem I hadn’t solved. I replaced it with something simpler: each screen checked the server for changes on a short, regular interval. That’s the version we launched.",
              tradeoff: "A change could take several seconds to reach the other screens. As the product grew, it moved to live updates.",
            },
            {
              title: "Treat each screen as a device the restaurant sets up",
              body: "A manager adds a display in the dashboard, then enters a short code on the tablet to connect it. I built that setup flow and made the records describe a general display rather than something specific to the KDS.",
              tradeoff: "It meant reworking code before the feature shipped. It paid off later: the same setup now connects POS, kiosk and task screens too.",
            },
          ],
        },
      ],
    },
    {
      id: "shipped",
      heading: "What shipped",
      blocks: [
        {
          type: "figure",
          figure: "kds-screen",
          alt: "A kitchen display set to the grill station, showing four order cards. Each card has a table or order name, its items and an elapsed time with a colored bar. One card is marked claimed and one fulfilled. Numbered markers point to the station tabs, a timer, the claimed card, the fulfilled card, and the Closed tab.",
          caption: "A station view from the first release, drawn with sample orders.",
          label: "Illustrative reconstruction",
          legend: [
            "Station and expo views. Each station sees its own items; expo sees them all.",
            "Elapsed time, colored against the item’s prep time.",
            "Tap to claim, and every screen shows it’s being made.",
            "Tap twice to finish. The order moves to Closed everywhere.",
            "From Closed, recall an order or reprint its ticket.",
          ],
        },
        {
          type: "p",
          text: "Over the next few months I kept building on it: marking items unavailable from the screen, an option to print a ticket when an order is finished, a dark theme, setup from the manager dashboard, and claiming and finishing individual items at each station.",
        },
        {
          type: "figure",
          figure: "kds-flow",
          caption: "How an order moved through the first release.",
        },
      ],
    },
    {
      id: "result",
      heading: "What it made possible",
      blocks: [
        {
          type: "p",
          text: "Kitchens could run service from a shared, live picture: each station tracking its own orders and how long they’d waited, and expo seeing the whole order come together without walking the line. Parts of the first release, including recall and reprint, are still in GoTab’s product today, and the setup flow now connects POS, kiosk and task screens as well.",
        },
      ],
    },
    {
      id: "learned",
      heading: "What I learned",
      blocks: [
        {
          type: "p",
          text: "Launching next to the people using it is the fastest feedback there is. Being on site meant I could change things in real time, with the kitchen right there.",
        },
        {
          type: "p",
          text: "The tablet is part of the product, even when you don’t control it. Years later, a tablet with a wrong clock threw off a venue’s order timers, and I fixed it by timing orders against the server’s clock instead. If I built it again, I’d trust the server’s time from the first release.",
        },
      ],
    },
  ],
};
